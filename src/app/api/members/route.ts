import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { hashPassword, temporaryPassword } from '@/server/password.mjs'
import { HttpError, requireUser, route } from '@/server/session'
import { groups } from '@/lib/data'

// Cadastra um membro com senha provisória (mostrada uma única vez à Secretaria).
// No primeiro acesso a pessoa é obrigada a trocá-la.
export const POST = route(async req => {
  await requireUser(req, { admin: true })
  const body = await req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const role = String(body.role ?? '').trim()
  const group = String(body.group ?? '')

  if (!name || !role || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Preencha nome, cargo e um e-mail válido.')
  if (!groups.includes(group as (typeof groups)[number])) throw new HttpError(400, 'Grupo inválido.')

  const users = db().collection('users')
  if (!(await users.where('email', '==', email).limit(1).get()).empty) throw new HttpError(409, 'Já existe uma pessoa cadastrada com este e-mail.')

  const tempPassword = temporaryPassword()
  await users.add({
    name, email, role, group, active: true, admin: false,
    passwordHash: await hashPassword(tempPassword), mustChangePassword: true, tokenVersion: 0, createdAt: new Date().toISOString(),
  })
  return NextResponse.json({ ok: true, tempPassword })
})
