import { useState } from 'react'
import { askAnalyst } from '../api/client.js'

export default function PolicyAssistant({ token, applicationId }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!question.trim() || !applicationId) return
    setError(null)
    setLoading(true)
    const q = question.trim()
    try {
      const res = await askAnalyst(q, applicationId, token)
      setMessages((m) => [...m, { role: 'user', text: q }, { role: 'assistant', data: res }])
      setQuestion('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Policy assistant <span className="hint">(RAG — explains, never decides)</span></h2>
      <p className="hint">Application: <code>{applicationId}</code></p>

      {messages.map((m, i) => (
        <div key={i} className={`assistant-msg assistant-${m.role}`}>
          {m.role === 'user'
            ? <p><strong>You:</strong> {m.text}</p>
            : <AssistantAnswer data={m.data} />}
        </div>
      ))}

      <form onSubmit={submit}>
        <label>Ask about this decision
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Why was this application referred?"
          />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}

function AssistantAnswer({ data }) {
  if (data.status === 'refused') {
    return <p className="hint"><strong>Assistant:</strong> {data.explanation}</p>
  }
  return (
    <div>
      <p><strong>Assistant:</strong> {data.explanation}</p>
      {data.decision_outcome && (
        <p className="hint">
          Outcome: <span className={`decision-${data.decision_outcome}`}>{data.decision_outcome}</span>
        </p>
      )}
      {data.policy_basis && data.policy_basis.length > 0 && (
        <div className="citations">
          <p className="hint">Cited policy:</p>
          <ul>
            {data.policy_basis.map((b) => (
              <li key={b.chunk_id}><code>{b.chunk_id}</code> — {b.claim}</li>
            ))}
          </ul>
        </div>
      )}
      {data.limitations && data.limitations.length > 0 && (
        <p className="hint">Limitations: {data.limitations.join('; ')}</p>
      )}
    </div>
  )
}
