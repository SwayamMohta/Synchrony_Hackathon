import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DecisionCard({ result }) {
  const featureData = Object.entries(result.shap_top_features).map(([name, value]) => ({ name, value }))
  return (
    <div className="card decision-card">
      <h2 className={`decision-${result.decision}`}>{result.decision.toUpperCase()}</h2>
      <p>Credit risk score: {result.credit_risk_score.toFixed(3)}</p>
      <p>Fraud risk score: {result.fraud_risk_score.toFixed(3)}</p>
      <p>Model: {result.model_version} | Features: {result.feature_schema_version} | Policy: {result.policy_version}</p>
      <p>Latency: {result.latency_ms.toFixed(1)} ms</p>
      <h3>Reason codes</h3>
      <ul>{result.reason_codes.map((rc) => <li key={rc}>{rc}</li>)}</ul>
      <h3>SHAP feature attribution</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={featureData} layout="vertical">
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={220} />
          <Tooltip />
          <Bar dataKey="value" fill="#f0a500" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}