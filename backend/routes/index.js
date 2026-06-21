const express = require('express')
const auth = require('../middleware/auth')
const rbac = require('../middleware/rbac')
const login = require('../controllers/login')
const product = require('../controllers/product')

const router = express.Router()

/**
 * 路由结构说明：
 *
 * router.post('/products', auth, rbac(['ADMIN']), handler) 等价于：
 *   先 auth 验签 → 再 rbac 验角色 → 最后执行业务逻辑
 */

// ==================== 认证 ====================
router.post('/auth/login', login.handle)  // 公开接口，不需要 auth 中间件

// ==================== 商品管理 ====================
router.post('/products', auth, rbac(['ADMIN']), product.create)
router.put('/products/:id', auth, rbac(['ADMIN']), product.update)
router.get('/products', auth, product.list)
router.get('/products/:id', auth, product.detail)

// ==================== 仓库管理 ====================
router.post('/warehouses', auth, rbac(['ADMIN']), (req, res, next) => {
  try {
    res.json({ code: 0, data: null, message: '新增仓库待实现' })
  } catch (err) { next(err) }
})

router.put('/warehouses/:id', auth, rbac(['ADMIN']), (req, res, next) => {
  try {
    res.json({ code: 0, data: null, message: '编辑仓库待实现' })
  } catch (err) { next(err) }
})

router.get('/warehouses', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: [], message: '仓库列表待实现' })
  } catch (err) { next(err) }
})

router.get('/warehouses/:id', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: null, message: '仓库详情待实现' })
  } catch (err) { next(err) }
})

// ==================== 入库 / 出库 / 退货 ====================
router.post('/inbound', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: null, message: '入库逻辑待实现' })
  } catch (err) { next(err) }
})

router.post('/outbound', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: null, message: '出库逻辑待实现' })
  } catch (err) { next(err) }
})

router.post('/return', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: null, message: '退货逻辑待实现' })
  } catch (err) { next(err) }
})

// ==================== 库存查询 / 流水查询 ====================
router.get('/inventory', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: [], message: '库存查询待实现' })
  } catch (err) { next(err) }
})

router.get('/inventory/summary', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: [], message: '库存汇总待实现' })
  } catch (err) { next(err) }
})

router.get('/transactions', auth, (req, res, next) => {
  try {
    res.json({ code: 0, data: [], message: '流水查询待实现' })
  } catch (err) { next(err) }
})

module.exports = router
