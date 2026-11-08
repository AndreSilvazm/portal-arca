import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { sealPoll } from '@/server/seal'
import { HttpError, requireUser, route } from '@/server/session'

export const POST = route(async (req, ctx) => {
  await requireUser(req, { admin: true })
  const { id } = await ctx.params
  const ref = db().collection('polls').doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpError(404, 'Votação não encontrada.')
  if (!snap.data()!.releasedAt) throw new HttpError(409, 'Esta votação ainda não foi liberada.')
  if (!snap.data()!.closedAt) {
    const closedAt = new Date().toISOString()
    await ref.update({ closedAt })
    // Grava a apuração final e o hash junto com o encerramento.
    const tally = await ref.collection('tally').doc('counts').get()
    await sealPoll(id, { ...snap.data()!, closedAt }, tally.data() ?? {})
  }
  return NextResponse.json({ ok: true })
})
