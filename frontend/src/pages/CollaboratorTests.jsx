import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { getCollaborators, getDiagnostics, getCollaboratorTests, createCollaboratorTest, updateCollaboratorTest, deleteCollaboratorTest } from '../api'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const empty = { collaborator: '', diagnostic: '', price: '' }

export default function CollaboratorTests() {
  const qc = useQueryClient()
  const [filterCollab, setFilterCollab] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  const { data: collabData } = useQuery({ queryKey: ['collaborators', {}], queryFn: () => getCollaborators({ page_size: 100 }).then(r => r.data) })
  const { data: diagData } = useQuery({ queryKey: ['diagnostics', {}], queryFn: () => getDiagnostics({ page_size: 100 }).then(r => r.data) })
  const { data, isLoading } = useQuery({
    queryKey: ['collaborator-tests', { filterCollab }],
    queryFn: () => getCollaboratorTests({ collaborator: filterCollab || undefined, page_size: 100 }).then(r => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['collaborator-tests'] })
  const createMut = useMutation({ mutationFn: createCollaboratorTest, onSuccess: () => { invalidate(); setModal(null); setForm(empty); toast.success('Price assigned') }, onError: (e) => toast.error(e.response?.data?.non_field_errors?.[0] || e.response?.data?.detail || 'Already exists or invalid') })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateCollaboratorTest(id, data), onSuccess: () => { invalidate(); setModal(null); toast.success('Price updated') }, onError: () => toast.error('Failed') })
  const deleteMut = useMutation({ mutationFn: deleteCollaboratorTest, onSuccess: () => { invalidate(); toast.success('Deactivated') }, onError: () => toast.error('Failed') })

  const openEdit = (ct) => { setEditing(ct); setForm({ collaborator: ct.collaborator, diagnostic: ct.diagnostic, price: ct.price }); setModal('edit') }
  const handleSubmit = () => modal === 'create' ? createMut.mutate({ ...form, collaborator: Number(form.collaborator), diagnostic: Number(form.diagnostic), price: parseFloat(form.price) }) : updateMut.mutate({ id: editing.id, data: { price: parseFloat(form.price) } })

  const tests = data?.results || []
  const collaborators = collabData?.results || []
  const diagnostics = diagData?.results || []

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>Price Assignments</h2><p>Assign diagnostic tests to collaborators with prices</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(empty); setModal('create') }}><Plus size={14}/>Assign Price</button>
      </div>

      <div className="card">
        <div className="flex gap-2 items-center" style={{marginBottom:16}}>
          <div className="form-group" style={{flex:1, marginBottom:0}}>
            <select value={filterCollab} onChange={e => setFilterCollab(e.target.value)}>
              <option value="">All Collaborators</option>
              {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? <div className="empty-state"><div className="spinner"/></div>
        : !tests.length ? <div className="empty-state">No price assignments yet. Assign a test to a collaborator above.</div>
        : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Diagnostic Test</th><th>Collaborator</th><th>Price (৳)</th><th></th></tr></thead>
              <tbody>
                {tests.map(ct => (
                  <tr key={ct.id}>
                    <td><strong>{ct.diagnostic_name}</strong></td>
                    <td>{ct.collaborator_name}</td>
                    <td className="text-green fw-600">৳{Number(ct.price).toLocaleString()}</td>
                    <td><div className="flex gap-2">
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(ct)}><Pencil size={13}/></button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteMut.mutate(ct.id)}><Trash2 size={13}/></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Assign Test Price' : 'Edit Price'}
          onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>Save</button></>}
        >
          {modal === 'create' && (
            <>
              <div className="form-group" style={{marginBottom:14}}>
                <label>Collaborator</label>
                <select value={form.collaborator} onChange={e => setForm(f=>({...f,collaborator:e.target.value}))}>
                  <option value="">Select collaborator...</option>
                  {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{marginBottom:14}}>
                <label>Diagnostic Test</label>
                <select value={form.diagnostic} onChange={e => setForm(f=>({...f,diagnostic:e.target.value}))}>
                  <option value="">Select test...</option>
                  {diagnostics.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </>
          )}
          {modal === 'edit' && (
            <div style={{marginBottom:14, padding:'10px 12px', background:'var(--bg)', borderRadius:'var(--radius-sm)', fontSize:13}}>
              <strong>{editing.diagnostic_name}</strong> @ {editing.collaborator_name}
            </div>
          )}
          <div className="form-group">
            <label>Price (৳)</label>
            <input type="number" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} placeholder="500" min="0" step="0.01"/>
          </div>
        </Modal>
      )}
    </div>
  )
}
