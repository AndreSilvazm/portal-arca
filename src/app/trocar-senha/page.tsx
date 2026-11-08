'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Arrow, Label, Logo, Mark, useNavigate } from '@/components/ui'
import { useStore } from '@/lib/store'

export default function TrocarSenha() {
  const navigate = useNavigate()
  const { ready, session, changePassword, logout } = useStore()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (ready && !session) navigate('login') }, [ready, session])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const next = String(form.get('next'))
    if (next !== form.get('confirm')) return setError('A confirmação não confere com a nova senha.')
    setError(''); setBusy(true)
    const failure = await changePassword(String(form.get('current')), next)
    setBusy(false)
    if (failure) return setError(failure)
    navigate('membros')
  }

  return <div className="login"><section><Logo inverse/><div><Label>PRIMEIRO ACESSO</Label><h1>Defina a sua<br/>senha.</h1><p>A senha provisória enviada pela Secretaria vale só para este passo.</p></div><small>© 2025 Instituto Arcanimal</small></section><main><button className="back" onClick={async()=>{await logout();navigate('inicio')}}>← Sair</button><form onSubmit={submit}><Mark/><h2>Nova senha</h2><p>Use pelo menos 8 caracteres.</p>
    <label>Senha atual (provisória)<input name="current" type="password" autoComplete="current-password" required/></label>
    <label>Nova senha<input name="next" type="password" autoComplete="new-password" minLength={8} required/></label>
    <label>Confirme a nova senha<input name="confirm" type="password" autoComplete="new-password" minLength={8} required/></label>
    {error && <p className="login-error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar e entrar'} <Arrow/></button></form></main></div>
}
