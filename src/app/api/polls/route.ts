import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { filesOf, saveFiles } from '@/server/files'
import { HttpError, requireUser, route } from '@/server/session'
import { groups } from '@/lib/data'

export const POST = route(async req => {
  await requireUser(req, { admin: true })
  const form = await req.formData()
  const title = String(form.get('title') ?? '').trim()
  const description = String(form.get('description') ?? '').trim()
  const meeting = String(form.get('meeting') ?? '').trim()
  const endsAt = new Date(String(form.get('endsAt') ?? ''))
  const opensRaw = String(form.get('opensAt') ?? '')
  const opensAt = opensRaw ? new Date(opensRaw) : null
  let audience: { all: boolean; groups: string[] }
  try { audience = JSON.parse(String(form.get('audience'))) } catch { throw new HttpError(400, 'Público da votação inválido.') }

  if (!title || !description) throw new HttpError(400, 'Preencha título e descrição.')
  if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) throw new HttpError(400, 'O encerramento precisa ser uma data futura.')
  if (opensAt && (Number.isNaN(opensAt.getTime()) || opensAt.getTime() >= endsAt.getTime())) throw new HttpError(400, 'A abertura prevista precisa ser antes do encerramento.')
  const valid = audience.all ? [] : audience.groups.filter(g => groups.includes(g as (typeof groups)[number]))
  if (!audience.all && !valid.length) throw new HttpError(400, 'Selecione ao menos um grupo que poderá votar.')

  const documents = await saveFiles('polls', filesOf(form))
  const ref = db().collection('polls').doc()
  const batch = db().batch()
  batch.set(ref, { title, description, meeting, documents, endsAt: endsAt.toISOString(), opensAt: opensAt ? opensAt.toISOString() : null, releasedAt: null, closedAt: null, audience: { all: !!audience.all, groups: valid }, createdAt: new Date().toISOString() })
  batch.set(ref.collection('tally').doc('counts'), { aprovo: 0, rejeito: 0, abstencao: 0, total: 0 })
  await batch.commit()
  return NextResponse.json({ ok: true, id: ref.id })
})
