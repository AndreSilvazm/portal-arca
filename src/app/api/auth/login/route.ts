import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { hashPassword, verifyPassword } from '@/server/password.mjs'
import { HttpError, issueToken, route, setSessionCookie, User } from '@/server/session'

// Limite simples de tentativas por IP+e-mail (em memória: vale por instância do servidor).
const attempts = new Map<string, { count: number; until: number }>()
const MAX_ATTEMPTS = 5
const LOCK_MS = 5 * 60 * 1000

let dummyHash: Promise<string> | undefined

export const POST = route(async req => {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (!email || !password) throw new HttpError(400, 'Informe e-mail e senha.')

  const key = `${req.headers.get('x-forwarded-for') ?? 'local'}|${email}`
  const state = attempts.get(key)
  if (state && state.until > Date.now()) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')

  const found = await db().collection('users').where('email', '==', email).limit(1).get()
  const user = found.empty ? null : ({ id: found.docs[0].id, ...found.docs[0].data() } as User)

  // Mesmo sem usuário, calcula um hash: o tempo de resposta não revela se o e-mail existe.
  dummyHash ??= hashPassword('senha-inexistente')
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash))

  if (!user || !valid) {
    const count = (state?.count ?? 0) + 1
    attempts.set(key, { count, until: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0 })
    throw new HttpError(401, 'E-mail ou senha incorretos.')
  }
  if (!user.active) throw new HttpError(403, 'Este acesso está desativado. Fale com a Secretaria.')

  attempts.delete(key)
  const res = NextResponse.json({ ok: true, mustChangePassword: !!user.mustChangePassword })
  setSessionCookie(res, await issueToken(user))
  return res
})
