<template>
  <Layout>
    <div class="inventory-page">
      <div class="page-header">
        <h1>库存管理</h1>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增配件
        </el-button>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchParams.keyword"
          placeholder="搜索配件名称/规格"
          clearable
          style="width: 200px"
          @keyup.enter="loadParts"
        />
        <el-select v-model="searchParams.category" placeholder="选择分类" clearable style="width: 150px">
          <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
        </el-select>
        <el-checkbox v-model="searchParams.lowStock" @change="loadParts">仅显示库存预警</el-checkbox>
        <el-button type="primary" @click="loadParts">搜索</el-button>
      </div>

      <el-table :data="parts" v-loading="loading" stripe>
        <el-table-column prop="name" label="配件名称" min-width="150">
          <template #default="{ row }">
            <span :class="{ 'low-stock-text': row.isLowStock }">{{ row.name }}</span>
            <el-tag v-if="row.isLowStock" type="danger" size="small" style="margin-left: 8px">库存不足</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="costPrice" label="成本价" width="100">
          <template #default="{ row }">¥{{ row.costPrice?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="sellPrice" label="销售价" width="100">
          <template #default="{ row }">¥{{ row.sellPrice?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100">
          <template #default="{ row }">
            <span :class="{ 'low-stock-text': row.isLowStock }">{{ row.stock }}</span>
            <span v-if="row.minStock > 0" class="min-stock">/{{ row.minStock }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleStockLog(row)">流水</el-button>
            <el-button size="small" @click="handleStockIn(row)">入库</el-button>
            <el-button size="small" @click="handleStockOut(row)">出库</el-button>
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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
          @size-change="loadParts"
          @current-change="loadParts"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingPart ? '编辑配件' : '新增配件'" width="500px">
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入配件名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="formData.category" placeholder="如：滤芯类、刹车系统" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="formData.spec" placeholder="如：OC 47" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="formData.unit" placeholder="如：个、升" />
        </el-form-item>
        <el-form-item label="成本价">
          <el-input-number v-model="formData.costPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="销售价">
          <el-input-number v-model="formData.sellPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最低库存">
          <el-input-number v-model="formData.minStock" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stockInDialogVisible" title="配件入库" width="450px">
      <el-form :model="stockInData" :rules="stockInRules" ref="stockInFormRef" label-width="80px">
        <el-form-item label="入库类型" prop="source">
          <el-select v-model="stockInData.source" style="width: 100%">
            <el-option label="采购入库" value="purchase" />
            <el-option label="客户自带" value="customer" />
            <el-option label="期初库存" value="initial" />
            <el-option label="二手再利用" value="used" />
            <el-option label="其他入库" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="stockInData.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="stockInData.source === 'purchase'" label="成本价">
          <el-input-number v-model="stockInData.costPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockInData.reason" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockInDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStockInSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stockOutDialogVisible" title="配件出库" width="450px">
      <el-form :model="stockOutData" :rules="stockOutRules" ref="stockOutFormRef" label-width="80px">
        <el-form-item label="出库类型" prop="outType">
          <el-select v-model="stockOutData.outType" style="width: 100%">
            <el-option label="维修领用" value="repair" />
            <el-option label="退货出库" value="return" />
            <el-option label="报损出库" value="damage" />
            <el-option label="其他出库" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="stockOutData.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="stockOutData.outType === 'damage'" label="原因" prop="reason">
          <el-input v-model="stockOutData.reason" type="textarea" :rows="2" placeholder="请填写报损原因" />
        </el-form-item>
        <el-form-item v-else label="备注">
          <el-input v-model="stockOutData.reason" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockOutDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStockOutSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stockLogDialogVisible" :title="`${stockLogPartName} - 库存流水`" width="700px">
      <el-table :data="stockLogList" v-loading="stockLogLoading" stripe size="small">
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'in' ? 'success' : 'danger'" size="small">
              {{ row.type === 'in' ? '入库' : '出库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源/类型" width="100">
          <template #default="{ row }">
            <span v-if="row.type === 'in'">{{ sourceMap[row.source || ''] || row.source }}</span>
            <span v-else>{{ outTypeMap[row.outType || ''] || row.outType }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80">
          <template #default="{ row }">
            <span :class="row.type === 'in' ? 'stock-in-text' : 'stock-out-text'">
              {{ row.type === 'in' ? '+' : '-' }}{{ row.quantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="costPrice" label="成本价" width="80">
          <template #default="{ row }">
            <span v-if="row.costPrice">¥{{ row.costPrice.toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="备注" min-width="120">
          <template #default="{ row }">
            {{ row.reason || '-' }}
          </template>
        </el-table-column>
      </el-table>
      <div class="stock-log-pagination">
        <el-pagination
          v-model:current-page="stockLogPagination.page"
          v-model:page-size="stockLogPagination.pageSize"
          :total="stockLogPagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, prev, pager, next"
          small
          @current-change="loadStockLogs"
        />
      </div>
      <template #footer>
        <el-button @click="stockLogDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import Layout from '@/layout/index.vue'
import { partApi } from '@/api/part'
import type { Part, CreatePartInput, StockInInput, StockOutInput, StockLog } from '@/types/part'

const route = useRoute()

const loading = ref(false)
const submitting = ref(false)
const parts = ref<Part[]>([])
const categories = computed(() => {
  const cats = new Set(parts.value.map((p) => p.category).filter(Boolean))
  return Array.from(cats)
})

const searchParams = reactive({
  keyword: '',
  category: '',
  lowStock: false,
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const dialogVisible = ref(false)
const editingPart = ref<Part | null>(null)
const formRef = ref<FormInstance>()
const formData = reactive<CreatePartInput>({
  name: '',
  category: '',
  spec: '',
  unit: '',
  costPrice: 0,
  sellPrice: 0,
  minStock: 0,
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入配件名称', trigger: 'blur' }],
}

const stockInDialogVisible = ref(false)
const stockInFormRef = ref<FormInstance>()
const stockInPartId = ref<number>(0)
const stockInData = reactive<StockInInput & { reason?: string }>({
  source: 'purchase',
  quantity: 1,
  costPrice: 0,
  reason: '',
})

const stockInRules: FormRules = {
  source: [{ required: true, message: '请选择入库类型', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

const stockOutDialogVisible = ref(false)
const stockOutFormRef = ref<FormInstance>()
const stockOutPartId = ref<number>(0)
const stockOutData = reactive<StockOutInput & { reason?: string }>({
  outType: 'repair',
  quantity: 1,
  reason: '',
})

const stockOutRules: FormRules = {
  outType: [{ required: true, message: '请选择出库类型', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

const loadParts = async () => {
  loading.value = true
  try {
    const res = await partApi.getList({
      ...searchParams,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    if (res.success && res.data) {
      parts.value = res.data.list
      pagination.total = res.data.total
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  editingPart.value = null
  Object.assign(formData, {
    name: '',
    category: '',
    spec: '',
    unit: '',
    costPrice: 0,
    sellPrice: 0,
    minStock: 0,
  })
  dialogVisible.value = true
}

const handleEdit = (part: Part) => {
  editingPart.value = part
  Object.assign(formData, {
    name: part.name,
    category: part.category || '',
    spec: part.spec || '',
    unit: part.unit || '',
    costPrice: part.costPrice,
    sellPrice: part.sellPrice,
    minStock: part.minStock,
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    if (editingPart.value) {
      const res = await partApi.update(editingPart.value.id, formData)
      if (res.success) {
        ElMessage.success('修改成功')
        dialogVisible.value = false
        loadParts()
      }
    } else {
      const res = await partApi.create(formData)
      if (res.success) {
        ElMessage.success('新增成功')
        dialogVisible.value = false
        loadParts()
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (part: Part) => {
  try {
    await ElMessageBox.confirm(`确定要删除配件"${part.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const res = await partApi.delete(part.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadParts()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleStockIn = (part: Part) => {
  stockInPartId.value = part.id
  Object.assign(stockInData, {
    source: 'purchase',
    quantity: 1,
    costPrice: part.costPrice,
    reason: '',
  })
  stockInDialogVisible.value = true
}

const handleStockInSubmit = async () => {
  const valid = await stockInFormRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const res = await partApi.stockIn(stockInPartId.value, stockInData)
    if (res.success) {
      ElMessage.success('入库成功')
      stockInDialogVisible.value = false
      loadParts()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '入库失败')
  } finally {
    submitting.value = false
  }
}

const handleStockOut = (part: Part) => {
  stockOutPartId.value = part.id
  Object.assign(stockOutData, {
    outType: 'repair',
    quantity: 1,
    reason: '',
  })
  stockOutDialogVisible.value = true
}

const handleStockOutSubmit = async () => {
  const valid = await stockOutFormRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const res = await partApi.stockOut(stockOutPartId.value, stockOutData)
    if (res.success) {
      ElMessage.success('出库成功')
      stockOutDialogVisible.value = false
      loadParts()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '出库失败')
  } finally {
    submitting.value = false
  }
}

const stockLogDialogVisible = ref(false)
const stockLogLoading = ref(false)
const stockLogPartId = ref(0)
const stockLogPartName = ref('')
const stockLogList = ref<StockLog[]>([])
const stockLogPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const sourceMap: Record<string, string> = {
  purchase: '采购入库',
  customer: '客户自带',
  initial: '期初库存',
  used: '二手再利用',
  other: '其他入库',
}

const outTypeMap: Record<string, string> = {
  repair: '维修领用',
  return: '退货出库',
  damage: '报损出库',
  other: '其他出库',
}

const handleStockLog = (part: Part) => {
  stockLogPartId.value = part.id
  stockLogPartName.value = part.name
  stockLogPagination.page = 1
  stockLogDialogVisible.value = true
  loadStockLogs()
}

const loadStockLogs = async () => {
  stockLogLoading.value = true
  try {
    const res = await partApi.getStockLogs(stockLogPartId.value, {
      page: stockLogPagination.page,
      pageSize: stockLogPagination.pageSize,
    })
    if (res.success && res.data) {
      stockLogList.value = res.data.list
      stockLogPagination.total = res.data.total
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载流水失败')
  } finally {
    stockLogLoading.value = false
  }
}

onMounted(() => {
  if (route.query.lowStock === 'true') {
    searchParams.lowStock = true
  }
  loadParts()
})
</script>

<style scoped>
.inventory-page {
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

.low-stock-text {
  color: #f56c6c;
  font-weight: 600;
}

.min-stock {
  color: #909399;
  font-size: 12px;
}

.stock-log-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.stock-in-text {
  color: #67c23a;
  font-weight: 600;
}

.stock-out-text {
  color: #f56c6c;
  font-weight: 600;
}
</style>
