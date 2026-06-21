const prisma = require('../lib/prisma')
const { parseSort } = require('../lib/sort')

/**
 * 商品控制器 — CRUD 操作
 *
 * 创建：POST /api/products（ADMIN）
 * 编辑：PUT /api/products/:id（ADMIN）
 * 列表：GET /api/products（ALL，支持 name/sku 模糊搜索）
 * 详情：GET /api/products/:id（ALL）
 */

// 新增商品
exports.create = async (req, res, next) => {
  try {
    const { sku, name, spec } = req.body

    if (!sku || !name) {
      return res.status(400).json({ code: 400, data: null, message: 'sku 和 name 不能为空' })
    }

    const product = await prisma.product.create({
      data: { sku, name, spec: spec || null },
    })

    res.status(201).json({ code: 0, data: product, message: '创建成功' })
  } catch (err) {
    // P2002 = 唯一约束失败（sku 重复）
    if (err.code === 'P2002') {
      return res.status(400).json({ code: 400, data: null, message: `商品编码 ${err.meta?.target} 已存在` })
    }
    next(err)
  }
}

// 编辑商品
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, spec } = req.body

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: { name, spec },
    })

    res.json({ code: 0, data: product, message: '更新成功' })
  } catch (err) {
    // P2025 = 记录不存在
    if (err.code === 'P2025') {
      return res.status(404).json({ code: 404, data: null, message: '商品不存在' })
    }
    next(err)
  }
}

// 商品列表（支持 name/sku 模糊搜索 + 排序）
exports.list = async (req, res, next) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query
    const skip = (Number(page) - 1) * Number(pageSize)

    // 构建搜索条件：keyword 匹配 name 或 sku
    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { sku: { contains: keyword } },
          ],
        }
      : {}

    const orderBy = parseSort(req.query, ['createdAt', 'name', 'sku'])

    const [list, total] = await prisma.$transaction([
      prisma.product.findMany({ where, skip, take: Number(pageSize), orderBy }),
      prisma.product.count({ where }),
    ])

    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    next(err)
  }
}

// 商品详情（库存走 /inventory?productId=X）
exports.detail = async (req, res, next) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    })

    if (!product) {
      return res.status(404).json({ code: 404, data: null, message: '商品不存在' })
    }

    res.json({ code: 0, data: product })
  } catch (err) {
    next(err)
  }
}
