<template>
  <Layout>
    <div class="dashboard-page">
      <h1>欢迎使用汽修店进销存管理系统</h1>

      <div class="stats-grid">
        <div
          class="stat-card warning"
          @click="goToLowStock"
        >
          <div class="stat-icon">
            <el-icon :size="32">
              <Warning />
            </el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ lowStockCount }}
            </div>
            <div class="stat-label">
              库存预警
            </div>
          </div>
          <div class="stat-action">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>

        <div
          v-if="monthlyDueCount > 0"
          class="stat-card danger"
          @click="goToMonthlyDue"
        >
          <div class="stat-icon">
            <el-icon :size="32">
              <Clock />
            </el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">
              {{ monthlyDueCount }}
            </div>
            <div class="stat-label">
              月结今日到期
            </div>
          </div>
          <div class="stat-action">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <div
        v-if="monthlyDueList.length > 0"
        class="section"
      >
        <div class="section-header">
          <h2>月结到期提醒</h2>
          <el-button
            text
            type="primary"
            @click="goToMonthlyDue"
          >
            查看全部
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <el-table
          :data="monthlyDueList"
          stripe
          size="small"
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
            label="欠款金额"
            width="120"
          >
            <template #default="{ row }">
              <span class="amount-text">¥{{ (row.totalAmount - row.paidAmount).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="到期日"
            width="120"
          >
            <template #default="{ row }">
              {{ new Date(row.dueDate).toLocaleDateString() }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="80"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                text
                type="primary"
                @click="goToOrderDetail(row.id)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div
        v-if="lowStockList.length > 0"
        class="section"
      >
        <div class="section-header">
          <h2>库存预警配件</h2>
          <el-button
            text
            type="primary"
            @click="goToLowStock"
          >
            查看全部
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <el-table
          :data="lowStockList"
          stripe
          size="small"
        >
          <el-table-column
            prop="name"
            label="配件名称"
            min-width="150"
          />
          <el-table-column
            prop="category"
            label="分类"
            width="120"
          />
          <el-table-column
            prop="stock"
            label="当前库存"
            width="100"
          >
            <template #default="{ row }">
              <span class="low-stock-text">{{ row.stock }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="minStock"
            label="最低库存"
            width="100"
          />
          <el-table-column
            prop="shortage"
            label="缺口"
            width="80"
          >
            <template #default="{ row }">
              <span class="shortage-text">-{{ row.shortage }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Warning, ArrowRight, Clock } from '@element-plus/icons-vue'
import Layout from '@/layout/index.vue'
import { partApi } from '@/api/part'
import { orderApi, type MonthlyDueOrder } from '@/api/order'
import type { LowStockPart } from '@/types/part'

const router = useRouter()
const lowStockCount = ref(0)
const lowStockList = ref<LowStockPart[]>([])
const monthlyDueCount = ref(0)
const monthlyDueList = ref<MonthlyDueOrder[]>([])

const loadLowStockData = async () => {
  try {
    const res = await partApi.getLowStock(5)
    if (res.success && res.data) {
      lowStockList.value = res.data.list
      lowStockCount.value = res.data.total
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载库存预警失败')
  }
}

const loadMonthlyDueData = async () => {
  try {
    const res = await orderApi.getMonthlyDue()
    if (res.success && res.data) {
      monthlyDueList.value = res.data.list
      monthlyDueCount.value = res.data.total
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载月结提醒失败')
  }
}

const goToLowStock = () => {
  router.push('/inventory?lowStock=true')
}

const goToMonthlyDue = () => {
  router.push('/orders?status=completed&paymentType=monthly')
}

const goToOrderDetail = (id: number) => {
  router.push(`/orders?id=${id}`)
}

onMounted(() => {
  loadLowStockData()
  loadMonthlyDueData()
})
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
}

h1 {
  margin: 0 0 24px;
  color: #303133;
  font-size: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-card.warning {
  border-left: 4px solid #e6a23c;
}

.stat-card.warning .stat-icon {
  background: #fdf6ec;
  color: #e6a23c;
}

.stat-card.danger {
  border-left: 4px solid #f56c6c;
}

.stat-card.danger .stat-icon {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  margin-right: 16px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.stat-action {
  color: #909399;
}

.section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.low-stock-text {
  color: #f56c6c;
  font-weight: 600;
}

.shortage-text {
  color: #f56c6c;
  font-weight: 600;
}

.amount-text {
  color: #f56c6c;
  font-weight: 600;
}
</style>
