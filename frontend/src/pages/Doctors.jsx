import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from '../api'
import Modal from '../components/Modal'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'
import toast from 'react-hot-toast'

const empty = { name: '', age: '', contact_number: '', email: '' }

export default function Doctors() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', { page, search }],
    queryFn: () => getDoctors({ page, search: search || undefined, page_size: 15 }).then(r => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['doctors'] })
  const createMut = useMutation({ mutationFn: createDoctor, onSuccess: () => { invalidate(); setModal(null); setForm(empty); toast.success('Doctor added') }, onError: () => toast.error('Failed') })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateDoctor(id, data), onSuccess: () => { invalidate(); setModal(null); toast.success('Updated') }, onError: () => toast.error('Failed') })
  const deleteMut = useMutation({ mutationFn: deleteDoctor, onSuccess: () => { invalidate(); toast.success('Deleted') }, onError: () => toast.error('Failed') })

  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, age: d.age, contact_number: d.contact_number, email: d.email }); setModal('edit') }
  const handleSubmit = () => modal === 'create' ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })

  const doctors = data?.results || []

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>Doctors</h2><p>Manage referring doctors</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(empty); setModal('create') }}><Plus size={14}/>Add Doctor</button>
      </div>
      <div className="card">
        <div className="flex gap-2 items-center" style={{marginBottom:16}}>
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search doctors..." />
        </div>
        {isLoading ? <div className="empty-state"><div className="spinner"/></div>
        : !doctors.length ? <div className="empty-state">No doctors found.</div>
        : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Age</th><th>Phone</th><th>Email</th><th></th></tr></thead>
              <tbody>
                {doctors.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td><td>{d.age}</td>
                    <td>{d.contact_number}</td><td className="text-muted">{d.email}</td>
                    <td><div className="flex gap-2">
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(d)}><Pencil size={13}/></button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteMut.mutate(d.id)}><Trash2 size={13}/></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <Modal title={modal === 'create' ? 'Add Doctor' : 'Edit Doctor'} onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Save</button></>}>
          <div className="form-row">
            <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Dr. John Doe"/></div>
            <div className="form-group"><label>Age</label><input type="number" value={form.age} onChange={e => setForm(f=>({...f,age:e.target.value}))} placeholder="45"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input value={form.contact_number} onChange={e => setForm(f=>({...f,contact_number:e.target.value}))} placeholder="+880..."/></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="dr@email.com"/></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
