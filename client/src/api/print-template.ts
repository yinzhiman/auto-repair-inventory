import request from '@/utils/request'

export interface PrintTemplate {
  id: number
  name: string
  type: string
  content: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePrintTemplateInput {
  name: string
  type?: string
  content?: string
  isDefault?: boolean
}

export interface UpdatePrintTemplateInput {
  name?: string
  type?: string
  content?: string
  isDefault?: boolean
}

export const printTemplateApi = {
  getList: (type?: string) => {
    const params = type ? `?type=${type}` : ''
    return request.get<{ list: PrintTemplate[]; total: number }>(`/print-templates${params}`)
  },

  getById: (id: number) => request.get<PrintTemplate>(`/print-templates/${id}`),

  getDefault: (type: string) => request.get<PrintTemplate>(`/print-templates/default?type=${type}`),

  create: (data: CreatePrintTemplateInput) => request.post<PrintTemplate>('/print-templates', data),

  update: (id: number, data: UpdatePrintTemplateInput) =>
    request.put<PrintTemplate>(`/print-templates/${id}`, data),

  delete: (id: number) => request.delete<{ message: string }>(`/print-templates/${id}`),
}
