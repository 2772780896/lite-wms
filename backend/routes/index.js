const express = require('express')
const auth = require('../middleware/auth')
const rbac = require('../middleware/rbac')
const login = require('../controllers/login')
const product = require('../controllers/product')
const warehouse = require('../controllers/warehouse')
const inventory = require('../controllers/inventory')
const transaction = require('../controllers/transaction')

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
router.post('/warehouses', auth, rbac(['ADMIN']), warehouse.create)
router.put('/warehouses/:id', auth, rbac(['ADMIN']), warehouse.update)
router.get('/warehouses', auth, warehouse.list)
router.get('/warehouses/:id', auth, warehouse.detail)

// ==================== 入库 / 出库 / 退货 ====================
router.post('/inbound', auth, transaction.inbound)
router.post('/outbound', auth, transaction.outbound)
router.post('/return', auth, transaction.return_)

// ==================== 库存查询 / 流水查询 ====================
router.get('/inventory', auth, inventory.query)
router.get('/transactions', auth, transaction.list)

module.exports = router
