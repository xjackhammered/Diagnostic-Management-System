import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserRound, Building2,
  FlaskConical, TestTube, ClipboardPlus, History
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Doctors from './pages/Doctors'
import Collaborators from './pages/Collaborators'
import Diagnostics from './pages/Diagnostics'
import CollaboratorTests from './pages/CollaboratorTests'
import NewBooking from './pages/NewBooking'
import BookingHistory from './pages/BookingHistory'

const navLink = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '')

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>DiagnosticHub</h1>
            <p>Management System</p>
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
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/collaborators" element={<Collaborators />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/collaborator-tests" element={<CollaboratorTests />} />
            <Route path="/booking/new" element={<NewBooking />} />
            <Route path="/bookings" element={<BookingHistory />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
