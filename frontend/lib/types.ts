// ── Enums ────────────────────────────────────────────────────────────────────
export type AccountType = 'cash' | 'bank' | 'digital' | 'investment' | 'credit';
export type CurrencyCode = 'USD' | 'EUR' | 'GTQ' | 'MXN' | 'BTC' | 'USDT';
export type TransactionDirection = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';
export type InputMethod = 'manual' | 'voice' | 'text_nlp' | 'import';
export type IncomeFrequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'annual';

// ── Categories ───────────────────────────────────────────────────────────────
export type CategoryType = 'expense' | 'income' | 'both';

export interface CategoryOut {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_system: boolean;
  category_type: CategoryType;
  monthly_budget: string | null;
}

export interface CategoryCreate {
  name: string;
  color?: string;
  icon?: string;
  category_type?: CategoryType;
  monthly_budget?: string;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
  icon?: string;
  category_type?: CategoryType;
  monthly_budget?: string | null;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface UserOut {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterIn {
  name: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface LoginIn {
  email: string;
  password: string;
}

// ── Accounts ─────────────────────────────────────────────────────────────────
export interface AccountOut {
  id: string;
  name: string;
  account_type: AccountType;
  currency: CurrencyCode;
  balance: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  name: string;
  account_type: AccountType;
  currency?: CurrencyCode;
  initial_balance?: string;
}

export interface AccountUpdate {
  name?: string;
  balance?: string;
  is_active?: boolean;
}

// ── Transactions ──────────────────────────────────────────────────────────────
export interface TransactionOut {
  id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  income_source_id: string | null;
  subscription_id: string | null;
  direction: TransactionDirection;
  amount: string;
  currency: CurrencyCode;
  description: string | null;
  status: TransactionStatus;
  input_method: InputMethod;
  installments: number | null;
  transaction_date: string;
  created_at: string;
}

export interface TransactionCreate {
  account_id: string;
  direction: TransactionDirection;
  amount: string;
  currency?: CurrencyCode;
  description?: string;
  category_id?: string;
  to_account_id?: string;
  installments?: number;
  transaction_date?: string;
  input_method?: InputMethod;
  raw_input?: string;
}

export interface NLPParseOut {
  understood: boolean;
  direction: TransactionDirection | null;
  amount: string | null;
  currency: CurrencyCode;
  description: string | null;
  category_hint: string | null;
  account_type_hint: string | null;
  to_account_type_hint: string | null;
  transaction_date: string | null;
  confidence: number;
  raw_text: string;
  transaction: TransactionOut | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface AccountSummary {
  id: string;
  name: string;
  account_type: AccountType;
  currency: CurrencyCode;
  balance: string;
}

export interface MonthSummary {
  income: string;
  expense: string;
  net: string;
}

export interface CategorySummary {
  category_id: string | null;
  category_name: string;
  total: string;
  count: number;
}

export interface DashboardOut {
  total_balance: string;
  accounts: AccountSummary[];
  current_month: MonthSummary;
  top_categories: CategorySummary[];
  recent_transactions: TransactionOut[];
}

// ── Income Sources ────────────────────────────────────────────────────────────
export interface IncomeSourceOut {
  id: string;
  name: string;
  amount: string;
  currency: CurrencyCode;
  frequency: IncomeFrequency;
  next_expected: string | null;
  account_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeSourceCreate {
  name: string;
  amount: string;
  currency?: CurrencyCode;
  frequency?: IncomeFrequency;
  next_expected?: string;
  account_id?: string;
  notes?: string;
}

// ── User Update ───────────────────────────────────────────────────────────────
export interface UserUpdate {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
  new_password_confirm?: string;
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
export interface SubscriptionOut {
  id: string;
  name: string;
  amount: string;
  currency: CurrencyCode;
  frequency: IncomeFrequency;
  next_due: string | null;
  end_date: string | null;
  category_id: string | null;
  account_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCreate {
  name: string;
  amount: string;
  currency?: CurrencyCode;
  frequency?: IncomeFrequency;
  next_due?: string;
  end_date?: string;
  category_id?: string;
  account_id?: string;
  notes?: string;
}

export interface SubscriptionUpdate {
  name?: string;
  amount?: string;
  frequency?: IncomeFrequency;
  next_due?: string;
  end_date?: string;
  is_active?: boolean;
  notes?: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export type NotificationType = 'welcome' | 'budget_alert' | 'subscription_due' | 'info';

export interface NotificationOut {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface AdminUserOut {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  failed_logins: number;
  locked_until: string | null;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_transactions: number;
  total_accounts: number;
  total_subscriptions: number;
  total_budgets: number;
  new_users_this_month: number;
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export interface BudgetOut {
  id: string;
  name: string;
  amount: string;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetCreate {
  name: string;
  amount: string;
  category_id?: string;
}

export interface BudgetUpdate {
  name?: string;
  amount?: string;
  category_id?: string;
  is_active?: boolean;
}

export interface BudgetUsage {
  budget_id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  limit: string;
  spent: string;
  percentage: number;
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface DistributionItem {
  category_id: string | null;
  category_name: string;
  amount: string;
  percentage: number;
  color: string;
  count: number;
}

export interface TrendItem {
  period: string;
  income: string;
  expense: string;
  net: string;
}
