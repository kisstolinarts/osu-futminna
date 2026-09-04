import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  // Secret used to sign cookies. Dev fallback is clearly marked; production
  // MUST provide its own via .env (see .env.example).
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  publicUrl: process.env.PUBLIC_URL || '',
};
