import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // send session cookie + CSRF cookie on every request
})

// Attach CSRF token to every mutating request
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const csrfToken = getCookie('csrftoken')
    if (csrfToken) config.headers['X-CSRFToken'] = csrfToken
  }
  return config
})

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

// Global error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Cannot connect to server. Is Django running on port 8000?')
    } else if (error.response.status === 500) {
      toast.error('Server error (500). Check your Django terminal for details.')
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────
export const fetchCsrf    = ()       => api.get('/auth/csrf/')
export const loginUser    = (data)   => api.post('/auth/login/', data)
export const logoutUser   = ()       => api.post('/auth/logout/')
export const getMe        = ()       => api.get('/auth/me/')

// ── Patients ──────────────────────────────────────────────
export const getPatients      = (params) => api.get('/patients/', { params })
export const getPatient       = (id)     => api.get(`/patients/${id}/`)
export const createPatient    = (data)   => api.post('/patients/', data)
export const updatePatient    = (id, data) => api.patch(`/patients/${id}/`, data)
export const deletePatient    = (id)     => api.delete(`/patients/${id}/`)
export const getPatientFollowup = (id)   => api.get(`/patients/${id}/followup/`)

// ── Doctors ───────────────────────────────────────────────
export const getDoctors    = (params)    => api.get('/doctors/', { params })
export const createDoctor  = (data)      => api.post('/doctors/', data)
export const updateDoctor  = (id, data)  => api.patch(`/doctors/${id}/`, data)
export const deleteDoctor  = (id)        => api.delete(`/doctors/${id}/`)

// ── Collaborators ─────────────────────────────────────────
export const getCollaborators    = (params)   => api.get('/collaborators/', { params })
export const createCollaborator  = (data)     => api.post('/collaborators/', data)
export const updateCollaborator  = (id, data) => api.patch(`/collaborators/${id}/`, data)
export const deleteCollaborator  = (id)       => api.delete(`/collaborators/${id}/`)

// ── Diagnostics ───────────────────────────────────────────
export const getDiagnostics    = (params) => api.get('/diagnostics/', { params })
export const createDiagnostic  = (data)   => api.post('/diagnostics/', data)
export const deleteDiagnostic  = (id)     => api.delete(`/diagnostics/${id}/`)

// ── Collaborator Tests ────────────────────────────────────
export const getCollaboratorTests    = (params)   => api.get('/collaborator-tests/', { params })
export const createCollaboratorTest  = (data)     => api.post('/collaborator-tests/', data)
export const updateCollaboratorTest  = (id, data) => api.patch(`/collaborator-tests/${id}/`, data)
export const deleteCollaboratorTest  = (id)       => api.delete(`/collaborator-tests/${id}/`)

// ── Bookings ──────────────────────────────────────────────
export const getBookings  = (params) => api.get('/bookings/', { params })
export const getBooking   = (id)     => api.get(`/bookings/${id}/`)
export const createBooking = (data)  => api.post('/bookings/', data)
export const getStats     = ()       => api.get('/bookings/stats/')

export const downloadBookingPDF = async (bookingId, filename) => {
  const response = await api.get(`/bookings/${bookingId}/pdf/`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename || `${bookingId}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api