import { Search } from 'lucide-react'
export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-bar" style={{flex:1, minWidth:200}}>
      <Search />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
