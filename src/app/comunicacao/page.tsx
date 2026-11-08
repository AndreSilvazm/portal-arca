'use client'

import { useMemo, useState } from 'react'
import Shell from '@/components/Shell'
import { Arrow, HeroPage } from '@/components/ui'
import { publications } from '@/lib/data'

export default function Communications() {
  const [filter,setFilter]=useState('Todos')
  const [query,setQuery]=useState('')
  const filtered=useMemo(()=>publications.filter(p=>(filter==='Todos'||p[0]===filter)&&p[2].toLowerCase().includes(query.toLowerCase())),[filter,query])
  return <Shell><HeroPage number="03" label="COMUNICAÇÃO" title={<>Informação para<br/><em>acompanhar de perto.</em></>} text="Notícias, comunicados e registros oficiais do Instituto Arcanimal."/><section className="archive"><div className="archive-tools"><label><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar publicação"/></label><nav>{['Todos','Notícia','Comunicado','Assembleia','Resultado','Resolução'].map(x=><button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</nav></div><div className="archive-head"><span>PUBLICAÇÕES RECENTES</span><span>{filtered.length} REGISTROS</span></div>{filtered.map((p,i)=><article className="archive-row" key={p[2]}><span>{String(i+1).padStart(2,'0')}</span><div><small>{p[0]} · {p[1]}</small><h2>{p[2]}</h2><p>Informações e documentos relacionados a esta publicação institucional.</p></div><button><Arrow/></button></article>)}</section></Shell>
}
