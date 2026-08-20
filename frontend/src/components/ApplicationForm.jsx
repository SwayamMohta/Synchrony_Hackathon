import { useState } from 'react'
import { submitApplication } from '../api/client.js'
import DecisionCard from './DecisionCard.jsx'

const SCENARIOS = [
  {
    key: 'low', label: 'Low-risk thin-file',
    applicant_id: 'demo-low', age: 28, dependents: 0, annual_income: 45000, requested_amount: 3000,
    credit_utilization: 0, num_open_credit_lines: 1, delinquencies_30_59: 0, delinquencies_60_89: 0,
    delinquencies_90_plus: 0, num_real_estate_loans: 0, monthly_debt_payments: 200,
    avg_monthly_income: 3750, avg_monthly_expenses: 1800, overdraft_count_90d: 0,
    device_id: 'normal-device-1', ip_address: '192.168.1.10',
  },
  {
    key: 'high_debt', label: 'High-debt',
    applicant_id: 'demo-high-debt', age: 40, dependents: 2, annual_income: 60000, requested_amount: 5000,
    credit_utilization: 0.85, num_open_credit_lines: 8, delinquencies_30_59: 2, delinquencies_60_89: 0,
    delinquencies_90_plus: 0, num_real_estate_loans: 1, monthly_debt_payments: 2500,
    avg_monthly_income: 5000, avg_monthly_expenses: 4200, overdraft_count_90d: 2,
    device_id: 'normal-device-2', ip_address: '192.168.1.20',
  },
  {
    key: 'suspicious', label: 'Suspicious / fraudulent',
    applicant_id: 'demo-suspicious', age: 30, dependents: 0, annual_income: 55000, requested_amount: 2000,
    credit_utilization: 0.3, num_open_credit_lines: 4, delinquencies_30_59: 0, delinquencies_60_89: 0,
    delinquencies_90_plus: 0, num_real_estate_loans: 0, monthly_debt_payments: 400,
    avg_monthly_income: 4583, avg_monthly_expenses: 2000, overdraft_count_90d: 0,
    device_id: 'suspicious-device', ip_address: '10.0.0.99',
  },
]

const EMPTY = {
  applicant_id: '', age: 30, dependents: 0, annual_income: 60000, requested_amount: 1000,
  credit_utilization: 0.3, num_open_credit_lines: 5, delinquencies_30_59: 0, delinquencies_60_89: 0,
  delinquencies_90_plus: 0, num_real_estate_loans: 0, monthly_debt_payments: 500,
  avg_monthly_income: 5000, avg_monthly_expenses: 2000, overdraft_count_90d: 0,
  device_id: '', ip_address: '',
}

const NUMERIC_FIELDS = [
  'age', 'dependents', 'annual_income', 'requested_amount', 'credit_utilization',
  'num_open_credit_lines', 'delinquencies_30_59', 'delinquencies_60_89', 'delinquencies_90_plus',
  'num_real_estate_loans', 'monthly_debt_payments', 'avg_monthly_income', 'avg_monthly_expenses', 'overdraft_count_90d',
]

export default function ApplicationForm({ token }) {
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const loadScenario = (s) => {
    const { key, label, ...data } = s
    setForm({ ...data })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = { ...form }
      for (const k of NUMERIC_FIELDS) payload[k] = Number(payload[k])
      if (!payload.device_id) payload.device_id = null
      if (!payload.ip_address) payload.ip_address = null
      const res = await submitApplication(payload, token)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Demo scenarios</h2>
        {SCENARIOS.map((s) => (
          <button key={s.key} type="button" onClick={() => loadScenario(s)}>{s.label}</button>
        ))}
      </div>

      <form className="card" onSubmit={submit}>
        <h2>New credit application</h2>

        <h3>Applicant</h3>
        <label>Applicant ID <input value={form.applicant_id} onChange={update('applicant_id')} required /></label>
        <label>Age <input type="number" value={form.age} onChange={update('age')} /></label>
        <label>Dependents <input type="number" value={form.dependents} onChange={update('dependents')} /></label>
        <label>Annual income <input type="number" value={form.annual_income} onChange={update('annual_income')} /></label>

        <h3>Loan request</h3>
        <label>Requested loan amount <input type="number" value={form.requested_amount} onChange={update('requested_amount')} /></label>

        <h3>Credit history <span className="hint">(demo/simulated — not verified bureau data)</span></h3>
        <label>Credit utilization (ratio, e.g. 0.30) <input type="number" step="0.01" value={form.credit_utilization} onChange={update('credit_utilization')} /></label>
        <label>Open credit lines/loans <input type="number" value={form.num_open_credit_lines} onChange={update('num_open_credit_lines')} /></label>
        <label>30–59 day late payments <input type="number" value={form.delinquencies_30_59} onChange={update('delinquencies_30_59')} /></label>
        <label>60–89 day late payments <input type="number" value={form.delinquencies_60_89} onChange={update('delinquencies_60_89')} /></label>
        <label>90+ day late payments <input type="number" value={form.delinquencies_90_plus} onChange={update('delinquencies_90_plus')} /></label>
        <label>Real-estate loans <input type="number" value={form.num_real_estate_loans} onChange={update('num_real_estate_loans')} /></label>
        <label>Monthly debt payments <input type="number" value={form.monthly_debt_payments} onChange={update('monthly_debt_payments')} /></label>

        <h3>Bank account <span className="hint">(demo/simulated)</span></h3>
        <label>Average monthly income <input type="number" value={form.avg_monthly_income} onChange={update('avg_monthly_income')} /></label>
        <label>Average monthly expenses <input type="number" value={form.avg_monthly_expenses} onChange={update('avg_monthly_expenses')} /></label>
        <label>Overdraft count (90 days) <input type="number" value={form.overdraft_count_90d} onChange={update('overdraft_count_90d')} /></label>

        <h3>Fraud context <span className="hint">(system-observed in production)</span></h3>
        <label>Device ID <input value={form.device_id} onChange={update('device_id')} /></label>
        <label>IP address <input value={form.ip_address} onChange={update('ip_address')} /></label>

        <button type="submit" disabled={loading}>{loading ? 'Evaluating…' : 'Submit application'}</button>
        {error && <p className="error">{error}</p>}
      </form>

      {result && <DecisionCard key={result.request_id} result={result} />}
    </div>
  )
}
