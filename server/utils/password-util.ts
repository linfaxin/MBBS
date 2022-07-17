const bcrypt = require('bcrypt');

/**
 * 验证密码
 * @param plainPassword 明文密码
 * @param hashedPassword 哈希后密码
 * @returns {boolean} 是否匹配成功
 */
export function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

/**
 * @param plainPassword 明文密码
 * @returns {string} 哈希后的密码
 */
export function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, 10);
}
