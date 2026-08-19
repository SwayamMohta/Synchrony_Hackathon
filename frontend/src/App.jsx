import { useState } from 'react'
import Login from './components/Login.jsx'
import ApplicationForm from './components/ApplicationForm.jsx'

export default function App() {
  const [token, setToken] = useState(null)
  return (
    <div className="app">
      <header className="header">
        <h1>Credit Underwriting Engine</h1>
        {token && <button onClick={() => setToken(null)}>Logout</button>}
      </header>
      {token ? <ApplicationForm token={token} /> : <Login onLogin={setToken} />}
    </div>
  )
}