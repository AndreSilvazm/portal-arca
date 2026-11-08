import Shell from '@/components/Shell'
import { Arrow, HeroPage, Label } from '@/components/ui'

export default function Transparency() {
  const docs=[['Estatuto Social','Documento institucional','PDF · 1,4 MB'],['Relatório de Atividades 2024','Relatórios','PDF · 3,1 MB'],['Demonstrações Financeiras 2024','Prestação de contas','PDF · 2,2 MB'],['Política de Governança','Políticas institucionais','PDF · 840 KB'],['Resoluções da Diretoria','Decisões','Arquivo digital']]
  return <Shell><HeroPage number="04" label="TRANSPARÊNCIA" title={<>Documentos claros.<br/><em>Confiança construída.</em></>} text="Consulte documentos, políticas e registros públicos do Instituto."/><section className="documents"><div className="doc-intro"><Label>ARQUIVO INSTITUCIONAL</Label><p>Materiais organizados por natureza e período para tornar a consulta simples e rastreável.</p></div>{docs.map((d,i)=><button className="doc-row" key={d[0]}><span>0{i+1}</span><small>{d[1]}</small><b>{d[0]}</b><em>{d[2]}</em><Arrow/></button>)}</section></Shell>
}
