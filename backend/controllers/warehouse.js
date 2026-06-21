const prisma = require('../lib/prisma')
const { parseSort } = require('../lib/sort')

// 新增仓库
exports.create = async (req, res, next) => {
  try {
    const { code, name, address } = req.body

    if (!code || !name) {
      return res.status(400).json({ code: 400, data: null, message: 'code 和 name 不能为空' })
    }

    const warehouse = await prisma.warehouse.create({
      data: { code, name, address: address || null },
    })

    res.status(201).json({ code: 0, data: warehouse, message: '创建成功' })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ code: 400, data: null, message: `仓库编码 ${err.meta?.target} 已存在` })
    }
    next(err)
  }
}

// 编辑仓库
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, address } = req.body

    const warehouse = await prisma.warehouse.update({
      where: { id: Number(id) },
      data: { name, address },
    })

    res.json({ code: 0, data: warehouse, message: '更新成功' })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ code: 404, data: null, message: '仓库不存在' })
    }
    next(err)
  }
}

// 仓库列表（支持 code/name 模糊搜索 + 排序）
exports.list = async (req, res, next) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query
    const skip = (Number(page) - 1) * Number(pageSize)

    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { code: { contains: keyword } },
          ],
        }
      : {}

    const orderBy = parseSort(req.query, ['createdAt', 'name', 'code'])

    const [list, total] = await prisma.$transaction([
      prisma.warehouse.findMany({ where, skip, take: Number(pageSize), orderBy }),
      prisma.warehouse.count({ where }),
    ])

    res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (err) {
    next(err)
  }
}

// 仓库详情（库存走 /inventory?warehouseId=X）
exports.detail = async (req, res, next) => {
  try {
    const { id } = req.params

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: Number(id) },
    })

    if (!warehouse) {
      return res.status(404).json({ code: 404, data: null, message: '仓库不存在' })
    }

    res.json({ code: 0, data: warehouse })
  } catch (err) {
    next(err)
  }
}
