import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Download, ClipboardPlus, Calendar, FlaskConical } from 'lucide-react'
import { getPatients, getPatientFollowup, downloadBookingPDF } from '../api'
import toast from 'react-hot-toast'

export default function Followup() {
  const navigate = useNavigate()
  const searchTimeout = useRef(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [followupData, setFollowupData] = useState(null)
  const [loadingFollowup, setLoadingFollowup] = useState(false)

  const handleSearch = useCallback((val) => {
    setSearchQuery(val)
    if (!val.trim()) { setSearchResults([]); setShowDrop(false); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await getPatients({ search: val, page_size: 8 })
        setSearchResults(res.data.results)
        setShowDrop(true)
      } catch { setSearchResults([]) }
    }, 300)
  }, [])

  const selectPatient = async (patient) => {
    setSelectedPatient(patient)
    setSearchQuery(patient.name)
    setShowDrop(false)
    setLoadingFollowup(true)
    try {
      const res = await getPatientFollowup(patient.id)
      setFollowupData(res.data)
    } catch {
      toast.error('Failed to load patient history')
    } finally {
      setLoadingFollowup(false)
    }
  }

  const clearPatient = () => {
    setSelectedPatient(null)
    setFollowupData(null)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleDownload = async (b) => {
    try {
      await downloadBookingPDF(
        b.id,
        `${b.booking_id}_${b.patient_name?.replace(/\s+/g, '_')}.pdf`
      )
    } catch { toast.error('Failed to download PDF') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Follow-ups</h2>
          <p>Search a patient to view their history and book new tests</p>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-title">Search Patient</div>
        <div className="autocomplete-wrap">
          <div className="search-bar">
            <Search />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowDrop(true)}
              placeholder="Type patient name or phone number..."
            />
          </div>
          {showDrop && searchResults.length > 0 && (
            <div className="autocomplete-dropdown">
              {searchResults.map(p => (
                <div key={p.id} className="autocomplete-option" onClick={() => selectPatient(p)}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div className="opt-sub">{p.contact_number} · Age {p.age}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showDrop && searchResults.length === 0 && searchQuery && (
            <div className="autocomplete-dropdown">
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 13 }}>
                No patients found
              </div>
            </div>
          )}
        </div>

        {selectedPatient && (
          <div style={{
            marginTop: 12, padding: '12px 14px',
            background: 'var(--blue-light)', borderRadius: 'var(--radius-sm)',
            border: '1px solid #BFDBFE',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: 13 }}>
              <strong>{selectedPatient.name}</strong>
              <span className="text-muted"> · {selectedPatient.contact_number} · Age {selectedPatient.age}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={clearPatient} style={{ padding: 4 }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loadingFollowup && (
        <div className="card"><div className="empty-state"><div className="spinner" /></div></div>
      )}

      {/* Patient Summary + Book Button */}
      {followupData && !loadingFollowup && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{followupData.patient.name}</div>
                <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {followupData.patient.contact_number}
                  {followupData.patient.age ? ` · Age ${followupData.patient.age}` : ''}
                  {followupData.patient.email ? ` · ${followupData.patient.email}` : ''}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/booking/new', { state: { patient: followupData.patient } })}
              >
                <ClipboardPlus size={14} /> Book New Test
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16
            }}>
              <div style={{
                background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                padding: '14px', border: '1px solid var(--border)'
              }}>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={11} /> Total Bookings
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {followupData.total_bookings}
                </div>
              </div>
              <div style={{
                background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                padding: '14px', border: '1px solid var(--border)'
              }}>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FlaskConical size={11} /> Total Spent
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: 'var(--green)' }}>
                  ৳{Number(followupData.total_spent).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Booking History */}
          <div className="card">
            <div className="card-title">Booking History</div>
            {!followupData.bookings.length ? (
              <div className="empty-state">No bookings yet for this patient.</div>
            ) : (
              followupData.bookings.map(b => (
                <div key={b.id} style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px', marginBottom: 10
                }}>
                  {/* Booking header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-blue">{b.booking_id}</span>
                      <span className={`badge ${b.service_type === 'home' ? 'badge-green' : 'badge-blue'}`}>
                        {b.service_type === 'home' ? 'Home' : 'Center'}
                      </span>
                    </div>
                    <button className="btn btn-sm" onClick={() => handleDownload(b)}>
                      <Download size={13} /> PDF
                    </button>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    <span><strong>Collaborator:</strong> {b.collaborator_name}</span>
                    {b.doctor_name && <span><strong>Doctor:</strong> {b.doctor_name}</span>}
                    <span><strong>Scheduled:</strong> {new Date(b.scheduled_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span><strong>Booked:</strong> {new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>

                  {/* Tests */}
                  <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    {b.items.map((item, i) => (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '7px 12px', fontSize: 13,
                        borderBottom: i < b.items.length - 1 ? '1px solid var(--border)' : 'none',
                        background: i % 2 === 0 ? 'transparent' : 'var(--surface)'
                      }}>
                        <span>{item.test_name}</span>
                        <span style={{ fontWeight: 500 }}>৳{Number(item.price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginTop: 10, fontSize: 13 }}>
                    {Number(b.discount_amount) > 0 && (
                      <span className="text-red">-৳{Number(b.discount_amount).toLocaleString()} off</span>
                    )}
                    {Number(b.delivery_charge) > 0 && (
                      <span className="text-muted">+৳{Number(b.delivery_charge).toLocaleString()} delivery</span>
                    )}
                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                      Total: ৳{Number(b.grand_total).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
