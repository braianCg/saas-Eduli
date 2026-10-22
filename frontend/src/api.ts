import type { User } from './types';

const KEY = 'kiosko_session';
interface Session { token: string; user: User }

export const session = {
  get(): Session | null {
    try {
      const s = localStorage.getItem(KEY);
      return s ? (JSON.parse(s) as Session) : null;
    } catch {
      return null;
    }
  },
  set(s: Session) { localStorage.setItem(KEY, JSON.stringify(s)); },
  clear() { localStorage.removeItem(KEY); },
};

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const s = session.get();
  if (s) headers.Authorization = `Bearer ${s.token}`;

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`/api${path}`, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body });
  const data: unknown = await res.json().catch(() => ({}));

  if (res.status === 401 && s) {
    session.clear();
    location.href = '/login';
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Error del servidor');
  return data as T;
}

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
export const money = (n: number) => fmt.format(n);
