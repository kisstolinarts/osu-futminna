#!/usr/bin/env bash
# Condensed end-to-end safety regression (used when the full suite isn't available).
set -u
BASE="${1:-http://localhost:4138}"
PASS=0; FAIL=0
ck(){ if [ "$2" = "$3" ]; then echo "  [PASS] $1"; PASS=$((PASS+1)); else echo "  [FAIL] $1 (got $2, want $3)"; FAIL=$((FAIL+1)); fi; }
J1=/tmp/qr_admin.txt; J2=/tmp/qr_el.txt; JS=/tmp/qr_stu.txt

# 1 admin login
R=$(curl -s -c $J1 -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@osu.local","password":"DevAdmin12345"}'); ck "super admin login" "$R" 200

# 2 create electoral admin (temp) + login
curl -s -b $J1 -o /dev/null -X POST "$BASE/api/admin/admins" -H 'Content-Type: application/json' -d '{"name":"QR Electoral","email":"qrel@osu.local","password":"TempPass1234!","role":"ELECTORAL_ADMIN"}'
R=$(curl -s -c $J2 -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/auth/login" -H 'Content-Type: application/json' -d '{"email":"qrel@osu.local","password":"TempPass1234!"}'); ck "electoral login" "$R" 200

# 3 electoral CANNOT manage admins (403) but CAN create election
R=$(curl -s -b $J2 -o /dev/null -w '%{http_code}' "$BASE/api/admin/admins"); ck "electoral cannot list admins (RBAC)" "$R" 403

# 4 build an OPEN election (times relative to now)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OPEN=$(date -u -d '-5 min' +%Y-%m-%dT%H:%M:%SZ)
CLOSE=$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ)
ELJSON=$(curl -s -b $J2 -X POST "$BASE/api/admin/elections" -H 'Content-Type: application/json' -d "{\"name\":\"QR Election\",\"opens_at\":\"$OPEN\",\"closes_at\":\"$CLOSE\",\"results_mode\":\"manual\"}")
EID=$(echo "$ELJSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['election']['id'])")
SLUG=$(echo "$ELJSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['election']['slug'])")
echo "  election id=$EID slug=$SLUG (opened $OPEN / closes $CLOSE)"
PID=$(curl -s -b $J2 -X POST "$BASE/api/admin/elections/$EID/positions" -H 'Content-Type: application/json' -d '{"name":"President"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['position']['id'])")
C1=$(curl -s -b $J2 -X POST "$BASE/api/admin/elections/$EID/contestants" -H 'Content-Type: application/json' -d "{\"position_id\":$PID,\"full_name\":\"Candidate One\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['contestant']['id'])")
C2=$(curl -s -b $J2 -X POST "$BASE/api/admin/elections/$EID/contestants" -H 'Content-Type: application/json' -d "{\"position_id\":$PID,\"full_name\":\"Candidate Two\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['contestant']['id'])")
R=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/elections/$SLUG"); ck "public election page reachable" "$R" 200

# 5 import an ACTIVE student (approve number first, then import)
curl -s -b $J1 -o /dev/null -X POST "$BASE/api/admin/whatsapp" -H 'Content-Type: application/json' -d '{"phone":"08100001111"}'
CSV="Full name,Matric Number,Email,Phone number,Level
QR Student,2021/1/99999QR,qr@x.com,08100001111,300"
curl -s -b $J1 -X POST "$BASE/api/import/csv" -H 'Content-Type: application/json' -d "$(python3 -c "import json,sys;print(json.dumps({'csv':sys.stdin.read()}))" <<< "$CSV")" -o /dev/null

# 6 student login with phone pw (temp), vote blocked until set pw
R=$(curl -s -c $JS -o /dev/null -w '%{http_code}' -X POST "$BASE/api/student/auth/login" -H 'Content-Type: application/json' -d '{"matric":"2021/1/99999QR","password":"08100001111"}'); ck "student phone-pw login" "$R" 200
R=$(curl -s -b $JS -o /dev/null -w '%{http_code}' "$BASE/api/voting/status"); ck "status reachable while temp pw" "$R" 403
curl -s -b $JS -o /dev/null -X POST "$BASE/api/student/auth/change-password" -H 'Content-Type: application/json' -d '{"new_password":"QrPassw0rd!23"}'
R=$(curl -s -o /dev/null -w '%{http_code}' -c $JS -X POST "$BASE/api/student/auth/login" -H 'Content-Type: application/json' -d '{"matric":"2021/1/99999QR","password":"QrPassw0rd!23"}'); ck "student relogin own password" "$R" 200

# 7 vote
R=$(curl -s -o /dev/null -w '%{http_code}' -b $JS -X POST "$BASE/api/voting/submit" -H 'Content-Type: application/json' -d "{\"election_id\":$EID,\"choices\":{\"$PID\":$C1}}"); ck "submit ballot" "$R" 201
R=$(curl -s -o /dev/null -w '%{http_code}' -b $JS -X POST "$BASE/api/voting/submit" -H 'Content-Type: application/json' -d "{\"election_id\":$EID,\"choices\":{\"$PID\":$C1}}"); ck "duplicate vote rejected" "$R" 409
R=$(curl -s -b $JS "$BASE/api/voting/status" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('has_voted') and 'yes' or 'no')"); ck "has_voted true" "$R" yes

# 8 results sealing + manual publish
R=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/elections/$SLUG/results"); ck "public results sealed before publish" "$R" 403
curl -s -b $J2 -o /dev/null -X PATCH "$BASE/api/admin/elections/$EID/status" -H 'Content-Type: application/json' -d '{"status":"CLOSED"}'
R=$(curl -s -b $J2 -o /dev/null -w '%{http_code}' -X PATCH "$BASE/api/admin/elections/$EID/status" -H 'Content-Type: application/json' -d '{"status":"RESULTS_PUBLISHED"}'); ck "electoral publishes results" "$R" 200
R=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/elections/$SLUG/results"); ck "public results now available" "$R" 200
R=$(curl -s -b $J2 -o /dev/null -w '%{http_code}' -X PATCH "$BASE/api/admin/elections/$EID/status" -H 'Content-Type: application/json' -d '{"status":"OPEN"}'); ck "illegal transition blocked" "$R" 400

echo ""
echo "== SUMMARY =="; echo "  PASS=$PASS FAIL=$FAIL"

# cleanup temp users/election
curl -s -b $J1 -o /dev/null -X DELETE "$BASE/api/admin/admins/$(curl -s -b $J1 "$BASE/api/admin/admins" | python3 -c "import json,sys;print([a['id'] for a in json.load(sys.stdin)['admins'] if a['email']=='qrel@osu.local'][0])")"
curl -s -b $J1 -X POST "$BASE/api/admin/whatsapp/$(curl -s -b $J1 "$BASE/api/admin/whatsapp?q=08100001111" | python3 -c "import json,sys;print(json.load(sys.stdin)['numbers'][0]['id'])")" -o /dev/null -X DELETE
