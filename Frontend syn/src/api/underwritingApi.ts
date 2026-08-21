/**
 * underwritingApi.ts
 * Real HTTP client for the credit-underwriting backend.
 * Base URL defaults to http://localhost:8000; override at build time with
 * VITE_API_BASE_URL (e.g. when the backend is served from a different host).
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── Error types ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export class AuthError extends ApiError {}
export class ForbiddenError extends ApiError {}
export class RateLimitError extends ApiError {}

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Network error — could not reach the server. Is the backend running?');
  }

  if (res.status === 401) throw new AuthError(401, 'Session expired. Please log in again.');
  if (res.status === 403) throw new ForbiddenError(403, 'Insufficient role — access denied.');
  if (res.status === 429) throw new RateLimitError(429, 'Rate limited. Please try again later.');

  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) msg = String(body.detail);
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: 'analyst' | 'admin';
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function health(): Promise<{ status: string }> {
  return request<{ status: string }>('/health');
}

// ─── Decision ─────────────────────────────────────────────────────────────────

export interface DecisionRequest {
  applicant_id: string;
  age: number;
  dependents: number;
  annual_income: number;
  requested_amount: number;
  credit_utilization: number;
  num_open_credit_lines: number;
  delinquencies_30_59: number;
  delinquencies_60_89: number;
  delinquencies_90_plus: number;
  num_real_estate_loans: number;
  monthly_debt_payments: number;
  avg_monthly_income: number;
  avg_monthly_expenses: number;
  overdraft_count_90d: number;
  device_id: string | null;
  ip_address: string | null;
  name?: string;
  city?: string;
  occupation?: string;
  employment_length_years?: number;
  credit_history_months?: number;
}

export interface DecisionResponse {
  application_id: string;
  applicant_id: string;
  decision: 'approve' | 'decline' | 'refer';
  credit_risk_score: number;
  fraud_risk_score: number;
  reason_codes: string[];
  shap_top_features: Record<string, number>;
  model_version: string;
  feature_schema_version: string;
  policy_version: string;
  request_id: string;
  latency_ms: number;
  timestamp: string;
  fraud_signals?: {
    apps_per_device_24h?: number;
    apps_per_ip_24h?: number;
    device_identity_consistency?: number;
  };
  profile?: DecisionSnapshot['profile'];
}

export async function postDecision(
  payload: DecisionRequest,
  token: string,
): Promise<DecisionResponse> {
  return request<DecisionResponse>('/v1/decision', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  request_id: string;
  applicant_id: string;
  decision: 'approve' | 'decline' | 'refer';
  credit_risk_score: number;
  fraud_risk_score: number;
  reason_codes: string[];
  timestamp: string;
}

export async function getAuditLogs(token: string, limit = 50): Promise<AuditLogEntry[]> {
  const res = await request<{ logs: AuditLogEntry[] }>(`/v1/audit/logs?limit=${limit}`, {}, token);
  return res.logs;
}

// ─── Application snapshots & analyst ─────────────────────────────────────────

export interface DecisionSnapshot {
  application_id: string;
  request_id: string;
  applicant_id: string;
  decision: 'approve' | 'refer' | 'decline';
  credit_risk_score: number;
  fraud_risk_score: number;
  reason_codes: string[];
  model_version: string;
  feature_schema_version: string;
  policy_version: string;
  timestamp: string | null;
  inputs: Record<string, unknown>;
  fraud_signals: {
    apps_per_device_24h?: number;
    apps_per_ip_24h?: number;
    device_identity_consistency?: number;
  };
  shap_top_features: Record<string, number>;
  profile?: {
    segment: 'THIN-FILE' | 'ESTABLISHED';
    risk_band: 'Low' | 'Moderate' | 'High' | 'Severe';
    fraud_level: 'Low' | 'Elevated' | 'High';
    dti: number;
    income_stability: 'Strong' | 'Moderate' | 'Weak';
    expense_profile: 'Conservative' | 'Moderate' | 'Elevated';
    behavioral_signals: 'Normal' | 'High Velocity';
    bank_cashflow_surplus: number;
  };
}

export interface AnalystAskResponse {
  status: 'answered' | 'refused';
  decision_outcome: string | null;
  explanation: string;
  policy_basis: { chunk_id: string; claim: string }[];
  limitations: string[];
}

export async function askAnalyst(
  question: string,
  applicationId: string,
  token: string,
): Promise<AnalystAskResponse> {
  return request<AnalystAskResponse>('/v1/analyst/ask', {
    method: 'POST',
    body: JSON.stringify({ question, application_id: applicationId }),
  }, token);
}

export async function getApplications(token: string, limit = 100): Promise<DecisionSnapshot[]> {
  const res = await request<{ applications: DecisionSnapshot[] }>(
    `/v1/applications?limit=${limit}`,
    {},
    token,
  );
  return res.applications;
}

export async function getApplication(applicationId: string, token: string): Promise<DecisionSnapshot> {
  return request<DecisionSnapshot>(`/v1/applications/${applicationId}`, {}, token);
}

export async function getModelMetrics(
  token: string,
): Promise<{ credit: Record<string, unknown>; fraud: Record<string, unknown> }> {
  return request<{ credit: Record<string, unknown>; fraud: Record<string, unknown> }>(
    '/v1/metrics/model-eval',
    {},
    token,
  );
}
