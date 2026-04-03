<template>
  <div class="error-page">
    <div class="error-content">
      <el-icon :size="80" color="#f56c6c"><WarningFilled /></el-icon>
      <h1>403</h1>
      <p>抱歉，您没有权限访问此页面</p>
      <el-button type="primary" @click="goBack">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'

const router = useRouter()

const goBack = () => {
  router.push('/dashboard')
}
</script>

<style scoped>
.error-page {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
}

.error-content {
  text-align: center;
}

h1 {
  margin: 20px 0 10px;
  font-size: 48px;
  color: #303133;
}

p {
  margin: 0 0 20px;
  color: #909399;
  font-size: 16px;
}
</style>
