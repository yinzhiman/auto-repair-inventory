export interface OrderItemInput {
  partId?: number | null
  itemName: string
  type: 'part' | 'labor'
  quantity?: number
  price?: number
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
