import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserRound, Building2,
  FlaskConical, TestTube, ClipboardPlus, History,
  RefreshCw, LogOut
} from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { logoutUser } from './api'
import toast from 'react-hot-toast'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Doctors from './pages/Doctors'
import Collaborators from './pages/Collaborators'
import Diagnostics from './pages/Diagnostics'
import CollaboratorTests from './pages/CollaboratorTests'
import NewBooking from './pages/NewBooking'
import BookingHistory from './pages/BookingHistory'
import Followup from './pages/Followup'

const navLink = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '')

// Wrapper: redirects to /login if not authenticated
function ProtectedLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logoutUser()
      window.location.href = '/login'  // full reload clears all state
    } catch {
      toast.error('Logout failed')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>BelleVie</h1>
        </div>
        <nav>
          <div className="nav-section">Overview</div>
          <NavLink to="/" end className={navLink}><LayoutDashboard />Dashboard</NavLink>

          <div className="nav-section">Records</div>
          <NavLink to="/patients" className={navLink}><Users />Patients</NavLink>
          <NavLink to="/doctors" className={navLink}><UserRound />Doctors</NavLink>
          <NavLink to="/collaborators" className={navLink}><Building2 />Collaborators</NavLink>

          <div className="nav-section">Tests</div>
          <NavLink to="/diagnostics" className={navLink}><FlaskConical />Diagnostics</NavLink>
          <NavLink to="/collaborator-tests" className={navLink}><TestTube />Price Assignments</NavLink>

          <div className="nav-section">Bookings</div>
          <NavLink to="/booking/new" className={navLink}><ClipboardPlus />New Booking</NavLink>
          <NavLink to="/bookings" className={navLink}><History />All Bookings</NavLink>
          <NavLink to="/followup" className={navLink}><RefreshCw />Follow-ups</NavLink>
        </nav>

        {/* Logged in user + logout at bottom of sidebar */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            {user.username}
            {user.is_superuser && (
              <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10 }}>Admin</span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ padding: '4px 0', color: 'var(--red)' }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/"                   element={<Dashboard />} />
          <Route path="/patients"           element={<Patients />} />
          <Route path="/doctors"            element={<Doctors />} />
          <Route path="/collaborators"      element={<Collaborators />} />
          <Route path="/diagnostics"        element={<Diagnostics />} />
          <Route path="/collaborator-tests" element={<CollaboratorTests />} />
          <Route path="/booking/new"        element={<NewBooking />} />
          <Route path="/bookings"           element={<BookingHistory />} />
          <Route path="/followup"           element={<Followup />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginGuard />} />
        <Route path="/*"     element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}

// Redirect to / if already logged in
function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-lg" />
    </div>
  )
  if (user) return <Navigate to="/" replace />
  return <Login />
}