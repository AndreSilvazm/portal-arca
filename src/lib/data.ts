export type Group = 'Diretoria Executiva' | 'Conselho Fiscal' | 'Associados' | 'Colaboradores' | 'Voluntários'

export type Member = { name: string; role: string; group: Group; initials: string; image?: string }

export const members: Member[] = [
  { name: 'André Simão', role: 'Diretor de Secretaria', group: 'Diretoria Executiva', initials: 'AS', image: '/team/andre.png' },
  { name: 'Carine Zanotto', role: 'Presidente', group: 'Diretoria Executiva', initials: 'CZ', image: '/team/carine.png' },
  { name: 'Sarah Borges', role: 'Tesoureira', group: 'Diretoria Executiva', initials: 'SB', image: '/team/sarah.png' },
  { name: 'Roni Pires', role: 'Vice-presidente', group: 'Diretoria Executiva', initials: 'RP', image: '/team/roni.png' },
  { name: 'Alberto Lemos', role: 'Engenharia de Software', group: 'Colaboradores', initials: 'AL', image: '/team/alberto.png' },
  { name: 'Eduardo Zanotto', role: 'Engenharia de Software', group: 'Colaboradores', initials: 'EZ', image: '/team/eduardo.png' },
]

export const publications = [
  ['Notícia', '28 MAI 2025', 'Arcanimal inicia novo ciclo de projetos em tecnologia aberta'],
  ['Comunicado', '19 MAI 2025', 'Agenda institucional para o segundo semestre'],
  ['Assembleia', '08 MAI 2025', 'Convocação para Assembleia Geral Ordinária'],
  ['Resultado', '24 ABR 2025', 'Resultado do processo eleitoral 2025'],
  ['Resolução', '11 ABR 2025', 'Resolução da Diretoria Executiva nº 04/2025'],
]

export const groups: Group[] = ['Diretoria Executiva', 'Conselho Fiscal', 'Associados', 'Colaboradores', 'Voluntários']


