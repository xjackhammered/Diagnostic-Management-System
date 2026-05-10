import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Plus, Trash2, TrendingUp, Wallet, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

// ── API calls ─────────────────────────────────────────────
const getBreakdown  = ()           => api.get('/revenue/breakdown/').then(r => r.data)
const getPayments   = (params)     => api.get('/payments/', { params }).then(r => r.data)
const createPayment = (data)       => api.post('/payments/', data)
const deletePayment = (id)         => api.delete(`/payments/${id}/`)

export default function Revenue() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState({})       // collaborator_id -> bool
  const [logModal, setLogModal] = useState(null)     // collaborator object or null
  const [form, setForm] = useState({ amount: '', paid_at: '', notes: '' })

  const { data: breakdown, isLoading } = useQuery({
    queryKey: ['revenue-breakdown'],
    queryFn: getBreakdown,
  })

  const createMut = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue-breakdown'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setLogModal(null)
      setForm({ amount: '', paid_at: '', notes: '' })
      toast.success('Payment logged successfully')
    },
    onError: () => toast.error('Failed to log payment'),
  })

  const deleteMut = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue-breakdown'] })
      toast.success('Payment deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleLogPayment = () => {
    if (!form.amount || !form.paid_at) {
      toast.error('Amount and date are required')
      return
    }
    createMut.mutate({
      collaborator: logModal.collaborator_id,
      amount: parseFloat(form.amount),
      paid_at: form.paid_at,
      notes: form.notes,
    })
  }

  // Summary totals across all collaborators
  const totalEarned = breakdown?.reduce((s, c) => s + c.total_earned, 0) || 0
  const totalPaid   = breakdown?.reduce((s, c) => s + c.total_paid, 0) || 0
  const totalOwed   = breakdown?.reduce((s, c) => s + c.balance, 0) || 0

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Revenue</h2>
          <p>Track earnings and payments from each collaborator</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={11} /> Total Earned
          </div>
          <div className="stat-value text-green">৳{totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wallet size={11} /> Total Received
          </div>
          <div className="stat-value" style={{ color: '#2563EB' }}>৳{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={11} /> Outstanding Balance
          </div>
          <div className="stat-value" style={{ color: totalOwed > 0 ? 'var(--red)' : 'var(--green)' }}>
            ৳{totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Per-collaborator breakdown */}
      {isLoading ? (
        <div className="card"><div className="empty-state"><div className="spinner" /></div></div>
      ) : !breakdown?.length ? (
        <div className="card"><div className="empty-state">No data yet.</div></div>
      ) : (
        breakdown.map(collab => (
          <div key={collab.collaborator_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

            {/* Collaborator header row */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', cursor: 'pointer',
                background: expanded[collab.collaborator_id] ? 'var(--bg)' : 'var(--surface)',
                borderBottom: expanded[collab.collaborator_id] ? '1px solid var(--border)' : 'none',
              }}
              onClick={() => toggleExpand(collab.collaborator_id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {expanded[collab.collaborator_id]
                  ? <ChevronDown size={16} color="var(--text-muted)" />
                  : <ChevronRight size={16} color="var(--text-muted)" />
                }
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{collab.collaborator_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {collab.percentage}% commission · {collab.total_bookings} booking{collab.total_bookings !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earned</div>
                  <div style={{ fontWeight: 600, color: 'var(--green)' }}>৳{collab.total_earned.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Received</div>
                  <div style={{ fontWeight: 600, color: '#2563EB' }}>৳{collab.total_paid.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</div>
                  <div style={{ fontWeight: 700, color: collab.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                    ৳{collab.balance.toLocaleString(undefined, {minimumFractionDigits:2})}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={e => { e.stopPropagation(); setLogModal(collab); setForm({ amount: '', paid_at: new Date().toISOString().split('T')[0], notes: '' }) }}
                >
                  <Plus size={13} /> Log Payment
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expanded[collab.collaborator_id] && (
              <div style={{ padding: '0 20px 20px' }}>

                {/* Bookings breakdown */}
                <div style={{ marginTop: 16 }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Booking Breakdown</div>
                  {!collab.bookings.length ? (
                    <div className="empty-state" style={{ padding: '16px 0' }}>No bookings yet.</div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Booking ID</th>
                            <th>Patient</th>
                            <th>Tests</th>
                            <th>Booking Total</th>
                            <th>Our Cut ({collab.percentage}%)</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {collab.bookings.map(b => (
                            <tr key={b.id}>
                              <td><span className="badge badge-blue">{b.booking_id}</span></td>
                              <td>{b.patient_name}</td>
                              <td>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  {b.tests.map(t => t.name).join(', ')}
                                </div>
                              </td>
                              <td>৳{b.grand_total.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                              <td style={{ fontWeight: 600, color: 'var(--green)' }}>
                                ৳{b.our_cut.toLocaleString(undefined, {minimumFractionDigits:2})}
                              </td>
                              <td className="text-muted">
                                {new Date(b.created_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Payment history */}
                <div style={{ marginTop: 20 }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Payment History</div>
                  {!collab.payments.length ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                      No payments logged yet.
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>Date</th><th>Amount</th><th>Notes</th><th></th></tr>
                        </thead>
                        <tbody>
                          {collab.payments.map(p => (
                            <tr key={p.id}>
                              <td>{new Date(p.paid_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</td>
                              <td style={{ fontWeight: 600, color: '#2563EB' }}>৳{Number(p.amount).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                              <td className="text-muted">{p.notes || '—'}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => deleteMut.mutate(p.id)}
                                  title="Delete payment"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        ))
      )}

      {/* Log Payment Modal */}
      {logModal && (
        <div className="modal-overlay" onClick={() => setLogModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Log Payment — {logModal.collaborator_name}</div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Outstanding balance: <strong style={{ color: logModal.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                ৳{logModal.balance.toLocaleString(undefined, {minimumFractionDigits:2})}
              </strong>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Amount (৳) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={form.paid_at}
                  onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 4 }}>
              <label>Notes (optional)</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Bank transfer ref #1234"
              />
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setLogModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleLogPayment}
                disabled={createMut.isPending}
              >
                <CheckCircle size={14} /> {createMut.isPending ? 'Saving...' : 'Log Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
