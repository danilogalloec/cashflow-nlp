import type {
  AccountCreate,
  AccountOut,
  AccountUpdate,
  AdminStats,
  AdminUserOut,
  BudgetCreate,
  BudgetOut,
  BudgetUpdate,
  BudgetUsage,
  CategoryCreate,
  CategoryOut,
  CategoryUpdate,
  DashboardOut,
  DistributionItem,
  IncomeSourceCreate,
  IncomeSourceOut,
  LoginIn,
  NLPParseOut,
  NotificationOut,
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
    forgotPassword: (email: string) =>
      req<{ message: string }>('POST', '/auth/forgot-password', { email }),
    resetPassword: (token: string, new_password: string, new_password_confirm: string) =>
      req<{ message: string }>('POST', '/auth/reset-password', { token, new_password, new_password_confirm }),
    me: (token: string) =>
      req<UserOut>('GET', '/auth/me', undefined, token),
    updateProfile: (token: string, data: UserUpdate) =>
      req<UserOut>('PATCH', '/auth/me', data, token),
  },

  categories: {
    list: (token: string) =>
      req<CategoryOut[]>('GET', '/categories', undefined, token),
    create: (token: string, data: CategoryCreate) =>
      req<CategoryOut>('POST', '/categories', data, token),
    update: (token: string, id: string, data: CategoryUpdate) =>
      req<CategoryOut>('PATCH', `/categories/${id}`, data, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/categories/${id}`, undefined, token),
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
      filters?: { account_id?: string; direction?: string; from_date?: string; to_date?: string; search?: string; category_id?: string; skip?: number; limit?: number },
    ) => req<TransactionOut[]>('GET', `/transactions${qs(filters)}`, undefined, token),
    exportCsv: (
      filters?: { account_id?: string; direction?: string; from_date?: string; to_date?: string; search?: string; category_id?: string },
    ) => `/api/v1/transactions/export${qs(filters)}`,
    create: (token: string, data: TransactionCreate) =>
      req<TransactionOut>('POST', '/transactions', data, token),
    parse: (token: string, text: string, execute = false, transaction_date?: string) =>
      req<NLPParseOut>('POST', `/transactions/parse${qs({ execute })}`, { text, transaction_date }, token),
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
    upcoming: (token: string, days = 7) =>
      req<SubscriptionOut[]>('GET', `/subscriptions/upcoming${qs({ days })}`, undefined, token),
    pay: (token: string, id: string) =>
      req<TransactionOut>('POST', `/subscriptions/${id}/pay`, undefined, token),
    create: (token: string, data: SubscriptionCreate) =>
      req<SubscriptionOut>('POST', '/subscriptions', data, token),
    update: (token: string, id: string, data: SubscriptionUpdate) =>
      req<SubscriptionOut>('PATCH', `/subscriptions/${id}`, data, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/subscriptions/${id}`, undefined, token),
  },

  budgets: {
    list: (token: string) =>
      req<BudgetOut[]>('GET', '/budgets', undefined, token),
    usage: (token: string, year?: number, month?: number) =>
      req<BudgetUsage[]>('GET', `/budgets/usage${qs({ year, month })}`, undefined, token),
    create: (token: string, data: BudgetCreate) =>
      req<BudgetOut>('POST', '/budgets', data, token),
    update: (token: string, id: string, data: BudgetUpdate) =>
      req<BudgetOut>('PATCH', `/budgets/${id}`, data, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/budgets/${id}`, undefined, token),
  },

  notifications: {
    list: (token: string) =>
      req<NotificationOut[]>('GET', '/notifications', undefined, token),
    unreadCount: (token: string) =>
      req<{ count: number }>('GET', '/notifications/unread-count', undefined, token),
    checkAlerts: (token: string) =>
      req<{ created: number }>('POST', '/notifications/check-alerts', undefined, token),
    markRead: (token: string, id: string) =>
      req<void>('PATCH', `/notifications/${id}/read`, undefined, token),
    markAllRead: (token: string) =>
      req<void>('PATCH', '/notifications/read-all', undefined, token),
    remove: (token: string, id: string) =>
      req<void>('DELETE', `/notifications/${id}`, undefined, token),
  },

  admin: {
    stats: (token: string) =>
      req<AdminStats>('GET', '/admin/stats', undefined, token),
    users: (token: string) =>
      req<AdminUserOut[]>('GET', '/admin/users', undefined, token),
    updateUser: (token: string, id: string, data: { is_active?: boolean; is_admin?: boolean }) =>
      req<AdminUserOut>('PATCH', `/admin/users/${id}`, data, token),
    deleteUser: (token: string, id: string) =>
      req<void>('DELETE', `/admin/users/${id}`, undefined, token),
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
