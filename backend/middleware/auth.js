const jwt = require('jsonwebtoken')

/**
 * 认证中间件：解析 JWT，将用户信息挂载到 req.user
 *
 * 流程：
 * 1. 从 Authorization Header 取出 token（格式：Bearer <token>）
 * 2. 用 SECRET_KEY 验签 → 签名合法则解出 payload（userId, role）
 * 3. 挂载到 req.user，后续路由通过 req.user.userId / req.user.role 使用
 */
function auth(req, res, next) {
  // 1. 从 Header 取 token
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, data: null, message: '未登录或 token 缺失' })
  }

  const token = authHeader.split(' ')[1]  // 取 Bearer 后面的部分

  // 2. 验签 + 解出 payload
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // 3. 挂载到 req.user
    req.user = {
      userId: payload.userId,
      role: payload.role,
    }
    next()  // 验签通过，放行到下一个中间件或路由
  } catch (err) {
    return res.status(401).json({ code: 401, data: null, message: 'token 无效或已过期' })
  }
}

module.exports = auth
