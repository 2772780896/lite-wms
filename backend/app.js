require('dotenv').config()

const express = require('express')
const cors = require('cors')
const routes = require('./routes')

const app = express()

// --- 全局中间件 ---
// 所有请求都会按注册顺序经过这些中间件
app.use(cors())
app.use(express.json())

// --- 路由挂载 ---
// Router 本质是一个"迷你 Express 应用"，也是一个中间件
// 它接收请求 → 内部匹配路径 → 分发到对应 handler → 没匹配到就 next() 继续往下走
app.use('/api', routes)

// --- 404 兜底中间件 ---
// 放在所有路由之后：如果上面的路由都没匹配到（没人调过 res.json），才走到这里
// 路由成功后不会走到这，因为 res.json() 调用后响应就结束了
app.use((req, res) => {
  res.status(404).json({ code: 404, data: null, message: '接口不存在' })
})

// --- 全局错误处理中间件 ---
// 必须 4 个参数 (err, req, res, next)，Express 根据参数个数识别它
// 只有 throw / next(err) 时才触发，正常 res.json() 不会走到这
app.use((err, req, res, next) => {
  console.error('错误:', err.message)
  res.status(err.status || 500).json({
    code: err.code || 500,
    data: null,
    message: err.message || '服务器内部错误',
  })
})

// --- 启动服务器 ---
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`)
})
