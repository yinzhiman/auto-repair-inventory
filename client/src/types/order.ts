export interface OrderItem {
  id: number
  partId: number | null
  itemName: string
  type: 'part' | 'labor'
  quantity: number
  price: number
  amount: number
  part?: { id: number; name: string; stock: number } | null
}

export interface Order {
  id: number
  orderNo: string
  customerId: number
  vehicleId: number
  mileage: number | null
  status: 'pending' | 'completed' | 'cancelled'
  totalAmount: number
  paidAmount: number
  paymentType: 'cash' | 'wechat' | 'alipay' | 'member' | 'monthly' | null
  completedAt: string | null
  dueDate: string | null
  remark: string | null
  createdAt: string
  updatedAt: string
  customer: { id: number; name: string; phone: string }
  vehicle: { id: number; plateNumber: string; brand: string | null; model: string | null }
  items: OrderItem[]
}

export interface CustomerInput {
  id?: number
  name?: string
  phone?: string
}

export interface VehicleInput {
  id?: number
  plateNumber?: string
  brand?: string
  model?: string
}

export interface OrderItemInput {
  partId?: number | null
  itemName: string
  type: 'part' | 'labor'
  quantity?: number
  price?: number
}

export interface CreateOrderInput {
  customer: CustomerInput
  vehicle: VehicleInput
  mileage?: number
  items: OrderItemInput[]
  remark?: string
}

export interface UpdateOrderInput {
  items?: OrderItemInput[]
  mileage?: number
  remark?: string
}

export interface CompleteOrderInput {
  paymentType: 'cash' | 'wechat' | 'alipay' | 'member' | 'monthly'
  paidAmount?: number
}

export interface CancelOrderInput {
  returnStock: boolean
}

export interface OrderListQuery {
  keyword?: string
  status?: string
  customerId?: number
  vehicleId?: number
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface OrderListResponse {
  list: Order[]
  total: number
  page: number
  pageSize: number
}

export interface CreateOrderResponse {
  order: Order
  warnings?: string[]
}
