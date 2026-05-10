import { useState, useEffect } from 'react'
import { collabMe } from './collaboratorApi'
import { fetchCsrf } from '../api'
import CollaboratorLogin from './CollaboratorLogin'
import CollaboratorDashboard from './CollaboratorDashboard'

export default function CollaboratorApp() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCsrf()
      .then(() => collabMe())
      .then(res => setUser(res.data))
      .catch(() => setUser(false))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #e5e7eb',
          borderTopColor: '#1A3E6F',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!user) return <CollaboratorLogin onLogin={setUser} />
  return <CollaboratorDashboard user={user} onLogout={() => setUser(false)} />
}
