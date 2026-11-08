import type { Poll } from './store'
import { audienceLabel, formatSize, totalVotes, voteOptions } from './store'

const NAVY: [number, number, number] = [8, 24, 105]
const GREY: [number, number, number] = [95, 100, 125]
const YELLOW: [number, number, number] = [252, 194, 24]
const TEMPLATE = '/templates-pdf/resultado-votacao.png'

const fullDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

async function loadTemplate() {
  const blob = await (await fetch(TEMPLATE)).blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Maioria simples: compara aprovações e rejeições; abstenções não decidem.
function outcome(poll: Poll) {
  const yes = poll.counts[voteOptions[0]] ?? 0
  const no = poll.counts[voteOptions[1]] ?? 0
  if (!totalVotes(poll)) return 'SEM VOTOS REGISTRADOS'
  if (yes === no) return 'EMPATE'
  return yes > no ? 'PAUTA APROVADA' : 'PAUTA REJEITADA'
}

export async function generateResultPdf(poll: Poll, secretary: { name: string; role: string }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 14
  const width = 182
  let y = 84

  doc.addImage(await loadTemplate(), 'PNG', 0, 0, 210, 297, undefined, 'FAST')

  const text = (value: string, size: number, opts: { bold?: boolean; color?: [number, number, number]; x?: number; max?: number; gap?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(size).setTextColor(...(opts.color ?? NAVY))
    const lines = doc.splitTextToSize(value, opts.max ?? width) as string[]
    doc.text(lines, opts.x ?? left, y)
    y += lines.length * size * 0.41 + (opts.gap ?? 0)
  }
  const label = (value: string) => { y += 1; text(value.toUpperCase(), 7, { bold: true, color: GREY, gap: 0.5 }) }

  text(poll.title, 15, { bold: true, gap: 3 })

  const description = poll.description.length > 420 ? `${poll.description.slice(0, 417)}...` : poll.description
  text(description, 9, { color: GREY, gap: 3 })

  const ended = poll.closedAt ? `Encerrada pela Secretaria em ${fullDate(poll.closedAt)}` : `Encerrada por prazo em ${fullDate(poll.endsAt)}`
  label('Quem podia votar'); text(audienceLabel(poll), 9.5, { gap: 1 })
  label('Encerramento'); text(ended, 9.5, { gap: 1 })
  label('Participação'); text(`${totalVotes(poll)} ${totalVotes(poll) === 1 ? 'voto registrado' : 'votos registrados'} · votação secreta · maioria simples`, 9.5, { gap: 4 })

  // Resultado por opção
  const total = totalVotes(poll)
  doc.setDrawColor(...YELLOW).setLineWidth(0.6).line(left, y - 2, left + 20, y - 2)
  y += 3
  voteOptions.forEach(option => {
    const count = poll.counts[option] ?? 0
    const pct = total ? (count / total) * 100 : 0
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...NAVY).text(option, left, y)
    doc.setFont('helvetica', 'bold').text(`${count}  ·  ${Math.round(pct)}%`, left + width - 40, y)
    doc.setFillColor(226, 230, 248).rect(left, y + 1.8, width - 45, 2.6, 'F')
    if (pct > 0) doc.setFillColor(...YELLOW).rect(left, y + 1.8, ((width - 45) * pct) / 100, 2.6, 'F')
    y += 9.5
  })

  y += 1
  doc.setFillColor(...NAVY).rect(left, y - 4.5, width, 9, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(255, 255, 255).text(`RESULTADO: ${outcome(poll)}`, left + 4, y + 1.4)
  y += 11

  if (poll.documents.length) {
    label('Documentos da pauta')
    text(poll.documents.slice(0, 5).map(d => `• ${d.name} (${formatSize(d.size)})`).join('\n'), 8.5, { color: GREY })
  }

  // Assinatura fixa na parte baixa da área branca do template
  const sigY = 212
  doc.setDrawColor(...NAVY).setLineWidth(0.3).line(left, sigY, left + 85, sigY)
  doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...NAVY).text(secretary.name, left, sigY + 5)
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...GREY).text(`${secretary.role} · Instituto Arcanimal`, left, sigY + 9.5)
  doc.text('Data: ____ / ____ / ________', left, sigY + 15)

  doc.save(`resultado-votacao-${poll.id}.pdf`)
}
