import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { getDiagnostics, createDiagnostic, deleteDiagnostic } from '../api'
import SearchBar from '../components/SearchBar'
import toast from 'react-hot-toast'

export default function Diagnostics() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['diagnostics', { search }],
    queryFn: () => getDiagnostics({ search: search || undefined, page_size: 100 }).then(r => r.data),
  })

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['diagnostics'] }); qc.invalidateQueries({ queryKey: ['stats'] }) }

  const createMut = useMutation({
    mutationFn: createDiagnostic,
    onSuccess: () => { invalidate(); setName(''); toast.success('Diagnostic test added') },
    onError: (e) => toast.error(e.response?.data?.name?.[0] || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteDiagnostic,
    onSuccess: () => { invalidate(); toast.success('Deleted') },
    onError: () => toast.error('Cannot delete — has existing price assignments'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    createMut.mutate({ name: name.trim() })
  }

  const diagnostics = data?.results || []

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>Diagnostic Tests</h2><p>Master list of all test names</p></div>
      </div>

      <div className="card">
        <div className="card-title">Add New Test</div>
        <form onSubmit={handleSubmit} style={{display:'flex', gap:10}}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lipid Profile, CBC, X-Ray..." style={{flex:1}} />
          <button type="submit" className="btn btn-primary" disabled={createMut.isPending}><Plus size={14}/>{createMut.isPending ? 'Adding...' : 'Add Test'}</button>
        </form>
        <p className="text-muted" style={{fontSize:12, marginTop:8}}>
          Note: Adding a test here does not set a price. Go to Price Assignments to assign it to a collaborator with a price.
        </p>
      </div>

      <div className="card">
        <div className="flex gap-2 items-center" style={{marginBottom:16}}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search tests..." />
          <span className="text-muted" style={{fontSize:13, whiteSpace:'nowrap'}}>{diagnostics.length} tests</span>
        </div>
        {isLoading ? <div className="empty-state"><div className="spinner"/></div>
        : !diagnostics.length ? <div className="empty-state">No tests yet. Add your first one above.</div>
        : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8}}>
            {diagnostics.map(d => (
              <div key={d.id} style={{background:'var(--bg)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:500, fontSize:13}}>{d.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteMut.mutate(d.id)} style={{padding:4, color:'var(--red)'}}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
