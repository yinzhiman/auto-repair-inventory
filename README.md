# 汽修店进销存管理系统

为小型汽修店老板提供一套简单易用的进销存管理系统，让配件库存、维修记录、客户往来、财务账目一目了然。

## 功能特性

- **库存管理**：配件入库/出库/盘点/预警
- **维修业务**：工单管理/配件关联/打印维修单
- **客户管理**：客户档案/会员储值/消费记录
- **财务管理**：收支统计/利润分析/供应商管理
- **经营分析**：月度/季度/半年/年度报表
- **系统管理**：员工管理/数据备份/数据导出

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + Element Plus
- **后端**：Node.js + Express + TypeScript
- **数据库**：SQLite

## 快速开始

### 环境要求

- Node.js >= 18.x
- pnpm >= 8.x（推荐）或 npm >= 9.x

### 安装依赖

```bash
# 安装前端依赖
cd client
pnpm install

# 安装后端依赖
cd ../server
pnpm install
```

### 配置环境变量

```bash
# 前端配置
cd client
cp .env.example .env

# 后端配置
cd ../server
cp .env.example .env
```

### 启动开发服务器

```bash
# 启动后端服务
cd server
pnpm dev

# 启动前端服务（新终端）
cd client
pnpm dev
```

### 访问应用

- 前端：http://localhost:5173
- 后端 API：http://localhost:3000

## 项目结构

```
auto-repair-inventory/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── api/            # API 请求
│   │   ├── stores/         # 状态管理
│   │   └── router/         # 路由配置
│   └── package.json
├── server/                 # 后端项目
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── models/         # 数据模型
│   │   └── middlewares/    # 中间件
│   └── package.json
└── README.md
```

## 开发规范

详见 [开发规范文档](../specs/开发规范.md)

## 许可证

MIT
