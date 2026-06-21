const prisma = require('../lib/prisma')
const { parseSort } = require('../lib/sort')

/**
 * 出入库操作控制器
 *
 * 三个接口共享逻辑：
 *   1. 校验 bizNo 幂等性（TransactionLog.bizNo @unique）
 *   2. 事务内：原子操作 Inventory + create TransactionLog
 *
 * 库存扣减采用原子 UPDATE + WHERE 边界：
 *   UPDATE ... SET quantity = quantity - N WHERE quantity >= N
 *   数据库层面保证并发安全，无竞态窗口
 *
 * 事务内使用 throw 中止：
 *   throw Error 才能触发事务回滚；return null 虽不会修改数据（count=0），但语义不清晰
 */

// ==================== 入库 ====================
exports.inbound = async (req, res, next) => {
  try {
    const { bizNo, productId, warehouseId, quantity } = req.body

    if (!bizNo || !productId || !warehouseId || !quantity) {
      return res.status(400).json({ code: 400, data: null, message: '参数缺失' })
    }
    if (quantity <= 0) {
      return res.status(400).json({ code: 400, data: null, message: '数量必须大于 0' })
    }

    // 幂等性检查：bizNo 已存在则直接返回成功
    const existing = await prisma.transactionLog.findUnique({ where: { bizNo } })
    if (existing) {
      return res.json({ code: 0, data: existing, message: '已处理（重复请求）' })
    }

    // 事务：upsert 库存 + 写流水
    const log = await prisma.$transaction(async (tx) => {
      // upsert：存在则 increment，不存在则 create
      await tx.inventory.upsert({
        where: { productId_warehouseId: { productId: Number(productId), warehouseId: Number(warehouseId) } },
        update: { quantity: { increment: Number(quantity) } },
        create: { productId: Number(productId), warehouseId: Number(warehouseId), quantity: Number(quantity) },
      })

      return tx.transactionLog.create({
        data: {
          bizNo,
          productId: Number(productId),
          warehouseId: Number(warehouseId),
          type: 'IN',
          quantity: Number(quantity),
          operatorId: req.user.id,
        },
      })
    })

    res.status(201).json({ code: 0, data: log, message: '入库成功' })
  } catch (err) {
    next(err)
  }
}

// ==================== 出库 ====================
exports.outbound = async (req, res, next) => {
  try {
    const { bizNo, productId, warehouseId, quantity } = req.body

    if (!bizNo || !productId || !warehouseId || !quantity) {
      return res.status(400).json({ code: 400, data: null, message: '参数缺失' })
    }
    if (quantity <= 0) {
      return res.status(400).json({ code: 400, data: null, message: '数量必须大于 0' })
    }

    const existing = await prisma.transactionLog.findUnique({ where: { bizNo } })
    if (existing) {
      return res.json({ code: 0, data: existing, message: '已处理（重复请求）' })
    }

    const log = await prisma.$transaction(async (tx) => {
      // 原子扣减：UPDATE ... SET quantity = quantity - N WHERE quantity >= N
      // 数据库层面保证边界，并发安全（无竞态窗口）
      const result = await tx.inventory.updateMany({
        where: {
          productId_warehouseId: { productId: Number(productId), warehouseId: Number(warehouseId) },
          quantity: { gte: Number(quantity) },
        },
        data: { quantity: { decrement: Number(quantity) } },
      })

      // affected rows = 0 表示记录不存在或库存不足
      if (result.count === 0) {
        throw new Error('STOCK_INSUFFICIENT')
      }

      return tx.transactionLog.create({
        data: {
          bizNo,
          productId: Number(productId),
          warehouseId: Number(warehouseId),
          type: 'OUT',
          quantity: Number(quantity),
          operatorId: req.user.id,
        },
      })
    })

    res.status(201).json({ code: 0, data: log, message: '出库成功' })
  } catch (err) {
    if (err.message === 'STOCK_INSUFFICIENT') {
      return res.status(400).json({ code: 400, data: null, message: '库存不足' })
    }
    next(err)
  }
}

// ==================== 退货 ====================
exports.return_ = async (req, res, next) => {
  try {
    const { bizNo, productId, warehouseId, quantity, type, remark } = req.body

    if (!bizNo || !productId || !warehouseId || !quantity || !type || !remark) {
      return res.status(400).json({ code: 400, data: null, message: '参数缺失（remark 必填）' })
    }
    if (!['RETURN_IN', 'RETURN_OUT'].includes(type)) {
      return res.status(400).json({ code: 400, data: null, message: 'type 必须为 RETURN_IN 或 RETURN_OUT' })
    }
    if (quantity <= 0) {
      return res.status(400).json({ code: 400, data: null, message: '数量必须大于 0' })
    }

    const existing = await prisma.transactionLog.findUnique({ where: { bizNo } })
    if (existing) {
      return res.json({ code: 0, data: existing, message: '已处理（重复请求）' })
    }

    const log = await prisma.$transaction(async (tx) => {
      if (type === 'RETURN_OUT') {
        // RETURN_OUT：原子扣减（同出库逻辑）
        const result = await tx.inventory.updateMany({
          where: {
            productId_warehouseId: { productId: Number(productId), warehouseId: Number(warehouseId) },
            quantity: { gte: Number(quantity) },
          },
          data: { quantity: { decrement: Number(quantity) } },
        })
        if (result.count === 0) {
          throw new Error('STOCK_INSUFFICIENT')
        }
      } else {
        // RETURN_IN：upsert（记录可能不存在，需要 create）
        await tx.inventory.upsert({
          where: { productId_warehouseId: { productId: Number(productId), warehouseId: Number(warehouseId) } },
          update: { quantity: { increment: Number(quantity) } },
          create: { productId: Number(productId), warehouseId: Number(warehouseId), quantity: Number(quantity) },
        })
      }

      return tx.transactionLog.create({
        data: {
          bizNo,
          productId: Number(productId),
          warehouseId: Number(warehouseId),
          type,
          quantity: Number(quantity),
          operatorId: req.user.id,
          remark,
        },
      })
    })

    res.status(201).json({ code: 0, data: log, message: '退货成功' })
  } catch (err) {
    if (err.message === 'STOCK_INSUFFICIENT') {
      return res.status(400).json({ code: 400, data: null, message: '库存不足' })
    }
    next(err)
  }
}

// ==================== 流水查询 ====================
exports.list = async (req, res, next) => {
  try {
    const { productId, warehouseId, type, startDate, endDate, page = 1, pageSize = 20 } = req.query

    // 动态构建 where 条件
    const where = {}
    if (productId) where.productId = Number(productId)
    if (warehouseId) where.warehouseId = Number(warehouseId)
    if (type) where.type = type
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const skip = (Number(page) - 1) * Number(pageSize)
    const orderBy = parseSort(req.query, ['createdAt', 'quantity'])

    const [list, total] = await prisma.$transaction([
      prisma.transactionLog.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy,
        include: { product: true, warehouse: true, operator: { select: { id: true, name: true } } },
      }),
      prisma.transactionLog.count({ where }),
    ])

    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    next(err)
  }
}
