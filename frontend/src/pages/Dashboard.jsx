import { useQuery } from '@tanstack/react-query'
import { Download, Users, Building2, FlaskConical, TrendingUp } from 'lucide-react'
import { getStats, getBookings, downloadBookingPDF } from '../api'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => getStats().then(r => r.data) })
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['bookings', { page: 1 }],
    queryFn: () => getBookings({ page: 1, page_size: 8 }).then(r => r.data),
  })

  const handleDownload = async (b) => {
    try {
      await downloadBookingPDF(b.id, `${b.booking_id}_${b.patient_name.replace(/\s+/g, '_')}.pdf`)
    } catch { toast.error('Failed to download PDF') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Dashboard</h2>
          <p>Overview of your diagnostic system</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label" style={{display:'flex',alignItems:'center',gap:6}}><Users size={12}/>Patients</div>
          <div className="stat-value">{stats?.total_patients ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{display:'flex',alignItems:'center',gap:6}}><Building2 size={12}/>Collaborators</div>
          <div className="stat-value">{stats?.total_collaborators ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{display:'flex',alignItems:'center',gap:6}}><FlaskConical size={12}/>Diagnostics</div>
          <div className="stat-value">{stats?.total_diagnostics ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{display:'flex',alignItems:'center',gap:6}}><TrendingUp size={12}/>Total Revenue</div>
          <div className="stat-value text-green">৳{stats ? Number(stats.total_revenue).toLocaleString() : '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Recent Bookings</div>
        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : !bookingsData?.results?.length ? (
          <div className="empty-state">No bookings yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th><th>Patient</th><th>Collaborator</th>
                  <th>Tests</th><th>Service</th><th>Total</th><th>Scheduled</th><th></th>
                </tr>
              </thead>
              <tbody>
                {bookingsData.results.map(b => (
                  <tr key={b.id}>
                    <td><span className="badge badge-blue">{b.booking_id}</span></td>
                    <td><strong>{b.patient_name}</strong></td>
                    <td>{b.collaborator_name}</td>
                    <td>{b.items?.length} test{b.items?.length !== 1 ? 's' : ''}</td>
                    <td><span className={`badge ${b.service_type === 'home' ? 'badge-green' : 'badge-blue'}`}>{b.service_type === 'home' ? 'Home' : 'Center'}</span></td>
                    <td className="text-green fw-600">৳{Number(b.grand_total).toLocaleString()}</td>
                    <td className="text-muted">{new Date(b.scheduled_at).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td><button className="btn btn-sm" onClick={() => handleDownload(b)}><Download size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
