<template>
  <Layout>
    <div class="print-templates">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>打印模板管理</span>
            <el-button type="primary" @click="handleAdd">新建模板</el-button>
          </div>
        </template>

        <el-table :data="templates" v-loading="loading" stripe>
          <el-table-column prop="name" label="模板名称" />
          <el-table-column prop="type" label="类型">
            <template #default="{ row }">
              <el-tag :type="row.type === 'repair' ? 'primary' : 'info'">
                {{ row.type === 'repair' ? '维修单' : '其他' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="isDefault" label="默认模板" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="row.isDefault"
                @change="(val: boolean) => handleSetDefault(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑模板' : '新建模板'" width="600px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="模板名称" required>
            <el-input v-model="form.name" placeholder="请输入模板名称" />
          </el-form-item>
          <el-form-item label="模板类型">
            <el-select v-model="form.type" placeholder="请选择类型">
              <el-option label="维修单" value="repair" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="设为默认">
            <el-switch v-model="form.isDefault" />
          </el-form-item>
          <el-form-item label="模板内容">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="10"
              placeholder="请输入 JSON 格式的模板配置"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '@/layout/index.vue'
import { printTemplateApi, type PrintTemplate } from '@/api/print-template'

const templates = ref<PrintTemplate[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const currentId = ref<number | null>(null)

const form = ref({
  name: '',
  type: 'repair',
  content: '{}',
  isDefault: false,
})

const defaultTemplate = {
  title: '维修结算单',
  fields: ['orderNo', 'customer', 'vehicle', 'items', 'totalAmount'],
  style: {
    paperSize: 'A4',
    orientation: 'portrait',
  },
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const res = await printTemplateApi.getList()
    templates.value = res.data?.list ?? []
  } catch (error) {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  currentId.value = null
  form.value = {
    name: '',
    type: 'repair',
    content: JSON.stringify(defaultTemplate, null, 2),
    isDefault: false,
  }
  dialogVisible.value = true
}

const handleEdit = (row: PrintTemplate) => {
  isEdit.value = true
  currentId.value = row.id
  form.value = {
    name: row.name,
    type: row.type,
    content: row.content,
    isDefault: row.isDefault,
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }

  try {
    JSON.parse(form.value.content)
  } catch {
    ElMessage.warning('模板内容必须是有效的 JSON 格式')
    return
  }

  saving.value = true
  try {
    if (isEdit.value && currentId.value) {
      await printTemplateApi.update(currentId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await printTemplateApi.create(form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadTemplates()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleSetDefault = async (row: PrintTemplate, val: boolean) => {
  try {
    await printTemplateApi.update(row.id, { isDefault: val })
    ElMessage.success(val ? '已设为默认模板' : '已取消默认模板')
    loadTemplates()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (row: PrintTemplate) => {
  try {
    await ElMessageBox.confirm('确定要删除该模板吗？', '提示', {
      type: 'warning',
    })
    await printTemplateApi.delete(row.id)
    ElMessage.success('删除成功')
    loadTemplates()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.print-templates {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
