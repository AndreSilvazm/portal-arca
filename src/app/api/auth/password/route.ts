import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { hashPassword, verifyPassword } from '@/server/password.mjs'
import { HttpError, issueToken, requireUser, route, setSessionCookie } from '@/server/session'

// Troca a senha da própria pessoa (obrigatória no primeiro acesso, com senha provisória).
export const POST = route(async req => {
  const user = await requireUser(req, { allowPending: true })
  const body = await req.json().catch(() => ({}))
  const current = String(body.current ?? '')
  const next = String(body.next ?? '')

  if (!(await verifyPassword(current, user.passwordHash))) throw new HttpError(400, 'A senha atual está incorreta.')
  if (next.length < 8) throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres.')
  if (next === current) throw new HttpError(400, 'A nova senha deve ser diferente da atual.')

  const tokenVersion = (user.tokenVersion ?? 0) + 1
  await db().collection('users').doc(user.id).update({ passwordHash: await hashPassword(next), mustChangePassword: false, tokenVersion })

  // Todas as outras sessões caem (versão do token mudou); esta recebe um JWT novo.
  const res = NextResponse.json({ ok: true })
  setSessionCookie(res, await issueToken({ ...user, tokenVersion }))
  return res
})
