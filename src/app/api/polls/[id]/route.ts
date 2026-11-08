import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { HttpError, requireUser, route } from '@/server/session'

// Exclui uma votação agendada ou já encerrada (com a apuração e a lista de participantes). Votação aberta precisa ser encerrada antes.
export const DELETE = route(async (req, ctx) => {
  await requireUser(req, { admin: true })
  const { id } = await ctx.params
  const ref = db().collection('polls').doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpError(404, 'Votação não encontrada.')
  const poll = snap.data()!
  const closed = poll.closedAt || (poll.endsAt && new Date(poll.endsAt).getTime() <= Date.now())
  if (poll.releasedAt && !closed) throw new HttpError(409, 'Votação aberta não pode ser excluída. Encerre-a primeiro.')
  const participants = await ref.collection('participants').get()
  await Promise.all(participants.docs.map(d => d.ref.delete()))
  await ref.collection('tally').doc('counts').delete()
  await ref.delete()
  return NextResponse.json({ ok: true })
})
