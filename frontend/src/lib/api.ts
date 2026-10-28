
const API_URL = "";

export interface SchemaResponse {
  tables: string[];
}

export interface DatabaseHealthResponse {
  status: string;
  database: string;
}

export interface QueryResponse {
  question: string;
  sql: string;
  explanation: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  durationMs: number;
}

export interface AnalyticsOverview {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
  };
  monthlyRevenue: Array<{
    monthKey: string;
    month: string;
    revenue: number;
  }>;
  topCustomers: Array<{
    id: number;
    name: string;
    revenue: number;
    orders: number;
  }>;
  source: "postgresql";
}

export interface QueryHistoryItem {
  sql: string;
  id: string;
  question: string;
  generatedSql: string | null;
  status: "pending" | "success" | "failed";
  rowCount: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface QueryHistoryResponse {
  history: QueryHistoryItem[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface LogoutResponse {
  success: boolean;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `API request failed (${response.status}).`;

    throw new Error(message);
  }

  return data as T;
}

// Authentication

export function getCurrentUser() {
  return apiRequest<AuthMeResponse>("/api/auth/me");
}

export function logout() {
  return apiRequest<LogoutResponse>("/api/auth/logout", {
    method: "POST",
  });
}

export function startGoogleLogin() {
  window.location.assign("/api/auth/google");
}

// Database and schema

export function getDatabaseHealth() {
  return apiRequest<DatabaseHealthResponse>("/api/db-health");
}

export function getSchema() {
  return apiRequest<SchemaResponse>("/api/schema");
}

// Analytics

export function getAnalyticsOverview() {
  return apiRequest<AnalyticsOverview>("/api/analytics/overview");
}

// Query history

export function getQueryHistory() {
  return apiRequest<QueryHistoryResponse>("/api/query-history");
}

// Natural-language SQL query execution

export function executeNaturalLanguageQuery(question: string) {
  return apiRequest<QueryResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
