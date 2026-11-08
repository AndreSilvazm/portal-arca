'use client'

import { FormEvent, useState } from 'react'
import { Label } from './ui'
import { RichEditor } from './PostForm'
import { groups } from '@/lib/data'
import { assemblyKinds, formatDate, screens, useStore } from '@/lib/store'

export function Assemblies() {
  const { assemblies, createAssembly, removeAssembly } = useStore()
  const [kind, setKind] = useState<string>(assemblyKinds[0])
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [place, setPlace] = useState('')
  const [agenda, setAgenda] = useState('')
  const [removing, setRemoving] = useState('')

  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const failure = await createAssembly({ kind, title: title.trim() || kind, startsAt, place: place.trim(), agenda: agenda.trim() })
    if (failure) return setError(failure)
    setTitle(''); setStartsAt(''); setPlace(''); setAgenda('')
  }

  return <>
    <form className="admin-form" onSubmit={submit}>
      <Label>NOVA ASSEMBLEIA OU REUNIÃO</Label>
      <label>Tipo<select value={kind} onChange={e => setKind(e.target.value)}>{assemblyKinds.map(k => <option key={k}>{k}</option>)}</select></label>
      <label>Título (opcional)<input value={title} onChange={e => setTitle(e.target.value)} placeholder={kind}/></label>
      <label>Data e hora<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required/></label>
      <label>Local ou link<input value={place} onChange={e => setPlace(e.target.value)} required placeholder="Ex.: Reunião online ou endereço"/></label>
      <div className="field"><span>Pauta / convocação</span><RichEditor value={agenda} onChange={setAgenda} rows={5}/></div>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">Agendar encontro</button>
    </form>
    <div className="admin-list people-list">{assemblies.map(a => <article key={a.id}>
      <div><h3>{a.title}</h3><small>{a.kind} · {formatDate(a.startsAt)} · {a.place}</small></div>
      {removing === a.id
        ? <div className="confirm"><button onClick={() => { removeAssembly(a.id); setRemoving('') }}>Remover</button><button className="ghost" onClick={() => setRemoving('')}>Cancelar</button></div>
        : <button className="danger" onClick={() => setRemoving(a.id)}>Remover</button>}
    </article>)}</div>
  </>
}

export function Permissions() {
  const { permissions, setPermission } = useStore()
  return <div className="admin-form permissions">
    <Label>PERMISSÕES POR GRUPO</Label>
    <p className="hint">Marque as telas que cada grupo pode ver na área de membros. O Feed é sempre liberado e a Administração é exclusiva da Secretaria. Quem tem acesso a uma tela também vê as pastas e publicações dela.</p>
    <div className="perm-table" role="table">
      <div className="perm-row head" role="row"><span/>{screens.map(s => <span key={s}>{s}</span>)}</div>
      {groups.map(g => <div className="perm-row" role="row" key={g}>
        <strong>{g}</strong>
        {screens.map(s => <label key={s} className="perm-cell"><input type="checkbox" disabled={s === 'Feed'} checked={s === 'Feed' || permissions[g].includes(s)} onChange={e => setPermission(g, s, e.target.checked)} aria-label={`${g}: ${s}`}/></label>)}
      </div>)}
    </div>
    <p className="hint">Votar continua dependendo de cada votação: a Secretaria escolhe, pauta a pauta, quais grupos podem votar.</p>
  </div>
}
