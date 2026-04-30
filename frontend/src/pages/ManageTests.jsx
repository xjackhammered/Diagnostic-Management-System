import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { getTests, createTest, deleteTest } from '../api'
import toast from 'react-hot-toast'

export default function ManageTests() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => getTests({ active: 'true', page_size: 100 }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: createTest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setName(''); setPrice('')
      toast.success('Test added successfully')
    },
    onError: (err) => {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to add test'
      toast.error(msg)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteTest,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Test removed')
    },
    onError: () => toast.error('Failed to remove test'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !price) return
    createMut.mutate({ name: name.trim(), price: parseFloat(price) })
  }

  const tests = data?.results || []

  return (
    <div>
      <div className="page-header">
        <h2>Manage Tests</h2>
        <p>Add or remove diagnostic tests and their prices</p>
      </div>

      <div className="card">
        <div className="card-title">Add New Test</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Test Name</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Complete Blood Count" required
              />
            </div>
            <div className="form-group">
              <label>Price (৳)</label>
              <input
                type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="e.g. 500" min="0" step="0.01" required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
            <Plus /> {createMut.isPending ? 'Adding…' : 'Add Test'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Available Tests ({tests.length})</div>
        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : !tests.length ? (
          <div className="empty-state">No tests yet. Add your first test above.</div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10}}>
            {tests.map(t => (
              <div key={t.id} style={{
                background:'var(--bg)', borderRadius:'var(--radius-sm)',
                border:'1px solid var(--border)', padding:'12px 14px',
                display:'flex', justifyContent:'space-between', alignItems:'center'
              }}>
                <div>
                  <div style={{fontWeight:500, fontSize:13}}>{t.name}</div>
                  <div style={{color:'var(--green)', fontSize:12, fontWeight:600, marginTop:2}}>৳{Number(t.price).toLocaleString()}</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => deleteMut.mutate(t.id)}
                  disabled={deleteMut.isPending}
                  style={{color:'var(--red)', padding:'4px'}}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
