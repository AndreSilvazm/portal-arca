import { NextResponse } from 'next/server'
import { db, increment } from '@/server/db'
import { canSee, HttpError, loadPermissions, requireUser, route } from '@/server/session'
import { optionKeys, voteOptions } from '@/lib/shared'

// Voto único e secreto: a transação cria o registro de participação (quem votou) e soma 1 na apuração
// (em quê votou) sem nunca ligar as duas informações.
export const POST = route(async (req, ctx) => {
  const user = await requireUser(req)
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const index = voteOptions.indexOf(String(body.option))
  if (index < 0) throw new HttpError(400, 'Opção de voto inválida.')
  if (!canSee(user, await loadPermissions(), 'Votações')) throw new HttpError(403, 'Sem permissão para votar.')

  const firestore = db()
  const pollRef = firestore.collection('polls').doc(id)
  await firestore.runTransaction(async tx => {
    const poll = await tx.get(pollRef)
    if (!poll.exists) throw new HttpError(404, 'Votação não encontrada.')
    const data = poll.data()!
    if (!data.releasedAt) throw new HttpError(403, 'Esta votação ainda não foi liberada.')
    if (data.closedAt || new Date(data.endsAt).getTime() <= Date.now()) throw new HttpError(409, 'Esta votação já foi encerrada.')
    if (!data.audience.all && !data.audience.groups.includes(user.group)) throw new HttpError(403, 'Esta votação não está aberta ao seu grupo.')

    const participant = pollRef.collection('participants').doc(user.id)
    if ((await tx.get(participant)).exists) throw new HttpError(409, 'Seu voto já foi registrado nesta votação.')

    tx.set(participant, { votedAt: new Date().toISOString() })
    tx.update(pollRef.collection('tally').doc('counts'), { [optionKeys[index]]: increment(1), total: increment(1) })
  }).catch(error => {
    // Modo REST: dois votos simultâneos — o segundo falha ao criar a participação que já existe.
    if ((error as { status?: number }).status === 409) throw new HttpError(409, 'Seu voto já foi registrado nesta votação.')
    throw error
  })
  return NextResponse.json({ ok: true })
})
