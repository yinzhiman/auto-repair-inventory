import request from '@/utils/request'
import type {
  Order,
  OrderListQuery,
  OrderListResponse,
  CreateOrderInput,
  UpdateOrderInput,
  CompleteOrderInput,
  CancelOrderInput,
} from '@/types/order'

export interface MonthlyDueOrder {
  id: number
  orderNo: string
  customerId: number
  totalAmount: number
  paidAmount: number
  dueDate: string
  customer: { id: number; name: string; phone: string }
}

export const orderApi = {
  getList: (params?: OrderListQuery) => {
    const searchParams = new URLSearchParams()
    if (params?.keyword) searchParams.set('keyword', params.keyword)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.customerId) searchParams.set('customerId', String(params.customerId))
    if (params?.vehicleId) searchParams.set('vehicleId', String(params.vehicleId))
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    return request.get<OrderListResponse>(`/orders?${searchParams.toString()}`)
  },

  getDetail: (id: number) => request.get<Order>(`/orders/${id}`),

  create: (data: CreateOrderInput) => request.post<{ order: Order; warnings?: string[] }>('/orders', data),

  update: (id: number, data: UpdateOrderInput) => request.put<Order>(`/orders/${id}`, data),

  complete: (id: number, data: CompleteOrderInput) =>
    request.post<Order>(`/orders/${id}/complete`, data),

  cancel: (id: number, data: CancelOrderInput) =>
    request.post<{ order: Order; returnedStock: { partId: number; partName: string; quantity: number }[] }>(
      `/orders/${id}/cancel`,
      data
    ),

  getMonthlyDue: (date?: string) => {
    const params = date ? `?date=${date}` : ''
    return request.get<{ list: MonthlyDueOrder[]; total: number }>(`/orders/monthly-due${params}`)
  },
}
