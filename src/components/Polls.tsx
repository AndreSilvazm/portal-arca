'use client'

import { FormEvent, useState } from 'react'
import { RichText } from './PostForm'
import { Arrow, Label } from './ui'
import { openDoc } from '@/lib/files'
import { audienceLabel, canVote, formatDate, formatSize, pollStatus, Poll, Session, totalVotes, useStore, voteOptions } from '@/lib/store'

export function Results({ poll }: { poll: Poll }) {
  const total = totalVotes(poll)
  return <div className="results">
    {voteOptions.map(option => {
      const count = poll.counts[option] ?? 0
      const pct = total ? Math.round((count / total) * 100) : 0
      return <div key={option}><div><span>{option}</span><b>{count} · {pct}%</b></div><i style={{ width: `${pct}%` }}/></div>
    })}
    <small>{total} {total === 1 ? 'voto' : 'votos'} registrados</small>
  </div>
}

export function PollCard({ poll, session, onOpen }: { poll: Poll; session: Session; onOpen: () => void }) {
  const status = pollStatus(poll)
  const open = status === 'open'
  const scheduled = status === 'scheduled'
  const voted = poll.voted
  const eligible = canVote(poll, session)
  return <section className="poll-preview">
    <div className="poll-status"><i/> {scheduled ? 'AGENDADA · AINDA NÃO LIBERADA' : open ? 'VOTAÇÃO ABERTA' : 'VOTAÇÃO ENCERRADA'}</div>
    <h3>{poll.title}</h3>
    <dl><div><dt>Podem votar</dt><dd>{audienceLabel(poll)}</dd></div>{scheduled && poll.opensAt && <div><dt>Abertura prevista</dt><dd>{formatDate(poll.opensAt)}</dd></div>}<div><dt>{open || scheduled ? 'Encerra em' : 'Encerrada em'}</dt><dd>{formatDate(poll.closedAt ?? poll.endsAt)}</dd></div></dl>
    {open && eligible && voted ? <div className="voted-small">Voto registrado com segurança.</div>
      : open && !eligible ? <div className="voted-small">Esta votação não está aberta ao seu grupo.</div>
      : <button className="vote-button" onClick={onOpen}>{scheduled ? 'Ver pauta (só você vê)' : open ? 'Ver pauta e votar' : 'Ver pauta e resultado'} <Arrow/></button>}
    {open && eligible && <small>Seu voto é secreto e não será associado ao seu perfil.</small>}
  </section>
}

export function PollPage({ poll, session, onBack }: { poll: Poll; session: Session; onBack: () => void }) {
  const { vote } = useStore()
  const [choice, setChoice] = useState('')
  const status = pollStatus(poll)
  const open = status === 'open'
  const scheduled = status === 'scheduled'
  const eligible = canVote(poll, session)
  const voted = poll.voted
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!choice) return; setError(''); const failure = await vote(poll.id, choice); if (failure) setError(failure) }

  return <div className="vote-page">
    <button className="vote-back" onClick={onBack}>← Voltar para votações</button>
    <div className="vote-page-head"><div><div className="poll-status"><i/> {scheduled ? 'AGENDADA · AINDA NÃO LIBERADA' : open ? 'VOTAÇÃO ABERTA' : 'VOTAÇÃO ENCERRADA'}</div><h1>{poll.title}</h1><p><RichText text={poll.description}/></p></div><dl>{scheduled && poll.opensAt && <div><dt>Abertura prevista</dt><dd>{formatDate(poll.opensAt)}</dd></div>}<div><dt>{open || scheduled ? 'Encerra em' : 'Encerrada em'}</dt><dd>{formatDate(poll.closedAt ?? poll.endsAt)}</dd></div><div><dt>Quem pode votar</dt><dd>{audienceLabel(poll)}</dd></div><div><dt>Tipo</dt><dd>Maioria simples</dd></div></dl></div>
    <div className="vote-page-layout"><div className="vote-materials">
      {poll.documents.length > 0 && <section className="supporting"><div className="material-title"><div><span>01 / DOCUMENTOS DA PAUTA</span><h2>Consulte antes de votar</h2><p>Estes documentos foram disponibilizados pelo Instituto para orientar sua decisão.</p></div></div><div className="support-grid">{poll.documents.map(d => <button key={d.path ?? d.name} type="button" onClick={() => openDoc(d)}><b>{d.name.split('.').pop()?.toUpperCase().slice(0, 4)}</b><span><strong>{d.name}</strong><small>{formatSize(d.size)}</small></span><em>↓</em></button>)}</div></section>}
      {poll.meeting && <section className="meeting-link"><div><span>02 / REUNIÃO DE APRESENTAÇÃO</span><h2>Tire dúvidas antes da votação</h2><p><RichText text={poll.meeting}/></p></div></section>}
      {status === 'closed' && <section className="agenda-context"><span>RESULTADO</span><h2>Apuração final</h2><Results poll={poll}/></section>}
    </div><aside className="ballot-panel"><form onSubmit={submit}>
      {scheduled ? <div className="vote-confirmation"><Label>AINDA NÃO LIBERADA</Label><h2>Esta votação está agendada.</h2><p>Os membros só a veem e podem votar depois que você a liberar em Administração → Gerenciar votações.</p></div>
        : !open ? <div className="vote-confirmation"><Label>VOTAÇÃO ENCERRADA</Label><h2>Esta votação foi encerrada.</h2><p>O resultado está disponível ao lado da pauta.</p></div>
        : !eligible ? <div className="vote-confirmation"><Label>SEM ELEGIBILIDADE</Label><h2>Você não pode votar nesta pauta.</h2><p>Esta votação é restrita a: {audienceLabel(poll)}.</p></div>
        : voted ? <div className="vote-confirmation"><div>✓</div><Label>VOTO REGISTRADO</Label><h2>Seu voto foi recebido.</h2><p>A escolha foi registrada de forma secreta. A confirmação de participação não revela como você votou.</p><button type="button" onClick={onBack}>Voltar às votações</button></div>
        : <><Label>CÉDULA DE VOTAÇÃO</Label><h2>Registre seu voto</h2><div className="privacy-note"><b>Votação secreta</b><p>Sua elegibilidade é validada separadamente. A escolha não fica associada ao seu perfil.</p></div><div className="eligible-user"><span>VOCÊ ESTÁ APTO A VOTAR</span><b>{session.name} · {session.group}</b></div><fieldset><legend>Selecione uma opção</legend>{voteOptions.map(x => <label className={choice === x ? 'selected' : ''} key={x}><input type="radio" name="vote" value={x} checked={choice === x} onChange={e => setChoice(e.target.value)}/><span>{x}</span></label>)}</fieldset><button className="submit-vote" type="submit" disabled={!choice}>Confirmar voto secreto</button><small>Após confirmar, seu voto não poderá ser alterado.</small>{error && <p className="error" role="alert">{error}</p>}</>}
    </form></aside></div>
  </div>
}

