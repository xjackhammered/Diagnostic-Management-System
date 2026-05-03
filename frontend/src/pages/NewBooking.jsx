import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, X, Home, Building2, Download, Plus } from 'lucide-react'
import {
  getPatients,
  getDoctors,
  getCollaborators,
  getCollaboratorTests,
  createBooking,
  createPatient,
  downloadBookingPDF,
} from '../api'
import toast from 'react-hot-toast'

const DELIVERY_CHARGE = 200

// ─── New Patient Modal – persistent portal, never unmounts ──
function AddPatientModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    contact_number: '',
    email: '',
    gender: '',
  })

  const createPatientMut = useMutation({
    mutationFn: createPatient,
    onSuccess: (res) => {
      onCreated(res.data)
      setForm({ name: '', age: '', contact_number: '', email: '', gender: '' })
      onClose()
      toast.success('Patient created and selected')
    },
    onError: () => toast.error('Failed to create patient'),
  })

  const nameInputRef = useRef(null)
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  return createPortal(
    <div
      className="modal-overlay"
      style={{ display: isOpen ? 'flex' : 'none' }}
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Add New Patient</div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              ref={nameInputRef}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              placeholder="30"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div className="form-group">{/* placeholder */}</div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Phone</label>
            <input
              value={form.contact_number}
              onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
              placeholder="+880..."
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: 20 }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => createPatientMut.mutate(form)}
            disabled={createPatientMut.isPending}
          >
            Add & Select
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main Page ─────────────────────────────────────────────
export default function NewBooking() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const searchTimeout = useRef(null) // patient search debounce
  const testWrapperRef = useRef(null) // for click‑outside detection

  // Patient
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState([])
  const [showPatientDrop, setShowPatientDrop] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [newPatientModal, setNewPatientModal] = useState(false)

  // Booking fields
  const [collaboratorId, setCollaboratorId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [serviceType, setServiceType] = useState('center')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [discountValue, setDiscountValue] = useState('')
  const [discountType, setDiscountType] = useState('flat')

  // Tests
  const [testSearch, setTestSearch] = useState('')
  const [testResults, setTestResults] = useState([])
  const [showTestDrop, setShowTestDrop] = useState(false)
  const [selectedTests, setSelectedTests] = useState([])

  // Data fetches
  const { data: collabData } = useQuery({
    queryKey: ['collaborators', {}],
    queryFn: () => getCollaborators({ page_size: 100 }).then((r) => r.data),
  })
  const { data: doctorData } = useQuery({
    queryKey: ['doctors', {}],
    queryFn: () => getDoctors({ page_size: 100 }).then((r) => r.data),
  })

  const collaborators = collabData?.results || []
  const doctors = doctorData?.results || []

  // ── Close test dropdown when clicking outside ────────────
  useEffect(() => {
    const handler = (e) => {
      if (testWrapperRef.current && !testWrapperRef.current.contains(e.target)) {
        setShowTestDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, []) // runs once on mount

  // ── Patient search with debounce ─────────────────────────
  const handlePatientSearch = (e) => {
    const val = e.target.value
    setPatientSearch(val)
    if (!val) {
      setSelectedPatient(null)
      setShowPatientDrop(false)
      return
    }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      const res = await getPatients({ search: val, page_size: 6 })
      setPatientResults(res.data.results)
      setShowPatientDrop(true)
    }, 300)
  }

  // ── Test search – shows all on focus, refines with typing ─
  const searchTests = useCallback(
    async (q) => {
      if (!collaboratorId) {
        toast.error('Select a collaborator first')
        return
      }
      const trimmed = q.trim()
      const res = await getCollaboratorTests({
        collaborator: collaboratorId,
        search: trimmed ? trimmed : undefined,   // undefined → fetch all
        page_size: trimmed ? 10 : 100,           // more when showing everything
      })
      const filtered = res.data.results.filter(
        (t) => !selectedTests.find((s) => s.id === t.id)
      )
      setTestResults(filtered)
      setShowTestDrop(true)
    },
    [collaboratorId, selectedTests]
  )

  const addTest = (test) => {
    setSelectedTests((prev) => [...prev, test])
    setTestSearch('')
    setTestResults([])
    setShowTestDrop(false)
    searchRef.current?.focus()
  }

  const removeTest = (id) =>
    setSelectedTests((prev) => prev.filter((t) => t.id !== id))

  // Financials
  const subtotal = selectedTests.reduce((s, t) => s + Number(t.price), 0)
  const discVal = parseFloat(discountValue) || 0
  const discountAmt =
    discountType === 'percent'
      ? Math.min((subtotal * discVal) / 100, subtotal)
      : Math.min(discVal, subtotal)
  const delivery = serviceType === 'home' ? DELIVERY_CHARGE : 0
  const grandTotal = subtotal - discountAmt + delivery

  // Create booking mutation
  const bookingMut = useMutation({
    mutationFn: createBooking,
    onSuccess: async (res) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success(`Booking ${res.data.booking_id} created!`)
      try {
        await downloadBookingPDF(
          res.data.id,
          `${res.data.booking_id}_${res.data.patient_name.replace(/\s+/g, '_')}.pdf`
        )
      } catch {
        toast.error('Booking saved but PDF failed')
      }
      navigate('/bookings')
    },
    onError: (e) => {
      const d = e.response?.data
      const msg =
        d?.collaborator_test_ids?.[0] ||
        d?.patient?.[0] ||
        d?.scheduled_at?.[0] ||
        d?.non_field_errors?.[0] ||
        'Failed to create booking'
      toast.error(msg)
    },
  })

  const handleSubmit = () => {
    if (!selectedPatient) {
      toast.error('Select a patient')
      return
    }
    if (!collaboratorId) {
      toast.error('Select a collaborator')
      return
    }
    if (!scheduledAt) {
      toast.error('Set a scheduled date and time')
      return
    }
    if (!selectedTests.length) {
      toast.error('Add at least one test')
      return
    }
    bookingMut.mutate({
      patient: selectedPatient.id,
      collaborator: Number(collaboratorId),
      doctor: doctorId ? Number(doctorId) : null,
      service_type: serviceType,
      scheduled_at: scheduledAt,
      discount_value: discVal,
      discount_type: discountType,
      notes,
      collaborator_test_ids: selectedTests.map((t) => t.id),
    })
  }

  const handleCollaboratorChange = (e) => {
    setCollaboratorId(e.target.value)
    setSelectedTests([])
    setTestSearch('')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>New Booking</h2>
          <p>Create a diagnostic test booking for a patient</p>
        </div>
      </div>

      {/* Patient */}
      <div className="card">
        <div className="card-title">Patient</div>
        <div className="autocomplete-wrap">
          <div className="search-bar">
            <Search />
            <input
              value={patientSearch}
              onChange={handlePatientSearch}
              onFocus={() => patientSearch && setShowPatientDrop(true)}
              placeholder="Search patient by name or phone..."
            />
          </div>
          {showPatientDrop && patientResults.length > 0 && (
            <div className="autocomplete-dropdown">
              {patientResults.map((p) => (
                <div
                  key={p.id}
                  className="autocomplete-option"
                  onClick={() => {
                    setSelectedPatient(p)
                    setPatientSearch(p.name)
                    setShowPatientDrop(false)
                  }}
                >
                  <div>
                    <div>{p.name}</div>
                    <div className="opt-sub">
                      {p.contact_number} · Age {p.age}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedPatient && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              background: 'var(--green-light)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--green-border)',
              fontSize: 13,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>{selectedPatient.name}</strong>
              <span className="text-muted">
                {' '}
                · {selectedPatient.contact_number} · Age {selectedPatient.age}
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSelectedPatient(null)
                setPatientSearch('')
              }}
              style={{ padding: 4 }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <button
          className="btn btn-sm"
          style={{ marginTop: 10 }}
          onClick={() => setNewPatientModal(true)}
        >
          <Plus size={13} /> New Patient
        </button>
      </div>

      {/* Booking Details */}
      <div className="card">
        <div className="card-title">Booking Details</div>
        <div className="form-row">
          <div className="form-group">
            <label>Collaborator *</label>
            <select value={collaboratorId} onChange={handleCollaboratorChange}>
              <option value="">Select collaborator...</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Referring Doctor (optional)</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">No doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Scheduled Date & Time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fasting required..."
            />
          </div>
        </div>
      </div>

      {/* Service Type */}
      <div className="card">
        <div className="card-title">Service Type</div>
        <div className="toggle-row">
          <button
            className={`toggle-opt${serviceType === 'center' ? ' active' : ''}`}
            onClick={() => setServiceType('center')}
          >
            <Building2 size={14} /> Visit Center
          </button>
          <button
            className={`toggle-opt${serviceType === 'home' ? ' active' : ''}`}
            onClick={() => setServiceType('home')}
          >
            <Home size={14} /> Home Collection (+৳{DELIVERY_CHARGE})
          </button>
        </div>
      </div>

      {/* Tests */}
      <div className="card">
        <div className="card-title">Diagnostic Tests</div>
        {!collaboratorId && (
          <div
            style={{
              padding: '12px',
              background: 'var(--amber-light)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: '#92400E',
              marginBottom: 12,
            }}
          >
            Select a collaborator first to see available tests and prices.
          </div>
        )}
        <div className="autocomplete-wrap" ref={testWrapperRef}>
          <div className="search-bar">
            <Search />
            <input
              ref={searchRef}
              value={testSearch}
              onChange={(e) => {
                setTestSearch(e.target.value)
                searchTests(e.target.value)
              }}
              onFocus={() => {
                if (collaboratorId) searchTests(testSearch)
              }}
              placeholder={
                collaboratorId
                  ? 'Search or click to see all tests...'
                  : 'Select a collaborator first'
              }
              disabled={!collaboratorId}
            />
          </div>
          {showTestDrop && testResults.length > 0 && (
            <div className="autocomplete-dropdown">
              {testResults.map((t) => (
                <div
                  key={t.id}
                  className="autocomplete-option"
                  onClick={() => addTest(t)}
                >
                  <span>{t.diagnostic_name}</span>
                  <span className="opt-price">
                    ৳{Number(t.price).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          {!selectedTests.length ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              No tests selected yet
            </div>
          ) : (
            selectedTests.map((t) => (
              <div key={t.id} className="selected-test-row">
                <span style={{ fontWeight: 500 }}>{t.diagnostic_name}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-green fw-600">
                    ৳{Number(t.price).toLocaleString()}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeTest(t.id)}
                    style={{ padding: 4, color: 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Checkout */}
      <div className="card">
        <div className="card-title">Checkout</div>
        <div className="form-row">
          <div className="form-group">
            <label>Discount Amount</label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Discount Type</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
            >
              <option value="flat">৳ Flat Amount</option>
              <option value="percent">% Percentage</option>
            </select>
          </div>
        </div>

        {selectedTests.length > 0 && (
          <div className="totals-section">
            <div className="total-line">
              <span>
                Subtotal ({selectedTests.length} test
                {selectedTests.length !== 1 ? 's' : ''})
              </span>
              <span>৳{subtotal.toLocaleString()}</span>
            </div>
            {discountAmt > 0 && (
              <div className="total-line">
                <span>Discount</span>
                <span className="text-red">
                  -৳{discountAmt.toLocaleString()}
                </span>
              </div>
            )}
            {delivery > 0 && (
              <div className="total-line">
                <span>Home Collection Fee</span>
                <span>৳{delivery.toLocaleString()}</span>
              </div>
            )}
            <div className="total-line grand">
              <span>Grand Total</span>
              <span className="val">৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={bookingMut.isPending}
          >
            <Download size={14} />
            {bookingMut.isPending ? 'Saving...' : 'Save & Download PDF'}
          </button>
          <button
            className="btn"
            onClick={() => {
              setSelectedPatient(null)
              setPatientSearch('')
              setCollaboratorId('')
              setDoctorId('')
              setSelectedTests([])
              setScheduledAt('')
              setNotes('')
              setDiscountValue('')
              setServiceType('center')
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* New Patient Modal – stable, never unmounted */}
      <AddPatientModal
        isOpen={newPatientModal}
        onClose={() => setNewPatientModal(false)}
        onCreated={(patient) => {
          setSelectedPatient(patient)
          setPatientSearch(patient.name)
        }}
      />
    </div>
  )
}