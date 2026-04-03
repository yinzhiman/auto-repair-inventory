<template>
  <el-container class="layout-container">
    <el-header class="layout-header">
      <div class="header-left">
        <el-icon :size="24" color="#409eff"><Tools /></el-icon>
        <span class="system-name">汽修店管理系统</span>
      </div>
      <div class="header-right">
        <span class="user-name">{{ userStore.user?.name }}</span>
        <el-button type="danger" text @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出
        </el-button>
      </div>
    </el-header>
    <el-main class="layout-main">
      <slot />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Tools, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出系统吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await userStore.logout()
    ElMessage.success('已退出系统')
    router.push('/login')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.layout-container {
  width: 100%;
  height: 100vh;
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.system-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  color: #606266;
  font-size: 14px;
}

.layout-main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
