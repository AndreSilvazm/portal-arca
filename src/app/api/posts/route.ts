import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { filesOf, saveFiles } from '@/server/files'
import { HttpError, requireUser, route } from '@/server/session'
import { postTypes, postTypeSlug, PostType } from '@/lib/shared'

export const POST = route(async req => {
  await requireUser(req, { admin: true })
  const form = await req.formData()
  const type = String(form.get('type')) as PostType
  const title = String(form.get('title') ?? '').trim()
  const text = String(form.get('text') ?? '').trim()
  if (!postTypes.includes(type)) throw new HttpError(400, 'Tipo de publicação inválido.')
  if (!title || !text) throw new HttpError(400, 'Preencha título e descrição.')

  const files = await saveFiles(`posts/${postTypeSlug[type]}`, filesOf(form))
  await db().collection('posts').add({ type, title, text, files, author: 'Secretaria do Instituto', createdAt: new Date().toISOString() })
  return NextResponse.json({ ok: true })
})
