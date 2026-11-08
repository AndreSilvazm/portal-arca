import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { hashPassword, temporaryPassword } from '@/server/password.mjs'
import { HttpError, requireUser, route, User } from '@/server/session'
import { groups } from '@/lib/data'

// Altera grupo, ativa/desativa ou redefine a senha de um membro. A conta da Secretaria é intocável por aqui.
export const PATCH = route(async (req, ctx) => {
  await requireUser(req, { admin: true })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const ref = db().collection('users').doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpError(404, 'Membro não encontrado.')
  const target = snap.data() as User
  if (target.admin) throw new HttpError(403, 'A conta da Secretaria não pode ser alterada aqui.')

  const update: Record<string, unknown> = {}
  let tempPassword: string | undefined

  if (body.group !== undefined) {
    if (!groups.includes(body.group)) throw new HttpError(400, 'Grupo inválido.')
    update.group = body.group
  }
  if (body.active !== undefined) {
    update.active = !!body.active
    if (!body.active) update.tokenVersion = (target.tokenVersion ?? 0) + 1 // derruba as sessões abertas
  }
  if (body.resetPassword) {
    tempPassword = temporaryPassword()
    update.passwordHash = await hashPassword(tempPassword)
    update.mustChangePassword = true
    update.tokenVersion = (target.tokenVersion ?? 0) + 1
  }

  if (Object.keys(update).length) await ref.update(update)
  return NextResponse.json({ ok: true, tempPassword })
})
