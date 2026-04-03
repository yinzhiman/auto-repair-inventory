import axios from 'axios'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true,
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      return Promise.reject(error.response.data)
    }
    return Promise.reject({ message: '网络错误，请稍后重试' })
  }
)

export default request as {
  get<T = unknown>(url: string): Promise<ApiResponse<T>>
  post<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>>
  put<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>>
  delete<T = unknown>(url: string): Promise<ApiResponse<T>>
}
