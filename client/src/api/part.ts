import request from '@/utils/request'
import type {
  Part,
  CreatePartInput,
  UpdatePartInput,
  PartListQuery,
  PartListResponse,
  StockLog,
  StockInInput,
  StockOutInput,
  StockLogListQuery,
  StockLogListResponse,
  LowStockResponse,
} from '@/types/part'

export const partApi = {
  getList: (params?: PartListQuery) =>
    request.get<PartListResponse>(`/parts?${new URLSearchParams(params as Record<string, string>).toString()}`),

  getDetail: (id: number) => request.get<Part>(`/parts/${id}`),

  create: (data: CreatePartInput) => request.post<Part>('/parts', data),

  update: (id: number, data: UpdatePartInput) =>
    request.put<Part>(`/parts/${id}`, data),

  delete: (id: number) => request.delete(`/parts/${id}`),

  stockIn: (id: number, data: StockInInput) =>
    request.post<StockLog>(`/parts/${id}/stock-in`, data),

  stockOut: (id: number, data: StockOutInput) =>
    request.post<StockLog>(`/parts/${id}/stock-out`, data),

  getStockLogs: (id: number, params?: StockLogListQuery) =>
    request.get<StockLogListResponse>(
      `/parts/${id}/stock-logs?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  getLowStock: (limit?: number) =>
    request.get<LowStockResponse>(`/parts/low-stock${limit ? `?limit=${limit}` : ''}`),
}
