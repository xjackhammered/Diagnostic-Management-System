import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { getBookings, downloadBookingPDF } from '../api'
import SearchBar from '../components/SearchBar'
import toast from 'react-hot-toast'

export default function BookingHistory() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [collaboratorFilter, setCollaboratorFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { page, search, serviceFilter, collaboratorFilter }],
    queryFn: () => getBookings({
      page,
      search: search || undefined,
      service_type: serviceFilter || undefined,
      collaborator: collaboratorFilter || undefined,
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }

  const handleDownload = async (b) => {
    try { await downloadBookingPDF(b.id, `${b.booking_id}_${b.patient_name.replace(/\s+/g,'_')}.pdf`) }
    catch { toast.error('Failed to download PDF') }
  }

  const bookings = data?.results || []
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>All Bookings</h2><p>View and download past booking receipts</p></div>
      </div>

      <div className="card">
        <div className="flex gap-2 items-center" style={{marginBottom:16, flexWrap:'wrap'}}>
          <form onSubmit={handleSearch} className="flex gap-2" style={{flex:1, minWidth:200}}>
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search patient, phone, booking ID..." />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <select value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setPage(1) }} style={{width:130}}>
            <option value="">All Services</option>
            <option value="center">Center</option>
            <option value="home">Home</option>
          </select>
        </div>

        {isLoading ? <div className="empty-state"><div className="spinner"/></div>
        : !bookings.length ? <div className="empty-state">No bookings found.</div>
        : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Patient</th><th>Collaborator</th><th>Doctor</th>
                    <th>Tests</th><th>Service</th><th>Total</th><th>Scheduled</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td><span className="badge badge-blue">{b.booking_id}</span></td>
                      <td><strong>{b.patient_name}</strong></td>
                      <td>{b.collaborator_name}</td>
                      <td className="text-muted">{b.doctor_name || '—'}</td>
                      <td>
                        <span title={b.items?.map(i => i.test_name).join(', ')}>
                          {b.items?.length} test{b.items?.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td><span className={`badge ${b.service_type==='home'?'badge-green':'badge-blue'}`}>{b.service_type==='home'?'Home':'Center'}</span></td>
                      <td>
                        <div className="text-green fw-600">৳{Number(b.grand_total).toLocaleString()}</div>
                        {Number(b.discount_amount) > 0 && <div style={{fontSize:11, color:'var(--red)'}}>-৳{Number(b.discount_amount).toLocaleString()} off</div>}
                      </td>
                      <td className="text-muted" style={{whiteSpace:'nowrap'}}>
                        {new Date(b.scheduled_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                        <div style={{fontSize:11}}>{new Date(b.scheduled_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
                      </td>
                      <td><button className="btn btn-sm" onClick={() => handleDownload(b)} title="Download PDF"><Download size={13}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-sm" onClick={() => setPage(p => p-1)} disabled={page===1}><ChevronLeft size={14}/></button>
                <span style={{fontSize:13}} className="text-muted">Page {page} of {totalPages}</span>
                <button className="btn btn-sm" onClick={() => setPage(p => p+1)} disabled={page===totalPages}><ChevronRight size={14}/></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
