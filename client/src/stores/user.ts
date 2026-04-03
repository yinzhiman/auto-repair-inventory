import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type UserInfo } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(null)
  const isLoggedIn = ref(false)

  const login = async (account: string, password: string) => {
    try {
      const res = await authApi.login({ account, password })
      if (res.success && res.data) {
        user.value = res.data
        isLoggedIn.value = true
        return { success: true }
      }
      return { success: false, message: res.message || '登录失败' }
    } catch (error: any) {
      return { success: false, message: error.message || '登录失败' }
    }
  }

  const logout = async () => {
    await authApi.logout()
    user.value = null
    isLoggedIn.value = false
  }

  const fetchUser = async () => {
    try {
      const res = await authApi.me()
      if (res.success && res.data) {
        user.value = res.data
        isLoggedIn.value = true
      }
    } catch {
      user.value = null
      isLoggedIn.value = false
    }
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
    fetchUser,
  }
})
