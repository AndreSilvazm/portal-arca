# Autenticação própria (senha com hash + JWT)

O login é feito pelo próprio portal, sem Firebase Authentication. O Firebase entra só como banco (Firestore) e arquivos (Storage), acessado **apenas pelo servidor**.

## Tabela de usuários

Coleção `users` no Firestore (veja [modelo-de-dados.md](modelo-de-dados.md)). Cada usuário tem `passwordHash`, nunca a senha. O hash nunca é enviado ao navegador.

## Senha com hash

- Algoritmo: **scrypt** (nativo do Node), N=16384, r=8, p=1, salt aleatório de 16 bytes, chave de 64 bytes.
- Formato salvo: `scrypt$N$r$p$salt$hash` (base64). Os parâmetros ficam no próprio valor, então dá para endurecer o custo no futuro sem invalidar senhas antigas.
- Comparação em tempo constante (`timingSafeEqual`). Código em `src/server/password.mjs`.
- Política: mínimo de 8 caracteres.

## Login e JWT

1. `POST /api/auth/login` recebe e-mail e senha, busca o usuário e confere o hash.
2. Se valer e o acesso estiver ativo, o servidor emite um **JWT HS256** assinado com `AUTH_SECRET` (emissor `portal-arcanimal`, validade de 8 horas, `sub` = id do usuário, `tv` = versão do token).
3. O JWT vai num cookie **httpOnly**, `SameSite=Lax` e `Secure` em produção. O JavaScript do navegador não consegue lê-lo.
4. A cada requisição o servidor valida a assinatura e **recarrega o usuário do banco**: conta desativada, grupo alterado ou `tv` diferente derrubam a sessão na hora.

### Invalidação de sessão (`tokenVersion`)

`tokenVersion` sobe quando a pessoa troca a senha, quando a Secretaria redefine a senha dela ou desativa o acesso. Todos os JWT antigos passam a ser recusados.

## Cadastro e senha provisória

- A Secretaria cadastra o membro em **Administração → Membros**. O servidor gera uma **senha provisória aleatória**, guarda só o hash e mostra a senha **uma única vez** à Secretaria, que a repassa por canal seguro.
- No primeiro acesso a pessoa é obrigada a trocar a senha (`mustChangePassword`): enquanto não trocar, a API recusa tudo, menos a troca (`POST /api/auth/password`).
- Esqueceu a senha: a Secretaria usa **Redefinir senha** na lista de membros e gera outra provisória. Não há e-mail automático.

## Proteções

- **Força bruta:** 5 falhas por IP + e-mail bloqueiam novas tentativas por 5 minutos (em memória; vale por instância do servidor — para vários servidores, mover o contador para o banco ou um cache compartilhado).
- **Enumeração de e-mail:** resposta única "e-mail ou senha incorretos" e hash calculado mesmo quando o e-mail não existe (tempo de resposta parecido).
- **CSRF:** cookie `SameSite=Lax` e as rotas que alteram dados recusam `Origin` diferente do site.
- **Autorização no servidor:** toda rota confere papel e permissão por tela. O front só esconde o que a pessoa não pode usar.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `AUTH_SECRET` | Segredo do JWT (mínimo 32 caracteres, aleatório). Trocá-lo derruba todas as sessões. Gere com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |

## Pendências

- 2FA/TOTP para a Secretaria.
- Rotação do `AUTH_SECRET` sem derrubar sessões (aceitar dois segredos por um período).
- Contador de tentativas compartilhado entre instâncias.
- Registro de auditoria de logins e redefinições de senha.
