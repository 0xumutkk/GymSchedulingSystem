const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePasswords(raw, hashed) {
  return await bcrypt.compare(raw, hashed);
}

module.exports = { hashPassword, comparePasswords };
