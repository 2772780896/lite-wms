/**
 * 排序参数解析工具
 *
 * 用法：
 *   const { parseSort } = require('../lib/sort')
 *   const orderBy = parseSort(req.query, ['createdAt', 'name', 'sku'])
 *   // orderBy: { createdAt: 'desc' }
 */

// 允许的方向
const VALID_ORDERS = ['asc', 'desc']

/**
 * 解析排序参数，返回 Prisma orderBy 对象
 *
 * @param {object} query - req.query
 * @param {string[]} allowedFields - 允许排序的字段白名单
 * @param {string} defaultField - 默认排序字段
 * @param {string} defaultOrder - 默认排序方向（asc/desc）
 * @returns {object} Prisma orderBy 对象
 */
function parseSort(query, allowedFields, defaultField = 'createdAt', defaultOrder = 'desc') {
  const { sortBy, sortOrder } = query

  // 字段不在白名单 → 用默认
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField
  // 方向不合法 → 用默认
  const order = VALID_ORDERS.includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : defaultOrder

  return { [field]: order }
}

module.exports = { parseSort }
