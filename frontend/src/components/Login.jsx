import { useState } from 'react'
import { login } from '../api/client.js'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('analyst')
  const [password, setPassword] = useState('analyst123')
  const [error, setError] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await login(username, password)
      onLogin(res.access_token)
    } catch (err) { setError(err.message) }
  }
  return (
    <form className="card" onSubmit={submit}>
      <h2>Sign in</h2>
      <label>Username <input value={username} onChange={e => setUsername(e.target.value)} /></label>
      <label>Password <input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p className="error">{error}</p>}
      <button type="submit">Login</button>
      <p className="hint">Demo users: analyst / analyst123, admin / admin123</p>
    </form>
  )
}