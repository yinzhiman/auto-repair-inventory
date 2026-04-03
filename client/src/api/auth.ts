import request from '@/utils/request'

export interface LoginParams {
  account: string
  password: string
}

export interface UserInfo {
  id: number
  username: string
  phone: string | null
  name: string
  role: string
}

export const authApi = {
  login: (params: LoginParams) =>
    request.post<UserInfo>('/auth/login', params),

  logout: () => request.post('/auth/logout'),

  me: () => request.get<UserInfo>('/auth/me'),
}
