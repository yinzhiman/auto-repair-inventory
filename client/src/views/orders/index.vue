<template>
  <Layout>
    <div class="order-page">
      <div class="page-header">
        <h1>维修工单</h1>
        <el-button
          type="primary"
          @click="handleAdd"
        >
          <el-icon><Plus /></el-icon>
          新建工单
        </el-button>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchParams.keyword"
          placeholder="搜索工单号/客户/车牌"
          clearable
          style="width: 200px"
          @keyup.enter="loadOrders"
        />
        <el-select
          v-model="searchParams.status"
          placeholder="工单状态"
          clearable
          style="width: 120px"
        >
          <el-option
            label="待处理"
            value="pending"
          />
          <el-option
            label="已完成"
            value="completed"
          />
          <el-option
            label="已取消"
            value="cancelled"
          />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 240px"
          @change="handleDateChange"
        />
        <el-button
          type="primary"
          @click="loadOrders"
        >
          搜索
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="orders"
        stripe
      >
        <el-table-column
          prop="orderNo"
          label="工单号"
          width="150"
        />
        <el-table-column
          label="客户"
          width="120"
        >
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="车辆"
          width="120"
        >
          <template #default="{ row }">
            {{ row.vehicle?.plateNumber || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="车型"
          min-width="120"
        >
          <template #default="{ row }">
            {{ row.vehicle?.brand }} {{ row.vehicle?.model }}
          </template>
        </el-table-column>
        <el-table-column
          prop="mileage"
          label="里程数"
          width="100"
        >
          <template #default="{ row }">
            {{ row.mileage ? `${row.mileage} km` : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="totalAmount"
          label="金额"
          width="100"
        >
          <template #default="{ row }">
            ¥{{ row.totalAmount?.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="statusMap[row.status].type"
              size="small"
            >
              {{ statusMap[row.status].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="创建时间"
          width="160"
        >
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="success"
              @click="handleComplete(row)"
            >
              结算
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingOrder ? '编辑工单' : '新建工单'"
      width="900px"
      top="5vh"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
      >
        <el-divider content-position="left">
          客户信息
        </el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="客户">
              <el-select
                v-model="formData.customerId"
                filterable
                clearable
                placeholder="选择已有客户"
                style="width: 100%"
                @change="handleCustomerChange"
              >
                <el-option
                  v-for="c in customerList"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="新客户名">
              <el-input
                v-model="formData.newCustomerName"
                placeholder="输入新客户名称"
                :disabled="!!formData.customerId"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="电话">
              <el-input
                v-model="formData.customerPhone"
                placeholder="客户电话"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          车辆信息
        </el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="已有车辆">
              <el-select
                v-model="formData.vehicleId"
                filterable
                clearable
                placeholder="选择已有车辆"
                style="width: 100%"
                :disabled="!formData.customerId"
                @change="handleVehicleChange"
              >
                <el-option
                  v-for="v in vehicleList"
                  :key="v.id"
                  :label="v.plateNumber"
                  :value="v.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="新车牌">
              <el-input
                v-model="formData.newPlateNumber"
                placeholder="输入新车牌号"
                :disabled="!!formData.vehicleId"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="品牌">
              <el-input
                v-model="formData.vehicleBrand"
                placeholder="车辆品牌"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="型号">
              <el-input
                v-model="formData.vehicleModel"
                placeholder="车辆型号"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="里程数">
              <el-input-number
                v-model="formData.mileage"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          维修项目
        </el-divider>

        <div class="items-section">
          <div
            v-for="(item, index) in formData.items"
            :key="index"
            class="item-row"
          >
            <el-select
              v-model="item.type"
              placeholder="类型"
              style="width: 100px"
              @change="handleItemTypeChange(index)"
            >
              <el-option
                label="配件"
                value="part"
              />
              <el-option
                label="工时"
                value="labor"
              />
            </el-select>
            <el-select
              v-if="item.type === 'part'"
              v-model="item.partId"
              filterable
              remote
              :remote-method="searchParts"
              placeholder="搜索配件"
              style="width: 200px"
              @change="handlePartSelect(index)"
            >
              <el-option
                v-for="p in partOptions"
                :key="p.id"
                :label="`${p.name} (库存: ${p.stock})`"
                :value="p.id"
              />
            </el-select>
            <el-input
              v-else
              v-model="item.itemName"
              placeholder="项目名称"
              style="width: 200px"
            />
            <el-input-number
              v-model="item.quantity"
              :min="1"
              :max="999"
              style="width: 120px"
              @change="calcAmount(index)"
            />
            <el-input-number
              v-model="item.price"
              :min="0"
              :precision="2"
              style="width: 120px"
              @change="calcAmount(index)"
            />
            <span class="amount">¥{{ item.amount?.toFixed(2) || '0.00' }}</span>
            <el-button
              type="danger"
              :icon="Delete"
              circle
              @click="removeItem(index)"
            />
          </div>
          <el-button
            type="primary"
            plain
            @click="addItem('part')"
          >
            + 添加配件
          </el-button>
          <el-button
            type="primary"
            plain
            @click="addItem('labor')"
          >
            + 添加工时
          </el-button>
        </div>

        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="备注信息"
          />
        </el-form-item>

        <div class="total-section">
          <span>合计金额：</span>
          <span class="total-amount">¥{{ totalAmount.toFixed(2) }}</span>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="工单详情"
      width="700px"
    >
      <el-descriptions
        :column="2"
        border
      >
        <el-descriptions-item label="工单号">
          {{ currentOrder?.orderNo }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusMap[currentOrder?.status || 'pending'].type">
            {{ statusMap[currentOrder?.status || 'pending'].label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="客户">
          {{ currentOrder?.customer?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="电话">
          {{ currentOrder?.customer?.phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="车牌">
          {{ currentOrder?.vehicle?.plateNumber }}
        </el-descriptions-item>
        <el-descriptions-item label="车型">
          {{ currentOrder?.vehicle?.brand }} {{ currentOrder?.vehicle?.model }}
        </el-descriptions-item>
        <el-descriptions-item label="里程数">
          {{ currentOrder?.mileage ? `${currentOrder.mileage} km` : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ new Date(currentOrder?.createdAt || '').toLocaleString() }}
        </el-descriptions-item>
        <el-descriptions-item
          label="备注"
          :span="2"
        >
          {{ currentOrder?.remark || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">
        维修项目
      </el-divider>
      <el-table
        :data="currentOrder?.items"
        stripe
        size="small"
      >
        <el-table-column
          prop="itemName"
          label="项目名称"
        />
        <el-table-column
          prop="type"
          label="类型"
          width="80"
        >
          <template #default="{ row }">
            {{ row.type === 'part' ? '配件' : '工时' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="quantity"
          label="数量"
          width="80"
        />
        <el-table-column
          prop="price"
          label="单价"
          width="100"
        >
          <template #default="{ row }">
            ¥{{ row.price?.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="amount"
          label="金额"
          width="100"
        >
          <template #default="{ row }">
            ¥{{ row.amount?.toFixed(2) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="detail-total">
        合计金额：<span class="total-amount">¥{{ currentOrder?.totalAmount?.toFixed(2) }}</span>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">
          关闭
        </el-button>
        <el-button
          type="primary"
          @click="handlePrint(currentOrder!)"
        >
          打印
        </el-button>
        <el-button
          v-if="currentOrder?.status === 'pending'"
          type="danger"
          @click="handleCancel(currentOrder!)"
        >
          取消工单
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="printDialogVisible"
      title="打印预览"
      width="800px"
      top="5vh"
    >
      <div
        ref="printContentRef"
        class="print-preview"
      >
        <div class="print-header">
          <h2>{{ printTemplate?.title || '维修结算单' }}</h2>
        </div>
        <div class="print-info">
          <div class="print-row">
            <span class="label">工单号：</span>
            <span class="value">{{ currentOrder?.orderNo }}</span>
          </div>
          <div class="print-row">
            <span class="label">日期：</span>
            <span class="value">{{ new Date(currentOrder?.createdAt || '').toLocaleDateString() }}</span>
          </div>
        </div>
        <div class="print-info">
          <div class="print-row">
            <span class="label">客户：</span>
            <span class="value">{{ currentOrder?.customer?.name }}</span>
          </div>
          <div class="print-row">
            <span class="label">电话：</span>
            <span class="value">{{ currentOrder?.customer?.phone || '-' }}</span>
          </div>
          <div class="print-row">
            <span class="label">车牌：</span>
            <span class="value">{{ currentOrder?.vehicle?.plateNumber }}</span>
          </div>
          <div class="print-row">
            <span class="label">车型：</span>
            <span class="value">{{ currentOrder?.vehicle?.brand }} {{ currentOrder?.vehicle?.model }}</span>
          </div>
          <div
            v-if="currentOrder?.mileage"
            class="print-row"
          >
            <span class="label">里程：</span>
            <span class="value">{{ currentOrder.mileage }} km</span>
          </div>
        </div>
        <table class="print-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>项目名称</th>
              <th>类型</th>
              <th>数量</th>
              <th>单价</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in currentOrder?.items"
              :key="index"
            >
              <td>{{ index + 1 }}</td>
              <td>{{ item.itemName }}</td>
              <td>{{ item.type === 'part' ? '配件' : '工时' }}</td>
              <td>{{ item.quantity }}</td>
              <td>¥{{ item.price?.toFixed(2) }}</td>
              <td>¥{{ item.amount?.toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td
                colspan="5"
                style="text-align: right; font-weight: bold;"
              >
                合计：
              </td>
              <td style="font-weight: bold; color: #f56c6c;">
                ¥{{ currentOrder?.totalAmount?.toFixed(2) }}
              </td>
            </tr>
          </tfoot>
        </table>
        <div
          v-if="currentOrder?.remark"
          class="print-footer"
        >
          <span class="label">备注：</span>
          <span class="value">{{ currentOrder.remark }}</span>
        </div>
        <div class="print-sign">
          <div class="sign-item">
            <span>客户签字：</span>
            <span class="sign-line" />
          </div>
          <div class="sign-item">
            <span>维修人员：</span>
            <span class="sign-line" />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="printDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="doPrint"
        >
          确认打印
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="completeDialogVisible"
      title="结算工单"
      width="450px"
    >
      <el-form
        ref="completeFormRef"
        :model="completeData"
        :rules="completeRules"
        label-width="80px"
      >
        <el-form-item label="应付金额">
          <span class="total-amount">¥{{ currentOrder?.totalAmount?.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item
          label="支付方式"
          prop="paymentType"
        >
          <el-select
            v-model="completeData.paymentType"
            style="width: 100%"
          >
            <el-option
              label="现金"
              value="cash"
            />
            <el-option
              label="微信"
              value="wechat"
            />
            <el-option
              label="支付宝"
              value="alipay"
            />
            <el-option
              label="会员储值"
              value="member"
            />
            <el-option
              label="月结"
              value="monthly"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="实付金额">
          <el-input-number
            v-model="completeData.paidAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleCompleteSubmit"
        >
          确认结算
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import Layout from '@/layout/index.vue'
import { orderApi } from '@/api/order'
import { partApi } from '@/api/part'
import { printTemplateApi } from '@/api/print-template'
import type { Order, OrderItemInput } from '@/types/order'
import type { Part as PartType } from '@/types/part'

const statusMap: Record<string, { label: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
  pending: { label: '待处理', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'info' },
}

const loading = ref(false)
const submitting = ref(false)
const orders = ref<Order[]>([])

const searchParams = reactive({
  keyword: '',
  status: '',
  startDate: '',
  endDate: '',
})

const dateRange = ref<[string, string] | null>(null)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const dialogVisible = ref(false)
const editingOrder = ref<Order | null>(null)
const formRef = ref<FormInstance>()

interface ItemFormData {
  partId: number | null
  itemName: string
  type: 'part' | 'labor'
  quantity: number
  price: number
  amount: number
}

const formData = reactive({
  customerId: null as number | null,
  newCustomerName: '',
  customerPhone: '',
  vehicleId: null as number | null,
  newPlateNumber: '',
  vehicleBrand: '',
  vehicleModel: '',
  mileage: null as number | null,
  items: [] as ItemFormData[],
  remark: '',
})

const formRules: FormRules = {
  customer: [{ required: true, message: '请选择客户', trigger: 'change' }],
  vehicle: [{ required: true, message: '请选择车辆', trigger: 'change' }],
}

const customerList = ref<{ id: number; name: string; phone: string }[]>([])
const vehicleList = ref<{ id: number; plateNumber: string; brand: string | null; model: string | null }[]>([])
const partOptions = ref<PartType[]>([])

const totalAmount = computed(() => {
  return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0)
})

const detailDialogVisible = ref(false)
const currentOrder = ref<Order | null>(null)

const printDialogVisible = ref(false)
const printContentRef = ref<HTMLElement | null>(null)
const printTemplate = ref<{ title?: string } | null>(null)

const completeDialogVisible = ref(false)
const completeFormRef = ref<FormInstance>()
const completeData = reactive({
  paymentType: 'cash' as 'cash' | 'wechat' | 'alipay' | 'member' | 'monthly',
  paidAmount: 0,
})

const completeRules: FormRules = {
  paymentType: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
}

const handleDateChange = (val: [string, string] | null) => {
  if (val) {
    searchParams.startDate = val[0]
    searchParams.endDate = val[1]
  } else {
    searchParams.startDate = ''
    searchParams.endDate = ''
  }
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await orderApi.getList({
      ...searchParams,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    if (res.success && res.data) {
      orders.value = res.data.list
      pagination.total = res.data.total
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  editingOrder.value = null
  Object.assign(formData, {
    customerId: null,
    newCustomerName: '',
    customerPhone: '',
    vehicleId: null,
    newPlateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    mileage: null,
    items: [],
    remark: '',
  })
  loadCustomers()
  dialogVisible.value = true
}

const handleEdit = (order: Order) => {
  editingOrder.value = order
  Object.assign(formData, {
    customerId: order.customerId,
    customerPhone: order.customer?.phone || '',
    vehicleId: order.vehicleId,
    newPlateNumber: '',
    vehicleBrand: order.vehicle?.brand || '',
    vehicleModel: order.vehicle?.model || '',
    mileage: order.mileage,
    items: order.items.map((item) => ({
      partId: item.partId,
      itemName: item.itemName,
      type: item.type as 'part' | 'labor',
      quantity: item.quantity,
      price: item.price,
      amount: item.amount,
    })),
    remark: order.remark || '',
  })
  loadCustomers()
  loadVehicles(order.customerId)
  dialogVisible.value = true
}

const handleView = async (order: Order) => {
  try {
    const res = await orderApi.getDetail(order.id)
    if (res.success && res.data) {
      currentOrder.value = res.data
      detailDialogVisible.value = true
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载详情失败')
  }
}

const handleComplete = (order: Order) => {
  currentOrder.value = order
  completeData.paymentType = 'cash'
  completeData.paidAmount = order.totalAmount
  completeDialogVisible.value = true
}

const handleCompleteSubmit = async () => {
  if (!currentOrder.value) return

  const valid = await completeFormRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const res = await orderApi.complete(currentOrder.value.id, completeData)
    if (res.success) {
      ElMessage.success('结算成功')
      completeDialogVisible.value = false
      detailDialogVisible.value = false
      loadOrders()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '结算失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = async (order: Order) => {
  try {
    let returnStock = true
    try {
      await ElMessageBox.confirm('是否将配件退回库存？', '取消工单', {
        confirmButtonText: '退回库存',
        cancelButtonText: '不退回',
        distinguishCancelAndClose: true,
        type: 'warning',
      })
      returnStock = true
    } catch (action: any) {
      if (action === 'cancel') {
        returnStock = false
      } else {
        return
      }
    }

    const res = await orderApi.cancel(order.id, { returnStock })
    if (res.success) {
      ElMessage.success('工单已取消')
      detailDialogVisible.value = false
      loadOrders()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '取消失败')
  }
}

const handlePrint = async (_order: Order) => {
  try {
    const res = await printTemplateApi.getDefault('repair')
    if (res.data) {
      try {
        printTemplate.value = JSON.parse(res.data.content)
      } catch {
        printTemplate.value = { title: '维修结算单' }
      }
    }
  } catch {
    printTemplate.value = { title: '维修结算单' }
  }
  printDialogVisible.value = true
}

const doPrint = () => {
  const printContent = printContentRef.value
  if (!printContent) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.error('无法打开打印窗口，请检查浏览器设置')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>维修结算单</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
        .print-header { text-align: center; margin-bottom: 20px; }
        .print-header h2 { font-size: 20px; }
        .print-info { display: flex; flex-wrap: wrap; margin-bottom: 15px; }
        .print-row { width: 50%; padding: 5px 0; display: flex; }
        .print-row .label { width: 80px; color: #666; }
        .print-row .value { flex: 1; }
        .print-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        .print-table th { background: #f5f5f5; }
        .print-footer { margin-bottom: 15px; }
        .print-footer .label { color: #666; }
        .print-sign { display: flex; justify-content: space-between; margin-top: 40px; }
        .sign-item { width: 45%; }
        .sign-line { display: inline-block; width: 150px; border-bottom: 1px solid #333; margin-left: 10px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${printContent.innerHTML}
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
  printDialogVisible.value = false
}

const loadCustomers = async () => {
  try {
    const res = await fetch('/api/customers', { credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      customerList.value = data.data || []
    }
  } catch {
    customerList.value = []
  }
}

const loadVehicles = async (customerId: number) => {
  try {
    const res = await fetch(`/api/customers/${customerId}/vehicles`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      vehicleList.value = data.data || []
    }
  } catch {
    vehicleList.value = []
  }
}

const handleCustomerChange = (id: number) => {
  const customer = customerList.value.find((c) => c.id === id)
  if (customer) {
    formData.customerPhone = customer.phone || ''
    loadVehicles(id)
  }
  formData.vehicleId = null
}

const handleVehicleChange = (id: number) => {
  const vehicle = vehicleList.value.find((v) => v.id === id)
  if (vehicle) {
    formData.vehicleBrand = vehicle.brand || ''
    formData.vehicleModel = vehicle.model || ''
  }
}

const searchParts = async (keyword: string) => {
  if (!keyword) {
    partOptions.value = []
    return
  }
  try {
    const res = await partApi.getList({ keyword, pageSize: 20 })
    if (res.success && res.data) {
      partOptions.value = res.data.list
    }
  } catch {
    partOptions.value = []
  }
}

const handleItemTypeChange = (index: number) => {
  const item = formData.items[index]
  item.partId = null
  item.itemName = ''
  item.price = 0
  item.amount = 0
}

const handlePartSelect = (index: number) => {
  const item = formData.items[index]
  const part = partOptions.value.find((p) => p.id === item.partId)
  if (part) {
    item.itemName = part.name
    item.price = part.sellPrice
    calcAmount(index)
  }
}

const calcAmount = (index: number) => {
  const item = formData.items[index]
  item.amount = (item.quantity || 0) * (item.price || 0)
}

const addItem = (type: 'part' | 'labor') => {
  formData.items.push({
    partId: null,
    itemName: '',
    type,
    quantity: 1,
    price: 0,
    amount: 0,
  })
}

const removeItem = (index: number) => {
  formData.items.splice(index, 1)
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return

  if (formData.items.length === 0) {
    ElMessage.warning('请添加至少一个维修项目')
    return
  }

  if (!formData.customerId && !formData.newCustomerName) {
    ElMessage.warning('请选择已有客户或输入新客户名称')
    return
  }

  if (!formData.vehicleId && !formData.newPlateNumber) {
    ElMessage.warning('请选择已有车辆或输入新车牌号')
    return
  }

  submitting.value = true
  try {
    const inputItems: OrderItemInput[] = formData.items.map((item) => ({
      partId: item.partId,
      itemName: item.itemName,
      type: item.type,
      quantity: item.quantity,
      price: item.price,
    }))

    const data = {
      customer: formData.customerId
        ? { id: formData.customerId, phone: formData.customerPhone }
        : { name: formData.newCustomerName, phone: formData.customerPhone },
      vehicle: formData.vehicleId
        ? { id: formData.vehicleId }
        : {
            plateNumber: formData.newPlateNumber,
            brand: formData.vehicleBrand,
            model: formData.vehicleModel,
          },
      mileage: formData.mileage || undefined,
      items: inputItems,
      remark: formData.remark || undefined,
    }

    if (editingOrder.value) {
      const res = await orderApi.update(editingOrder.value.id, {
        items: inputItems,
        mileage: formData.mileage || undefined,
        remark: formData.remark || undefined,
      })
      if (res.success) {
        ElMessage.success('修改成功')
        dialogVisible.value = false
        loadOrders()
      }
    } else {
      const res = await orderApi.create(data)
      if (res.success) {
        if (res.data?.warnings?.length) {
          ElMessage.warning(res.data.warnings.join('\n'))
        } else {
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadOrders()
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.order-page {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.items-section {
  margin-bottom: 20px;
}

.item-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.amount {
  width: 80px;
  text-align: right;
  font-weight: 600;
  color: #409eff;
}

.total-section {
  text-align: right;
  padding: 10px 0;
  font-size: 16px;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #f56c6c;
}

.detail-total {
  text-align: right;
  padding: 16px 0;
  font-size: 16px;
}

.print-preview {
  background: #fff;
  padding: 20px;
}

.print-header {
  text-align: center;
  margin-bottom: 20px;
}

.print-header h2 {
  margin: 0;
  font-size: 20px;
}

.print-info {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.print-row {
  width: 50%;
  padding: 5px 0;
  display: flex;
}

.print-row .label {
  width: 80px;
  color: #666;
}

.print-row .value {
  flex: 1;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.print-table th,
.print-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.print-table th {
  background: #f5f5f5;
}

.print-footer {
  margin-bottom: 15px;
}

.print-footer .label {
  color: #666;
}

.print-sign {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
}

.sign-item {
  width: 45%;
}

.sign-line {
  display: inline-block;
  width: 150px;
  border-bottom: 1px solid #333;
  margin-left: 10px;
}
</style>
