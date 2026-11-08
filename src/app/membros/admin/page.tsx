'use client'

import { FormEvent, useState } from 'react'
import WorkspaceShell from '@/components/Workspace'
import { Label } from '@/components/ui'
import { Assemblies, Permissions } from '@/components/AdminExtras'
import PostForm, { Files } from '@/components/PostForm'
import { Group, groups } from '@/lib/data'
import { generateResultPdf } from '@/lib/resultPdf'
import { audienceLabel, formatDate, formatSize, pollStatus, Poll, totalVotes, useStore, voteOptions } from '@/lib/store'

type Tab = 'Nova votação' | 'Gerenciar votações' | 'Nova publicação' | 'Assembleias' | 'Membros' | 'Permissões'
const tabs: Tab[] = ['Nova votação', 'Gerenciar votações', 'Nova publicação', 'Assembleias', 'Membros', 'Permissões']
function NewPoll({ onCreated }: { onCreated: () => void }) {
  const { createPoll } = useStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meeting, setMeeting] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [docs, setDocs] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [all, setAll] = useState(true)
  const [selected, setSelected] = useState<Group[]>([])
  const [error, setError] = useState('')

  const toggle = (g: Group) => setSelected(s => (s.includes(g) ? s.filter(x => x !== g) : [...s, g]))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!all && !selected.length) return setError('Selecione ao menos um grupo que poderá votar.')
    if (new Date(endsAt).getTime() <= Date.now()) return setError('O encerramento precisa ser uma data futura.')
    if (opensAt && new Date(opensAt).getTime() >= new Date(endsAt).getTime()) return setError('A abertura prevista precisa ser antes do encerramento.')
    setBusy(true); setError('')
    const failure = await createPoll({ title: title.trim(), description: description.trim(), meeting: meeting.trim(), opensAt: opensAt || undefined, endsAt, audience: { all, groups: all ? [] : selected } }, docs)
    setBusy(false)
    if (failure) return setError(failure)
    onCreated()
  }

  return <form className="admin-form" onSubmit={submit}>
    <Label>NOVA VOTAÇÃO</Label>
    <label>Título da pauta<input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex.: Aprovação do orçamento 2026"/></label>
    <label>Descrição<textarea value={description} onChange={e => setDescription(e.target.value)} required rows={5} placeholder="Explique o que está sendo decidido."/></label>
    <fieldset><legend>Quem poderá votar</legend>
      <label className={`check ${all ? 'selected' : ''}`}><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)}/><span>Todos os membros</span></label>
      {!all && <div className="group-picker">{groups.map(g => <label className={`check ${selected.includes(g) ? 'selected' : ''}`} key={g}><input type="checkbox" checked={selected.includes(g)} onChange={() => toggle(g)}/><span>{g}</span></label>)}</div>}
    </fieldset>
    <label>Abertura prevista (opcional)<input type="datetime-local" value={opensAt} onChange={e => setOpensAt(e.target.value)}/></label>
    <label>Encerramento<input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required/></label>
    <label>Reunião de apresentação (opcional)<input value={meeting} onChange={e => setMeeting(e.target.value)} placeholder="Ex.: Quarta, 18 de junho · 17h · Reunião online"/></label>
    <div className="field"><span>Documentos da pauta</span><Files files={docs} onChange={setDocs}/></div>
    <p className="hint">A votação é criada como <b>agendada</b>: os membros não a veem nem podem votar até você liberá-la em Gerenciar votações. A abertura prevista é só um lembrete para você.</p>
    <p className="hint">Opções de voto: {voteOptions.join(' · ')}. Voto secreto, sem alteração após a confirmação.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? 'Criando...' : 'Criar votação agendada'}</button>
  </form>
}

function Manage() {
  const { polls, closePoll, releasePoll, deletePoll, accounts } = useStore()
  const [error, setError] = useState('')
  const run = async (task: Promise<string | null>) => { setError((await task) ?? '') }
  const [busy, setBusy] = useState('')
  const secretary = accounts.find(a => a.admin) ?? { name: 'Secretaria', role: 'Diretor de Secretaria' }
  const pdf = async (p: Poll) => { setBusy(p.id); try { await generateResultPdf(p, secretary) } finally { setBusy('') } }
  const [confirming, setConfirming] = useState('')
  if (!polls.length) return <p className="empty">Nenhuma votação criada ainda.</p>
  return <><div className="admin-list">{polls.map(p => {
    const status = pollStatus(p)
    const open = status === 'open'
    const scheduled = status === 'scheduled'
    return <article key={p.id}>
      <div className="poll-status"><i/> {scheduled ? 'AGENDADA · NÃO LIBERADA' : p.closedAt ? 'ENCERRADA PELA SECRETARIA' : open ? 'ABERTA' : 'ENCERRADA (PRAZO)'}</div>
      <h3>{p.title}</h3>
      <dl><div><dt>Podem votar</dt><dd>{audienceLabel(p)}</dd></div>{scheduled && p.opensAt && <div><dt>Abertura prevista</dt><dd>{formatDate(p.opensAt)}</dd></div>}<div><dt>{open || scheduled ? 'Encerra em' : 'Encerrada em'}</dt><dd>{formatDate(p.closedAt ?? p.endsAt)}</dd></div>{!scheduled && <div><dt>Participação</dt><dd>{p.total} {p.total === 1 ? 'pessoa' : 'pessoas'}</dd></div>}</dl>
      {scheduled
        ? confirming === p.id
          ? <div className="confirm"><span>Excluir esta votação agendada?</span><button onClick={() => { run(deletePoll(p.id)); setConfirming('') }}>Sim, excluir</button><button className="ghost" onClick={() => setConfirming('')}>Cancelar</button></div>
          : <div className="poll-actions"><button className="release" onClick={() => run(releasePoll(p.id))}>Liberar votação para os membros</button><button className="ghost" onClick={() => setConfirming(p.id)}>Excluir</button></div>
        : open
        ? confirming === p.id
          ? <div className="confirm"><span>Encerrar agora? Ninguém mais poderá votar.</span><button onClick={() => { closePoll(p.id); setConfirming('') }}>Sim, encerrar</button><button className="ghost" onClick={() => setConfirming('')}>Cancelar</button></div>
          : <button className="danger" onClick={() => setConfirming(p.id)}>Encerrar votação</button>
        : <div className="results">{voteOptions.map(o => { const n = p.counts[o] ?? 0, t = totalVotes(p); return <div key={o}><div><span>{o}</span><b>{n} · {t ? Math.round((n / t) * 100) : 0}%</b></div><i style={{ width: `${t ? (n / t) * 100 : 0}%` }}/></div> })}</div>}
      {status === 'closed' && <button className="pdf" disabled={busy === p.id} onClick={() => pdf(p)}>{busy === p.id ? 'Gerando PDF...' : 'Gerar PDF do resultado'}</button>}
      {status === 'closed' && (confirming === p.id
        ? <div className="confirm"><span>Excluir esta votação e a apuração? Não dá para desfazer.</span><button onClick={() => { run(deletePoll(p.id)); setConfirming('') }}>Sim, excluir</button><button className="ghost" onClick={() => setConfirming('')}>Cancelar</button></div>
        : <button className="ghost" onClick={() => setConfirming(p.id)}>Excluir votação</button>)}
      {scheduled && <small>Os membros não veem esta votação até você liberá-la.</small>}
      {open && <small>O resultado só é exibido após o encerramento, para preservar o sigilo da apuração.</small>}
    </article>
  })}</div>{error && <p className="error" role="alert">{error}</p>}</>
}

function People() {
  const { accounts, createAccount, resetMemberPassword, setAccountActive, setAccountGroup, permissions } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [group, setGroup] = useState<Group>('Associados')
  const [error, setError] = useState('')
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error: failure, tempPassword } = await createAccount({ name: name.trim(), email, role: role.trim(), group })
    setBusy(false)
    if (failure || !tempPassword) { setIssued(null); return setError(failure ?? 'Não foi possível cadastrar.') }
    setError(''); setIssued({ name: name.trim(), password: tempPassword }); setName(''); setEmail(''); setRole('')
  }
  const reset = async (id: string, who: string) => {
    const { error: failure, tempPassword } = await resetMemberPassword(id)
    if (failure || !tempPassword) return setError(failure ?? 'Não foi possível redefinir.')
    setError(''); setIssued({ name: who, password: tempPassword })
  }
  return <>
    <form className="admin-form" onSubmit={submit}>
      <Label>NOVO MEMBRO</Label>
      <label>Nome completo<input value={name} onChange={e => setName(e.target.value)} required/></label>
      <label>E-mail de acesso<input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} required placeholder="nome@exemplo.com.br"/></label>
      <label>Cargo ou função<input value={role} onChange={e => setRole(e.target.value)} required placeholder="Ex.: Associada"/></label>
      <label>Grupo<select value={group} onChange={e => setGroup(e.target.value as Group)}>{groups.map(g => <option key={g}>{g}</option>)}</select></label>
      <p className="hint">O grupo define quais telas a pessoa vê (ajuste na aba Permissões) e, em cada votação, se ela pode votar. Telas liberadas para este grupo: {['Feed', ...permissions[group]].filter((x, i, all) => all.indexOf(x) === i).join(', ')}.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Cadastrando...' : 'Cadastrar membro'}</button>
    </form>
    {issued && <div className="temp-password" role="status"><b>Senha provisória de {issued.name}</b><code>{issued.password}</code><p>Copie e envie por um canal seguro. Ela aparece só desta vez; no primeiro acesso a pessoa será obrigada a trocá-la.</p><button type="button" onClick={() => navigator.clipboard?.writeText(issued.password)}>Copiar</button><button type="button" className="ghost" onClick={() => setIssued(null)}>Fechar</button></div>}
    <div className="admin-list people-list">{accounts.map(a => <article key={a.id}>
      <div><h3>{a.name}</h3><small>{a.email} · {a.role}</small></div>
      {!a.admin && <select className="group-select" value={a.group} aria-label={'Grupo de ' + a.name} onChange={e => setAccountGroup(a.id, e.target.value as Group)}>{groups.map(g => <option key={g}>{g}</option>)}</select>}
      {a.admin ? <span className="badge">Secretaria</span>
        : <><button className="ghost" onClick={() => reset(a.id, a.name)}>Redefinir senha</button><button className={a.active ? 'danger' : ''} onClick={() => setAccountActive(a.id, !a.active)}>{a.active ? 'Desativar acesso' : 'Reativar acesso'}</button></>}
    </article>)}</div>
  </>
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('Nova votação')
  const [notice, setNotice] = useState('')
  const done = (message: string, next: Tab) => { setNotice(message); setTab(next) }

  return <WorkspaceShell active="Administração" adminOnly>
    <div className="admin">
      <div className="feed-title"><div><Label>SECRETARIA</Label><h1>Administração</h1><p>Crie votações, publique comunicados, agende encontros e defina quem acessa o quê.</p></div></div>
      <div className="feed-filters">{tabs.map(t => <button className={tab === t ? 'active' : ''} onClick={() => { setTab(t); setNotice('') }} key={t}>{t}</button>)}</div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {tab === 'Nova votação' && <NewPoll onCreated={() => done('Votação criada como agendada. Os membros só a veem depois que você clicar em Liberar.', 'Gerenciar votações')}/>}
      {tab === 'Gerenciar votações' && <Manage/>}
      {tab === 'Membros' && <People/>}
      {tab === 'Assembleias' && <Assemblies/>}
      {tab === 'Permissões' && <Permissions/>}
      {tab === 'Nova publicação' && <PostForm key={notice} onCreated={() => done('Publicação criada no feed.', 'Nova publicação')}/>}
    </div>
  </WorkspaceShell>
}
