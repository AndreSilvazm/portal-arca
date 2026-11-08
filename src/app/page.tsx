'use client'

import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { Arrow, Label, LinkButton, Page, Photo, useNavigate } from '@/components/ui'
import { members, publications } from '@/lib/data'

export default function Home() {
  const navigate=useNavigate()
  const [personIndex,setPersonIndex]=useState(0)
  const [heroPerson,setHeroPerson]=useState(0)
  const carouselPeople=[0,1,2].map(offset=>members[(personIndex+offset)%members.length])
  useEffect(()=>{
    const timer=window.setInterval(()=>setHeroPerson(current=>(current+1)%members.length),3000)
    return()=>window.clearInterval(timer)
  },[])
  const featuredPerson=members[heroPerson]
  return <Shell>
    <section className="home-hero portal-hero">
      <div className="hero-copy"><Label>AMBIENTE INSTITUCIONAL</Label><h1>Portal<br/><em>Arcanimal.</em></h1><p>Informações, pessoas e documentos do Instituto reunidos em um só lugar.</p><div className="hero-actions"><button className="hero-primary" onClick={() => navigate('login')}>Acessar área de membros <Arrow/></button></div></div>
      <div className="people-wall">
        <div className="people-wall-head"><span>QUEM SOMOS</span><b>{members.length} PESSOAS · UM INSTITUTO</b></div>
        <div className="hero-person" key={featuredPerson.name}>
          <div className="hero-person-photo">{featuredPerson.image?<Photo member={featuredPerson}/>:<span>{featuredPerson.initials}</span>}</div>
          <div className="hero-person-info"><small>{String(heroPerson+1).padStart(2,'0')} / {String(members.length).padStart(2,'0')}</small><h2>{featuredPerson.name}</h2><p>{featuredPerson.role}</p></div>
        </div>
        <div className="hero-person-nav">{members.map((person,index)=><button className={index===heroPerson?'active':''} key={person.name} onClick={()=>setHeroPerson(index)} aria-label={`Ver ${person.name}`}><i/></button>)}</div>
      </div>
      <div className="hero-index"><span>PORTAL INSTITUCIONAL</span><span>INFORMAÇÃO</span><span>GOVERNANÇA</span><b>ARC — 2025</b></div>
    </section>
    <section className="portal-access">
      <div className="access-intro"><Label>ACESSOS DO PORTAL</Label><h2>Encontre o que precisa.</h2></div>
      <div className="access-list">
        {[['01','Governança','Diretoria, conselho fiscal e associados.','governanca'],['02','Comunicação','Notícias, comunicados e convocações.','comunicacao'],['03','Transparência','Documentos e registros institucionais.','transparencia'],['04','Área de membros','Assembleias e decisões internas.','login']].map(x=><button key={x[0]} onClick={() => navigate(x[3] as Page)}><span>{x[0]}</span><div><h3>{x[1]}</h3><p>{x[2]}</p></div><Arrow/></button>)}
      </div>
    </section>
    <section className="meet-us">
      <div className="meet-us-head"><div><Label>QUEM FAZ O ARCANIMAL</Label><h2>Conheça cada um de nós.</h2><p>Pessoas com experiências diferentes, reunidas pelo mesmo propósito.</p></div><div className="carousel-controls"><span>{String(personIndex+1).padStart(2,'0')} / {String(members.length).padStart(2,'0')}</span><button onClick={()=>setPersonIndex((personIndex-1+members.length)%members.length)}>←</button><button onClick={()=>setPersonIndex((personIndex+1)%members.length)}>→</button></div></div>
      <div className="profile-carousel">{carouselPeople.map((person,index)=><article key={`${person.name}-${personIndex}-${index}`}><div className="profile-photo">{person.image?<Photo member={person}/>:<svg viewBox="0 0 240 280" aria-hidden><circle cx="120" cy="102" r="54"/><path d="M35 280c5-84 37-121 85-121s80 37 85 121"/></svg>}<span>{person.initials}</span><small>{String((personIndex+index)%members.length+1).padStart(2,'0')}</small></div><div className="profile-copy"><small>{person.group}</small><h3>{person.name}</h3><b>{person.role}</b><p>Conheça sua trajetória, experiência e contribuição para o trabalho desenvolvido pelo Instituto Arcanimal.</p></div></article>)}</div>
    </section>
    <section className="home-update"><div><Label>ATUALIZAÇÃO RECENTE</Label><h2>{publications[0][2]}</h2><span>{publications[0][0]} · {publications[0][1]}</span></div><LinkButton page="comunicacao">Ver comunicações</LinkButton></section>
  </Shell>
}
