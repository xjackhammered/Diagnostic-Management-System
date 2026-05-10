import axios from 'axios'
import toast from 'react-hot-toast'

const collabApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

collabApi.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; csrftoken=`)
    if (parts.length === 2) {
      config.headers['X-CSRFToken'] = parts.pop().split(';').shift()
    }
  }
  return config
})

collabApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) toast.error('Cannot connect to server.')
    return Promise.reject(err)
  }
)

export const collabLogin         = (data) => collabApi.post('/collaborator/login/', data)
export const collabLogout        = ()     => collabApi.post('/collaborator/logout/')
export const collabMe            = ()     => collabApi.get('/collaborator/me/')
export const collabGetBookings   = (params) => collabApi.get('/collaborator/bookings/', { params })
export const collabMarkComplete  = (id)  => collabApi.post(`/collaborator/bookings/${id}/complete/`)
export const collabUnmarkComplete = (id) => collabApi.delete(`/collaborator/bookings/${id}/complete/`)
export const collabDownloadPDF   = async (bookingId, filename) => {
  const response = await collabApi.get(`/bookings/${bookingId}/pdf/`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename || `${bookingId}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default collabApi
