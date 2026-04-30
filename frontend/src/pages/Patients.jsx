import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getPatients, createPatient, updatePatient, deletePatient } from '../api'
import Modal from '../components/Modal'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'
import toast from 'react-hot-toast'

const empty = { name: '', age: '', contact_number: '', email: '' }

export default function Patients() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['patients', { page, search }],
    queryFn: () => getPatients({ page, search: search || undefined, page_size: 15 }).then(r => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['patients'] })

  const createMut = useMutation({
    mutationFn: createPatient,
    onSuccess: () => { invalidate(); setModal(null); setForm(empty); toast.success('Patient added') },
    onError: (e) => toast.error(e.response?.data?.name?.[0] || 'Failed to add patient'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePatient(id, data),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Patient updated') },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMut = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => { invalidate(); toast.success('Patient deleted') },
    onError: () => toast.error('Cannot delete — patient has existing bookings'),
  })

  const openEdit = (p) => {
    setEditing(p)
    setForm({ name: p.name, age: p.age, contact_number: p.contact_number, email: p.email })
    setModal('edit')
  }

  const handleSubmit = () => {
    if (modal === 'create') createMut.mutate(form)
    else updateMut.mutate({ id: editing.id, data: form })
  }

  const patients = data?.results || []
  const totalPages = data ? Math.ceil(data.count / 15) : 1

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>Patients</h2><p>Manage patient records</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(empty); setModal('create') }}><Plus size={14}/>Add Patient</button>
      </div>

      <div className="card">
        <div className="flex gap-2 items-center" style={{marginBottom:16}}>
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by name, phone, email..." />
        </div>
        {isLoading ? <div className="empty-state"><div className="spinner" /></div>
        : !patients.length ? <div className="empty-state">No patients found.</div>
        : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Age</th><th>Phone</th><th>Email</th><th>Since</th><th></th></tr></thead>
                <tbody>
                  {patients.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.age}</td>
                      <td>{p.contact_number}</td>
                      <td className="text-muted">{p.email}</td>
                      <td className="text-muted">{new Date(p.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)}><Pencil size={13}/></button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteMut.mutate(p.id)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Add Patient' : 'Edit Patient'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                {modal === 'create' ? 'Add' : 'Save'}
              </button>
            </>
          }
        >
          {/* ── Form fields inlined – no extra component, so inputs stay mounted ── */}
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="30"
                min="0"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                value={form.contact_number}
                onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))}
                placeholder="+880..."
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="john@email.com"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}