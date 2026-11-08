import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { HttpError, requireUser, route } from '@/server/session'

// Libera a votação para os membros. Antes disso ela fica agendada: só a Secretaria a vê e ninguém vota.
export const POST = route(async (req, ctx) => {
  await requireUser(req, { admin: true })
  const { id } = await ctx.params
  const ref = db().collection('polls').doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpError(404, 'Votação não encontrada.')
  const poll = snap.data()!
  if (poll.releasedAt) throw new HttpError(409, 'Esta votação já foi liberada.')
  if (new Date(poll.endsAt).getTime() <= Date.now()) throw new HttpError(409, 'O prazo de encerramento já passou. Exclua esta votação e crie outra com novo prazo.')
  await ref.update({ releasedAt: new Date().toISOString() })
  return NextResponse.json({ ok: true })
})
