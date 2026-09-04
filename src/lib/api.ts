/** Tiny fetch wrapper for our API. Cookies are sent automatically. */
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { credentials: 'same-origin', ...options, headers });
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error || `Request failed (${res.status}). Please try again.`;
    throw new Error(message);
  }
  return data as T;
}
