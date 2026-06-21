const prisma = require('../lib/prisma')
const { parseSort } = require('../lib/sort')

// 统一库存查询：根据筛选条件决定返回格式
//   - sku 筛选 → 聚合视图（该商品 + totalQuantity + warehouses[]）
//   - sku + warehouseCode → 聚合视图，但只含指定仓库
//   - warehouseCode 筛选 / 无筛选 → 扁平列表 + 分页
exports.query = async (req, res, next) => {
  try {
    const { sku, warehouseCode, page = 1, pageSize = 20 } = req.query

    // 聚合模式：查某商品在各仓库的分布
    if (sku) {
      // 一次查询：product + inventory + warehouse（可选 warehouseCode 筛选）
      const inventoryWhere = warehouseCode
        ? { warehouseCode }
        : {}

      const product = await prisma.product.findUnique({
        where: { sku },
        include: {
          inventory: {
            where: inventoryWhere,
            include: { warehouse: true },
          },
        },
      })

      if (!product) {
        return res.status(404).json({ code: 404, data: null, message: '商品不存在' })
      }

      // totalQuantity 在遍历时顺手累加（遍历不可避免，累加成本为零）
      let totalQuantity = 0
      const warehouses = []
      for (const item of product.inventory) {
        totalQuantity += item.quantity
        warehouses.push({
          warehouseCode: item.warehouseCode,
          name: item.warehouse.name,
          quantity: item.quantity,
        })
      }

      return res.json({
        code: 0,
        data: {
          sku: product.sku,
          name: product.name,
          spec: product.spec,
          totalQuantity,
          warehouses,
        },
      })
    }

    // 列表模式：扁平 + 分页 + 排序（可带 warehouseCode 筛选）
    const skip = (Number(page) - 1) * Number(pageSize)
    const where = {}
    if (warehouseCode) where.warehouseCode = warehouseCode

    const orderBy = parseSort(req.query, ['createdAt', 'quantity'])

    const [list, total] = await prisma.$transaction([
      prisma.inventory.findMany({
        where,
        skip,
        take: Number(pageSize),
        include: { product: true, warehouse: true },
        orderBy,
      }),
      prisma.inventory.count({ where }),
    ])

    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    next(err)
  }
}
