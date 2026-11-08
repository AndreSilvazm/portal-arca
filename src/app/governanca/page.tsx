import Shell from '@/components/Shell'
import { HeroPage, Photo } from '@/components/ui'
import { Group, members } from '@/lib/data'

export default function Governance() {
  return <Shell><HeroPage number="02" label="GOVERNANÇA" title={<>Pessoas que orientam.<br/><em>Estruturas que sustentam.</em></>} text="Conheça a composição atual das instâncias de governança do Instituto Arcanimal."/><section className="people-section">{(['Diretoria Executiva','Colaboradores'] as Group[]).map((group,gi)=><div className="people-group" key={group}><div className="group-title"><span>0{gi+1}</span><h2>{group}</h2><p>{members.filter(m=>m.group===group).length} integrantes</p></div><div className="people">{members.filter(m=>m.group===group).map((m,i)=><article key={i}><div className="avatar">{m.image?<Photo member={m}/>:m.initials}</div><div><h3>{m.name}</h3><p>{m.role}</p></div></article>)}</div></div>)}</section></Shell>
}
