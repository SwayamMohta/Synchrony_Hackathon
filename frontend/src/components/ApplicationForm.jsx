import { useState } from 'react'
import { submitApplication } from '../api/client.js'
import DecisionCard from './DecisionCard.jsx'

export default function ApplicationForm({ token }) {
  const [form, setForm] = useState({
    applicant_id: '', age: 30, annual_income: 60000, requested_amount: 1000,
    employment_length_years: 3, device_id: '', ip_address: '',
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        annual_income: Number(form.annual_income),
        requested_amount: Number(form.requested_amount),
        employment_length_years: Number(form.employment_length_years),
      }
      const res = await submitApplication(payload, token)
      setResult(res)
    } catch (err) { setError(err.message) }
  }
  return (
    <div>
      <form className="card" onSubmit={submit}>
        <h2>New credit application</h2>
        <label>Applicant ID <input value={form.applicant_id} onChange={set('applicant_id')} required /></label>
        <label>Age <input type="number" value={form.age} onChange={set('age')} /></label>
        <label>Annual income <input type="number" value={form.annual_income} onChange={set('annual_income')} /></label>
        <label>Requested amount <input type="number" value={form.requested_amount} onChange={set('requested_amount')} /></label>
        <label>Device ID <input value={form.device_id} onChange={set('device_id')} required /></label>
        <label>IP address <input value={form.ip_address} onChange={set('ip_address')} required /></label>
        <button type="submit">Submit application</button>
        {error && <p className="error">{error}</p>}
      </form>
      {result && <DecisionCard result={result} />}
    </div>
  )
}