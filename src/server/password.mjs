// Hash de senha com scrypt (nativo do Node, sem dependências). Formato: scrypt$N$r$p$salt$hash (base64).
// Usado pelo servidor e pelo script de criação do administrador.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const N = 16384
const R = 8
const P = 1
const KEY_LENGTH = 64

const derive = (password, salt, n, r, p) =>
  new Promise((resolve, reject) => scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))))

/** @param {string} password */
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await derive(password.normalize('NFKC'), salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

/**
 * @param {string} password
 * @param {string} stored
 */
export async function verifyPassword(password, stored) {
  const [scheme, n, r, p, salt, hash] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const key = await derive(password.normalize('NFKC'), Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p))
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** Senha provisória legível, sem caracteres ambíguos. */
export function temporaryPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(randomBytes(12), b => alphabet[b % alphabet.length]).join('')
}
