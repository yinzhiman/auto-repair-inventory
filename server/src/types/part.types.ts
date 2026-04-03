export interface Part {
  id: number
  name: string
  category: string | null
  spec: string | null
  unit: string | null
  costPrice: number
  sellPrice: number
  stock: number
  minStock: number
  supplierId: number | null
  supplier?: { id: number; name: string } | null
  isLowStock: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreatePartInput {
  name: string
  category?: string
  spec?: string
  unit?: string
  costPrice?: number
  sellPrice?: number
  minStock?: number
  supplierId?: number
}

export interface UpdatePartInput {
  name?: string
  category?: string
  spec?: string
  unit?: string
  costPrice?: number
  sellPrice?: number
  minStock?: number
  supplierId?: number
}

export interface PartListQuery {
  keyword?: string
  category?: string
  supplierId?: number
  lowStock?: boolean
  page?: number
  pageSize?: number
}

export interface PartListResponse {
  list: Part[]
  total: number
  page: number
  pageSize: number
}

export interface StockLog {
  id: number
  partId: number
  type: 'in' | 'out'
  source?: 'purchase' | 'customer' | 'initial' | 'used' | 'other'
  outType?: 'repair' | 'return' | 'damage' | 'other'
  quantity: number
  costPrice?: number
  reason?: string
  orderId?: number
  supplierId?: number
  supplier?: { id: number; name: string } | null
  order?: { id: number; orderNo: string } | null
  createdAt: Date
}

export interface StockInInput {
  source: 'purchase' | 'customer' | 'initial' | 'used' | 'other'
  quantity: number
  costPrice?: number
  supplierId?: number
  reason?: string
}

export interface StockOutInput {
  outType: 'repair' | 'return' | 'damage' | 'other'
  quantity: number
  orderId?: number
  reason?: string
}

export interface StockLogListQuery {
  page?: number
  pageSize?: number
}

export interface StockLogListResponse {
  list: StockLog[]
  total: number
  page: number
  pageSize: number
}

export interface LowStockPart {
  id: number
  name: string
  category: string | null
  stock: number
  minStock: number
  shortage: number
}

export interface LowStockResponse {
  list: LowStockPart[]
  total: number
}
