import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, fetchCsrf } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // null = not checked yet
  const [loading, setLoading] = useState(true) // true while checking session

  useEffect(() => {
    // On app load: get CSRF cookie then check if already logged in
    fetchCsrf()
      .then(() => getMe())
      .then(res => setUser(res.data))
      .catch(() => setUser(false))  // false = checked but not logged in
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
