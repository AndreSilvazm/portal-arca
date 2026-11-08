import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { HttpError, requireUser, route } from '@/server/session'
import { assemblyKinds } from '@/lib/shared'

export const POST = route(async req => {
  await requireUser(req, { admin: true })
  const body = await req.json().catch(() => ({}))
  const kind = String(body.kind ?? '')
  const startsAt = String(body.startsAt ?? '')
  const place = String(body.place ?? '').trim()
  if (!(assemblyKinds as readonly string[]).includes(kind)) throw new HttpError(400, 'Tipo de encontro inválido.')
  if (Number.isNaN(new Date(startsAt).getTime()) || !place) throw new HttpError(400, 'Informe data, hora e local.')

  await db().collection('assemblies').add({
    kind, startsAt, place,
    title: String(body.title ?? '').trim() || kind,
    agenda: String(body.agenda ?? '').trim(),
    createdAt: new Date().toISOString(),
  })
  return NextResponse.json({ ok: true })
})
