import { ChevronLeft, ChevronRight } from 'lucide-react'
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button className="btn btn-sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}><ChevronLeft size={14} /></button>
      <span className="text-muted" style={{fontSize:13}}>Page {page} of {totalPages}</span>
      <button className="btn btn-sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}><ChevronRight size={14} /></button>
    </div>
  )
}
