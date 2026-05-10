import { useState } from 'react'
import { collabLogin } from './collaboratorApi'
import toast from 'react-hot-toast'
import logo from '../assets/logo.png'

export default function CollaboratorLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      toast.error('Please enter username and password')
      return
    }
    setLoading(true)
    try {
      const res = await collabLogin(form)
      toast.success(`Welcome, ${res.data.collaborator_name}`)
      onLogin(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F7F8FA',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={logo} alt="BelleVie" style={{ height: 90, objectFit: 'contain' }} />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Collaborator Portal</div>
        </div>

        <div style={{
          background: 'white', borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Sign In</div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 5 }}>
                Username
              </label>
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter username"
                autoFocus
                style={{ width: '100%', padding: '8px 11px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 5 }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
                style={{ width: '100%', padding: '8px 11px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: 10, background: '#1A3E6F', color: 'white',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
                fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
