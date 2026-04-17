import type {
  AccountCreate,
  AccountOut,
  AccountUpdate,
  DashboardOut,
  DistributionItem,
  IncomeSourceCreate,
  IncomeSourceOut,
  LoginIn,
  NLPParseOut,
  RegisterIn,
  SubscriptionCreate,
  SubscriptionOut,
  SubscriptionUpdate,
  TokenPair,
  TransactionCreate,
  TransactionOut,
  TrendItem,
  UserOut,
  UserUpdate,
} from './types';

const BASE = '/api/v1';

// ── Error class ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Token refresh coordination ────────────────────────────────────────────────
// AuthContext registers this callback so api.ts can trigger a mid-session refresh
// without importing React or hooks.
type RefreshFn = () => Promise<string | null>;
let _onRefresh: RefreshFn | null = null;
let _refreshInFlight: Promise<string | null> | null = null;

export function registerRefreshCallback(fn: RefreshFn): void {
  _onRefresh = fn;
}

async function refreshOnce(): Promise<string | null> {
  if (!_onRefresh) return null;
  // Serialize concurrent 401s so we only hit /auth/refresh once
  if (!_refreshInFlight) {
    _refreshInFlight = _onRefresh().finally(() => { _refreshInFlight = null; });
  }
  return _refreshInFlight;
}

// ── Core request ──────────────────────────────────────────────────────────────
async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const attempt = (t?: string) =>
    fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

  let res = await attempt(token);

  // On 401 with a token, try refreshing once and retry
  if (res.status === 401 && token) {
    const newToken = await refreshOnce();
    if (newToken) res = await attempt(newToken);
  }

  if (res.status === 204) return undefined as unknown as T;
  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw new ApiError(res.status, data?.detail ?? 'Error desconocido');
  return data as T;
}

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ── API surface ───────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (data: RegisterIn) =>
      req<TokenPair>('POST', '/auth/register', data),
    login: (data: LoginIn) =>
      req<TokenPair>('POST', '/auth/login', data),
    refresh: (refreshToken: string) =>
      req<TokenPair>('POST', '/auth/refresh', { refresh_token: refreshToken }),
    logout: (refreshToken: string) =>
      req<void>('POST', '/auth/logout', { refresh_token: refreshToken }),
    me: (token: string) =>
      req<UserOut>('GET', '/auth/me', undefined, token),
    updateProfile: (token: string, data: UserUpdate) =>
      req<UserOut>('PATCH', '/auth/me', data, token),
  },

  accounts: {
    list: (token: string) =>
      req<AccountOut[]>('GET', '/accounts', undefined, token),
    create: (token: string, data: AccountCreate) =>
      req<AccountOut>('POST', '/accounts', data, token),
    update: (token: string, id: string, data: AccountUpdate) =>
      req<AccountOut>('PATCH', `/accounts/${id}`, data, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/accounts/${id}`, undefined, token),
  },

  transactions: {
    list: (
      token: string,
      filters?: { account_id?: string; direction?: string; from_date?: string; to_date?: string; skip?: number; limit?: number },
    ) => req<TransactionOut[]>('GET', `/transactions${qs(filters)}`, undefined, token),
    create: (token: string, data: TransactionCreate) =>
      req<TransactionOut>('POST', '/transactions', data, token),
    parse: (token: string, text: string, execute = false) =>
      req<NLPParseOut>('POST', `/transactions/parse${qs({ execute })}`, { text }, token),
    update: (token: string, id: string, data: Partial<TransactionCreate>) =>
      req<TransactionOut>('PATCH', `/transactions/${id}`, data, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/transactions/${id}`, undefined, token),
  },

  dashboard: {
    get: (token: string) =>
      req<DashboardOut>('GET', '/dashboard', undefined, token),
  },

  income: {
    list: (token: string) =>
      req<IncomeSourceOut[]>('GET', '/income-sources', undefined, token),
    create: (token: string, data: IncomeSourceCreate) =>
      req<IncomeSourceOut>('POST', '/income-sources', data, token),
    update: (token: string, id: string, data: Partial<IncomeSourceCreate>) =>
      req<IncomeSourceOut>('PATCH', `/income-sources/${id}`, data, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/income-sources/${id}`, undefined, token),
  },

  subscriptions: {
    list: (token: string) =>
      req<SubscriptionOut[]>('GET', '/subscriptions', undefined, token),
    create: (token: string, data: SubscriptionCreate) =>
      req<SubscriptionOut>('POST', '/subscriptions', data, token),
    update: (token: string, id: string, data: SubscriptionUpdate) =>
      req<SubscriptionOut>('PATCH', `/subscriptions/${id}`, data, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/subscriptions/${id}`, undefined, token),
  },

  reports: {
    distribution: (
      token: string,
      params?: { year?: number; month?: number; direction?: string },
    ) => req<DistributionItem[]>('GET', `/reports/distribution${qs(params)}`, undefined, token),
    trends: (token: string, months = 6) =>
      req<TrendItem[]>('GET', `/reports/trends${qs({ months })}`, undefined, token),
  },
} as const;
