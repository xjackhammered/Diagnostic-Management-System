import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getCollaborators, createCollaborator, updateCollaborator, deleteCollaborator } from '../api'
import Modal from '../components/Modal'
import SearchBar from '../components/SearchBar'
import toast from 'react-hot-toast'

const empty = { name: '', contact_number: '', percentage: '' }

export default function Collaborators() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['collaborators', { search }],
    queryFn: () => getCollaborators({ search: search || undefined, page_size: 50 }).then(r => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['collaborators'] })
  const createMut = useMutation({ mutationFn: createCollaborator, onSuccess: () => { invalidate(); setModal(null); setForm(empty); toast.success('Collaborator added') }, onError: () => toast.error('Failed') })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateCollaborator(id, data), onSuccess: () => { invalidate(); setModal(null); toast.success('Updated') }, onError: () => toast.error('Failed') })
  const deleteMut = useMutation({ mutationFn: deleteCollaborator, onSuccess: () => { invalidate(); toast.success('Deleted') }, onError: () => toast.error('Cannot delete — has existing bookings') })

  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, contact_number: c.contact_number, percentage: c.percentage }); setModal('edit') }
  const handleSubmit = () => modal === 'create' ? createMut.mutate(form) : updateMut.mutate({ id: editing.id, data: form })

  const collaborators = data?.results || []

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>Collaborators</h2><p>Diagnostic centers and labs</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(empty); setModal('create') }}><Plus size={14}/>Add Collaborator</button>
      </div>
      <div className="card">
        <div className="flex gap-2 items-center" style={{marginBottom:16}}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search collaborators..." />
        </div>
        {isLoading ? <div className="empty-state"><div className="spinner"/></div>
        : !collaborators.length ? <div className="empty-state">No collaborators yet.</div>
        : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Our Cut (%)</th><th>Since</th><th></th></tr></thead>
              <tbody>
                {collaborators.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.contact_number}</td>
                    <td><span className="badge badge-amber">{c.percentage}%</span></td>
                    <td className="text-muted">{new Date(c.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td><div className="flex gap-2">
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(c)}><Pencil size={13}/></button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteMut.mutate(c.id)}><Trash2 size={13}/></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <Modal title={modal === 'create' ? 'Add Collaborator' : 'Edit Collaborator'} onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Save</button></>}>
          <div className="form-group" style={{marginBottom:14}}><label>Center / Lab Name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="LabCorp Dhaka"/></div>
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input value={form.contact_number} onChange={e => setForm(f=>({...f,contact_number:e.target.value}))} placeholder="+880..."/></div>
            <div className="form-group"><label>Our Percentage (%)</label><input type="number" value={form.percentage} onChange={e => setForm(f=>({...f,percentage:e.target.value}))} placeholder="10" min="0" max="100" step="0.01"/></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
