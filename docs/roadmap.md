# Estado e próximos passos

## Arquitetura atual

```
Navegador (Next.js)  ──fetch──►  /api/* (rotas Next, servidor Node)  ──Admin SDK──►  Firestore + Storage
        ▲                              │
        └── cookie httpOnly com JWT ◄──┘  (login e hash de senha próprios)
```

- Login, tabela `users`, hash scrypt e JWT: **próprios** ([autenticacao.md](autenticacao.md)).
- Firestore e Storage: só o servidor acessa; as regras negam todo o resto ([regras-firestore.md](regras-firestore.md)).
- O navegador atualiza o estado a cada 15 s, ao voltar à aba e após cada ação.

## Já funcionando

Login/logout, troca obrigatória de senha, cadastro e redefinição de senha de membros, grupos e permissões por tela, feed, comunicados, decisões, assembleias, documentos em pastas, votações (voto secreto e único, encerramento, apuração, PDF de resultado) e anexos com download protegido.

## Próximos passos

0. **Abertura automática (opcional):** hoje a Secretaria libera a votação manualmente. Se um dia quiser que abra sozinha na data prevista, dá para ligar a liberação ao campo `opensAt`.

1. **Tempo real de verdade:** trocar o polling de 15 s por SSE/WebSocket se a espera incomodar.
2. **Segurança de conta:** 2FA para a Secretaria, contador de tentativas compartilhado entre instâncias, rotação do `AUTH_SECRET`.
3. **Auditoria:** registrar logins, redefinições de senha, quem criou/encerrou votações e publicou conteúdo.
4. **Recuperação de senha por e-mail:** hoje a Secretaria redefine manualmente; exige um serviço de e-mail transacional.
5. **Site público:** a lista de pessoas em início/governança ainda é fixa no código.
6. **Quórum e critérios de votação:** hoje é maioria simples; parametrizar por votação se o estatuto exigir outro critério.
7. **Testes:** automatizar os fluxos críticos (login, voto repetido, grupo fora da audiência, votação encerrada, leitura sem permissão).
8. **Publicação:** o portal precisa de um servidor Node; definir o ambiente com a infraestrutura.
