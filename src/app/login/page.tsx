'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Arrow, Label, Logo, Mark, useNavigate } from '@/components/ui'
import { useStore } from '@/lib/store'

export default function Login() {
  const navigate=useNavigate()
  const { ready, session, login } = useStore()
  const [email,setEmail]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)

  // Quem já está autenticado vai direto para a área de membros.
  useEffect(()=>{ if(ready&&session) navigate('membros') },[ready,session])

  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault()
    setError('');setBusy(true)
    const failure=await login(email,new FormData(e.currentTarget).get('password') as string)
    setBusy(false)
    if(failure)return setError(failure)
    navigate('membros')
  }
  return <div className="login"><section><Logo inverse/><div><Label>AMBIENTE DE MEMBROS</Label><h1>O Instituto,<br/>por dentro.</h1><p>Assembleias, decisões e documentos em um espaço reservado.</p></div><small>© 2025 Instituto Arcanimal</small></section><main><button className="back" onClick={()=>navigate('inicio')}>← Voltar ao site</button><form onSubmit={submit}><Mark/><h2>Acesse sua conta</h2><p>Use as credenciais cadastradas pela Secretaria.</p><label>E-mail<input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('')}} placeholder="nome@exemplo.com.br" autoComplete="username" required/></label><label>Senha<input name="password" type="password" placeholder="••••••••" autoComplete="current-password" required/></label>{error&&<p className="login-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy?'Entrando...':'Entrar no ambiente'} <Arrow/></button><small>O acesso é concedido pela Secretaria. Primeiro acesso: entre com a senha provisória recebida e defina a sua. Esqueceu a senha? Peça uma nova à Secretaria.</small></form></main></div>
}
