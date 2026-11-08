# Papéis, grupos e permissões

## Papéis

| Papel | Quem | O que faz |
|---|---|---|
| Secretaria (`admin: true`) | Diretor de Secretaria | Acessa todas as telas e a **Administração**: cria votações, encerra, publica, agenda assembleias, cadastra membros, define permissões |
| Membro | Demais pessoas cadastradas | Vê as telas liberadas para o grupo dele |

A Administração é exclusiva da Secretaria e não é delegável.

## Grupos

`Diretoria Executiva`, `Conselho Fiscal`, `Associados`, `Colaboradores`, `Voluntários`. O grupo é escolhido ao cadastrar o membro e pode ser trocado depois na lista de membros.

## Telas por grupo (padrão)

| Tela | Diretoria | Conselho Fiscal | Associados | Colaboradores | Voluntários |
|---|:-:|:-:|:-:|:-:|:-:|
| Feed (sempre) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Votações | ✓ | ✓ | ✓ | | |
| Comunicados | ✓ | ✓ | ✓ | ✓ | ✓ |
| Assembleias | ✓ | ✓ | ✓ | | |
| Documentos | ✓ | ✓ | ✓ | ✓ | |
| Decisões | ✓ | ✓ | ✓ | | |
| Eleições e resultados | ✓ | ✓ | ✓ | | |

A Secretaria ajusta a matriz em **Administração → Permissões**.

## Efeito de uma permissão

Liberar uma tela libera também o conteúdo dela em outros lugares:

- **Feed:** só mostra publicações dos tipos cujas telas a pessoa vê (Comunicado → *Comunicados*; Decisão → *Decisões*; Ata → *Documentos*), e só mostra votações/próximo encontro se ela vê *Votações*/*Assembleias*.
- **Documentos:** cada pasta segue a tela correspondente (Atas e Institucional → *Documentos*; Decisões → *Decisões*; Comunicados → *Comunicados*; Pautas de votação → *Votações*).
- **Assembleias:** as atas só aparecem para quem vê *Documentos*.

## Votações agendadas e liberação

Uma votação nasce **agendada**: os membros não a veem, não baixam os anexos e não podem votar. Só a Secretaria vê a pauta e decide quando **liberar** (Administração → Gerenciar votações). A "abertura prevista" é apenas um lembrete; nada abre automaticamente.

## Votar é outra permissão

Ver a tela *Votações* não basta para votar. Cada votação define a quais grupos se destina (`Todos os membros` ou grupos específicos). Fora da audiência a pessoa vê a pauta, mas não a cédula. O voto é secreto e único por pessoa.

## Onde é aplicado

A permissão é aplicada no servidor: `GET /api/state` só devolve publicações, pastas, assembleias e votações que o grupo pode ver, e `GET /api/files` confere a tela de cada arquivo. A interface apenas esconde os itens correspondentes.
