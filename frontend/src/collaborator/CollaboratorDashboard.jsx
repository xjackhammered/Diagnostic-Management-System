import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, LogOut, ChevronLeft, ChevronRight, CheckSquare, Square, FlaskConical } from 'lucide-react'
import {
  collabLogout, collabGetBookings,
  collabMarkComplete, collabUnmarkComplete,
  collabDownloadPDF
} from './collaboratorApi'
import toast from 'react-hot-toast'
import logo from '../assets/logo.png'

export default function CollaboratorDashboard({ user, onLogout }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['collab-bookings', page],
    queryFn: () => collabGetBookings({ page, page_size: PAGE_SIZE }).then(r => r.data),
  })

  const completeMut = useMutation({
    mutationFn: (id) => collabMarkComplete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collab-bookings'] }),
    onError: () => toast.error('Failed to mark complete'),
  })

  const uncompleteMut = useMutation({
    mutationFn: (id) => collabUnmarkComplete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collab-bookings'] }),
    onError: () => toast.error('Failed to unmark'),
  })

  const handleLogout = async () => {
      try {
        await collabLogout()
      } catch {
        // continue regardless
      } finally {
        qc.clear()   // ← clears ALL react query cache
        onLogout()
      }
    }
  
    const handleDownload = async (b) => {
    try {
      await collabDownloadPDF(b.id, `${b.booking_id}_${b.patient_name?.replace(/\s+/g, '_')}.pdf`)
    } catch {
      toast.error('Failed to download PDF')
    }
  }

  const toggleComplete = (b) => {
    if (b.is_completed) {
      uncompleteMut.mutate(b.id)
    } else {
      completeMut.mutate(b.id)
    }
  }

  const bookings = data?.results || []
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F8FA',
      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14,
    }}>

      {/* Header */}
      <div style={{
        background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logo} alt="BelleVie" style={{ height: 36, objectFit: 'contain' }} />
          <div style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{user.collaborator_name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Collaborator Portal</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: 'none',
            border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6,
            fontSize: 13, cursor: 'pointer', color: '#6b7280', fontFamily: 'inherit',
          }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>My Bookings</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
            {data?.count ?? 0} total · check off a booking once all tests are completed
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#1A3E6F', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : !bookings.length ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>No bookings assigned yet.</div>
        ) : (
          <>
            {bookings.map(b => (
              <div
                key={b.id}
                style={{
                  background: b.is_completed ? '#f9fafb' : 'white',
                  border: `1px solid ${b.is_completed ? '#e5e7eb' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 10, marginBottom: 12, overflow: 'hidden',
                  opacity: b.is_completed ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {/* Booking header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  background: b.is_completed ? '#f3f4f6' : 'white',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(b)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: b.is_completed ? '#1D9E75' : '#9ca3af' }}
                      title={b.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {b.is_completed
                        ? <CheckSquare size={22} />
                        : <Square size={22} />
                      }
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          background: '#EBF3FF', color: '#2563EB',
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        }}>
                          {b.booking_id}
                        </span>
                        {b.is_completed && (
                          <span style={{
                            background: '#E1F5EE', color: '#0F6E56',
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          }}>
                            Completed
                          </span>
                        )}
                        <span style={{
                          background: b.service_type === 'home' ? '#E1F5EE' : '#EBF3FF',
                          color: b.service_type === 'home' ? '#0F6E56' : '#2563EB',
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        }}>
                          {b.service_type === 'home' ? 'Home' : 'Center'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        <strong style={{ color: '#111827' }}>{b.patient_name}</strong>
                        {b.scheduled_at && (
                          <span> · Scheduled: {new Date(b.scheduled_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(b.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1D9E75' }}>
                        ৳{Number(b.grand_total).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(b)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', background: 'white',
                        border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6,
                        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                      }}
                    >
                      <Download size={13} /> PDF
                    </button>
                  </div>
                </div>

                {/* Tests list */}
                <div style={{ padding: '10px 18px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FlaskConical size={11} /> Tests
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {b.items.map(item => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: b.is_completed ? '#f3f4f6' : '#F7F8FA',
                        border: '1px solid rgba(0,0,0,0.07)',
                        borderRadius: 6, padding: '5px 10px', fontSize: 12,
                      }}>
                        <span style={{ fontWeight: 500 }}>{item.test_name}</span>
                        <span style={{ color: '#1D9E75', fontWeight: 700 }}>৳{Number(item.price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  {b.notes && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                      <strong>Notes:</strong> {b.notes}
                    </div>
                  )}
                  {b.is_completed && b.completed_at && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#1D9E75' }}>
                      ✓ Completed on {new Date(b.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 16 }}>
                <button
                  onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  style={{ padding: '6px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                  style={{ padding: '6px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

