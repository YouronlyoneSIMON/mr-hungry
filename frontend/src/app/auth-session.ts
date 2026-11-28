export interface AuthUser {
  id: number;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
}

export type SessionUser = AuthUser;

const SESSION_KEY = 'mr_hungry_user';
const TOKEN_KEY = 'mr_hungry_token';

export function setSession(user: AuthUser, token: string | null): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (_) {}
}

// Kept so older files still work
export function setLoggedInUser(user: AuthUser): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (_) {}
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (_) {
    return null;
  }
}

export function getLoggedInUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AuthUser) : null;
  } catch (_) {
    return null;
  }
}

export function clearLoggedInUser(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}

export function isLoggedInAdmin(): boolean {
  const user = getLoggedInUser();
  return Boolean(user?.id) && String(user?.role || '').trim().toLowerCase() === 'admin';
} 