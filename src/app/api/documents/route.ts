import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { filesOf, saveFiles } from '@/server/files'
import { HttpError, requireUser, route } from '@/server/session'
import { folders, folderSlug } from '@/lib/shared'

// Envia arquivos direto para uma pasta da tela Documentos.
export const POST = route(async req => {
  await requireUser(req, { admin: true })
  const form = await req.formData()
  const folder = String(form.get('folder'))
  if (!(folders as readonly string[]).includes(folder)) throw new HttpError(400, 'Pasta inválida.')
  const files = filesOf(form)
  if (!files.length) throw new HttpError(400, 'Selecione ao menos um arquivo.')

  const saved = await saveFiles(`documents/${folderSlug[folder]}`, files)
  const batch = db().batch()
  saved.forEach(doc => batch.set(db().collection('documents').doc(), { ...doc, folder, createdAt: new Date().toISOString() }))
  await batch.commit()
  return NextResponse.json({ ok: true })
})
