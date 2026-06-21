const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

/**
 * 登录控制器
 *
 * 流程：
 * 1. 接收 username + password
 * 2. 查数据库找用户 → 找不到返回 401
 * 3. bcrypt.compare 比对密码 → 不匹配返回 401
 * 4. jwt.sign 签发 token（payload 包含 userId + role）
 * 5. 返回 { token, role }（role 明文，供前端控制 UI）
 */
exports.handle = async (req, res, next) => {
  try {
    const { username, password } = req.body

    // 1. 参数校验
    if (!username || !password) {
      return res.status(400).json({ code: 400, data: null, message: '用户名和密码不能为空' })
    }

    // 2. 查用户
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return res.status(401).json({ code: 401, data: null, message: '用户名或密码错误' })
    }

    // 3. 验证密码（bcrypt.compare：明文密码 vs 数据库中的哈希）
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ code: 401, data: null, message: '用户名或密码错误' })
    }

    // 4. 签发 JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },  // payload
      process.env.JWT_SECRET,                // 签名密钥
      { expiresIn: '2h' }                    // 过期时间，自动验证。当在auth.js中验证时如果过期抛出error，走错误处理
    )

    // 5. 返回 token + 明文 role
    res.json({
      code: 0,
      data: { token, role: user.role },
      message: '登录成功',
    })
  } catch (err) {
    next(err)
  }
}
