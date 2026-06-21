/**
 * RBAC 路由守卫中间件：检查当前用户角色是否有权访问该路由
 *
 * 用法：rbac(['ADMIN']) — 只允许管理员访问
 *       rbac(['ADMIN', 'STAFF']) — 管理员和仓库人员都可访问
 *
 * 工厂函数
 * - 路由定义时调用 rbac(['ADMIN'])，allowedRoles 被闭包"记住"
 * - 返回的函数才是真正的中间件，Express 执行路由时才传入 req/res/next
 */
function rbac(allowedRoles) {
  // allowedRoles 在这里被闭包捕获，后续每次请求都能读到
  return (req, res, next) => {
    // req/res/next 是 Express 在执行路由时传入的
    if (!req.user) {
      return res.status(401).json({ code: 401, data: null, message: '请先登录' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, data: null, message: '权限不足' })
    }

    next()  // 角色在允许列表中，放行
  }
}

module.exports = rbac
