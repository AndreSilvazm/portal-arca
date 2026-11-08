'use client'

import { useMemo, useState } from 'react'
import { Page } from '@/components/Posts'
import { openDoc } from '@/lib/files'
import { Arrow } from '@/components/ui'
import { canSee, folders, folderScreen, formatDate, formatSize, PostType, useStore } from '@/lib/store'

type Row = { name: string; size: number; path?: string; origin: string; date: string }

const postFolder: Record<PostType, string> = { 'Ata de reunião': 'Atas de reunião', 'Decisão': 'Decisões', 'Comunicado oficial': 'Comunicados' }
const hints: Record<string, string> = {
  'Atas de reunião': 'Registros das reuniões e assembleias.',
  'Decisões': 'Decisões da Diretoria e das assembleias.',
  'Comunicados': 'Anexos de comunicados oficiais.',
  'Pautas de votação': 'Documentos anexados às votações.',
  'Institucional': 'Estatuto, políticas e outros documentos.',
}

export default function Documentos() {
  const { session, posts, polls, documents, addDocuments } = useStore()
  const [folder, setFolder] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Cada pasta junta os anexos de publicações/pautas com os arquivos enviados direto para ela.
  const byFolder = useMemo(() => {
    const map: Record<string, Row[]> = Object.fromEntries(folders.map(f => [f, []]))
    posts.forEach(p => p.files.forEach(f => map[postFolder[p.type]].push({ ...f, origin: p.title, date: p.createdAt })))
    polls.forEach(p => p.documents.forEach(f => map['Pautas de votação'].push({ ...f, origin: p.title, date: p.createdAt })))
    documents.forEach(d => map[d.folder]?.push({ name: d.name, size: d.size, path: d.path, origin: 'Enviado pela Secretaria', date: d.createdAt }))
    Object.values(map).forEach(rows => rows.sort((a, b) => b.date.localeCompare(a.date)))
    return map
  }, [posts, polls, documents])

  const visibleFolders = folders.filter(f => session && canSee(session, folderScreen[f]))
  const rows = (folder ? byFolder[folder] : []).filter(r => r.name.toLowerCase().includes(query.toLowerCase()))

  if (folder && !visibleFolders.includes(folder as (typeof folders)[number])) setFolder(null)

  return <Page active="Documentos" label="ARQUIVO" title={folder ?? 'Documentos'} text={folder ? hints[folder] : 'Documentos do Instituto organizados por pasta.'}
    action={folder && <button onClick={() => { setFolder(null); setQuery('') }}>← Todas as pastas</button>}>
    {!folder
      ? <div className="folder-grid">{visibleFolders.map(f => <button key={f} onClick={() => setFolder(f)}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <strong>{f}</strong><small>{byFolder[f].length} {byFolder[f].length === 1 ? 'documento' : 'documentos'}</small>
        </button>)}</div>
      : <>
        <div className="doc-tools"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nesta pasta"/></div>
        {session?.admin && <label className="folder-upload">{uploading ? 'Enviando...' : '+ Enviar documentos para esta pasta'}<input type="file" multiple onChange={async e => { const picked = Array.from(e.target.files ?? []); e.target.value = ''; setUploading(true); setUploadError((await addDocuments(folder, picked)) ?? ''); setUploading(false) }}/></label>}
        {uploadError && <p className="error" role="alert">{uploadError}</p>}
        <div className="doc-table">{rows.length ? rows.map((r, i) => <button key={`${r.name}-${i}`} onClick={() => openDoc(r)}>
          <b>{r.name.split('.').pop()?.toUpperCase().slice(0, 4)}</b>
          <span><strong>{r.name}</strong><small>{r.origin}</small></span>
          <em>{formatSize(r.size)} · {formatDate(r.date)}</em><Arrow/>
        </button>) : <p className="empty">Nenhum documento nesta pasta.</p>}</div>
      </>}
  </Page>
}
