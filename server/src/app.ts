import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import partsRoutes from './routes/parts'
import ordersRoutes from './routes/orders'
import customersRoutes from './routes/customers'
import printTemplatesRoutes from './routes/print-templates'
import { authMiddleware } from './middlewares/auth'

dotenv.config()

const app = express()

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

app.use('/api/auth', authRoutes)
app.use(authMiddleware)
app.use('/api/parts', partsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/print-templates', printTemplatesRoutes)

export default app
