'use client'

import { FormEvent, Fragment, useRef, useState } from 'react'
import { Label } from './ui'
import { formatSize, PostType, useStore } from '@/lib/store'

export const postTypes: PostType[] = ['Comunicado oficial', 'Decisão', 'Ata de reunião']

// Seleção de arquivos: guarda os File até o envio (o upload para o Cloud Storage acontece ao salvar).
export function Files({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  return <div className="admin-files">
    <input type="file" multiple onChange={e => onChange(Array.from(e.target.files ?? []))}/>
    {files.length > 0 && <ul>{files.map(f => <li key={f.name}><span>{f.name}</span><small>{formatSize(f.size)}</small></li>)}</ul>}
  </div>
}

// Códigos de emoji colados do Slack/WhatsApp (:alarm_clock:) viram o emoji; códigos desconhecidos ficam como estão.
const EMOJI: Record<string, string> = {
  spiral_calendar_pad: '🗓️', calendar: '📅', date: '📅', alarm_clock: '⏰', clock: '🕒', round_pushpin: '📍', pushpin: '📌', memo: '📝',
  loudspeaker: '📢', mega: '📣', bell: '🔔', warning: '⚠️', white_check_mark: '✅', heavy_check_mark: '✔️', x: '❌', point_right: '👉',
  link: '🔗', paperclip: '📎', page_facing_up: '📄', file_folder: '📁', ballot_box: '🗳️', raised_hands: '🙌', clap: '👏', tada: '🎉',
  paw_prints: '🐾', dog: '🐶', cat: '🐱', heart: '❤️', star: '⭐', rotating_light: '🚨', computer: '💻', video_camera: '📹', house: '🏠', office: '🏢',
}
const withEmoji = (text: string) => text.replace(/:([a-z0-9_+-]+):/g, (all, name) => EMOJI[name] ?? all)

// Texto com **negrito** e emojis. É renderizado como elementos React (nunca como HTML), então não há injeção de markup.
// As quebras de linha são preservadas pelo CSS (white-space: pre-wrap) de cada lugar onde o texto aparece.
export function RichText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{withEmoji(part.slice(2, -2))}</strong>
      : <Fragment key={i}>{withEmoji(part)}</Fragment>)}</>
}

export function RichEditor({ value, onChange, rows = 6 }: { value: string; onChange: (value: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const bold = () => {
    const el = ref.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end } = el
    const selected = value.slice(start, end)
    const wrapped = selected.startsWith('**') && selected.endsWith('**') && selected.length > 4
    const next = wrapped
      ? value.slice(0, start) + selected.slice(2, -2) + value.slice(end)
      : value.slice(0, start) + `**${selected || 'texto em negrito'}**` + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const from = wrapped ? start : start + 2
      el.setSelectionRange(from, from + (wrapped ? selected.length - 4 : selected.length || 'texto em negrito'.length))
    })
  }

  return <div className="rich-editor">
    <div className="rich-toolbar"><button type="button" onClick={bold} aria-label="Negrito" title="Negrito (Ctrl+B)"><b>B</b></button><small>Selecione o texto e clique em B para deixar em negrito.</small></div>
    <textarea ref={ref} value={value} rows={rows} required onChange={e => onChange(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); bold() } }}/>
    {value.includes('**') && <div className="rich-preview"><span>PRÉVIA</span><p><RichText text={value}/></p></div>}
  </div>
}

export default function PostForm({ onCreated, initialType = 'Comunicado oficial' }: { onCreated: () => void; initialType?: PostType }) {
  const { createPost } = useStore()
  const [type, setType] = useState<PostType>(initialType)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const failure = await createPost({ type, title: title.trim(), text: text.trim() }, files)
    setBusy(false)
    if (failure) return setError(failure)
    onCreated()
  }

  return <form className="admin-form" onSubmit={submit}>
    <Label>NOVA PUBLICAÇÃO NO FEED</Label>
    <label>Tipo<select value={type} onChange={e => setType(e.target.value as PostType)}>{postTypes.map(t => <option key={t}>{t}</option>)}</select></label>
    <label>Título<input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Título da publicação"/></label>
    <div className="field"><span>Descrição</span><RichEditor value={text} onChange={setText}/></div>
    <div className="field"><span>Anexos</span><Files files={files} onChange={setFiles}/></div>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? 'Publicando...' : 'Publicar no feed'}</button>
  </form>
}
