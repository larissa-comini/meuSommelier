# Meu Sommelier

Frontend em React Native, Expo e TypeScript para Android, iOS e web.

O guia original propõe web responsiva e deixa aplicativo nativo fora do MVP. A decisão de 21/10/2026 é começar com uma base universal, conforme solicitado, mantendo a jornada por QR Code no navegador.

## Primeira entrega

Protótipo público com dados fictícios explicitamente identificados. Estabelecimento por slug, conversa por texto, preferências na lateral, até três resultados no histórico, ficha e feedback local. Conta opcional de demonstração com perfil salvo e histórico persistido neste aparelho, agrupado por estabelecimento; o visitante pode entrar mantendo sua conversa. Captura e prévia de mensagens de voz implementadas; transcrição e IA ainda dependem do backend. Veja `meu-sommelier/docs/chat-e-audio.md` e `meu-sommelier/docs/conta-e-historico.md`.

## Executar

```sh
cd meu-sommelier
npm install
npm start
```

Use o QR do servidor de desenvolvimento com Expo Go para abrir no celular, ou `npm run web` para o navegador. O QR de desenvolvimento é diferente do futuro QR público do estabelecimento.

## Piloto local com Claude

Carta fictícia ampliada, servidor local e integração opcional com a Anthropic preparados. Consulte [o guia do piloto](docs/piloto-claude.md) para configurar a chave em server/.env.local e usar o botão Usar Claude. O modo Demonstração continua sem IA; a API real depende de chave e créditos. Execute npm run server para iniciar o servidor local.

## Administração e importação

Acesse /admin/login para administrar o catálogo do seu estabelecimento. O piloto agora oferece login protegido, edição de vinhos, configurações e importação de PDF digital, XML, XLSX e CSV com prévia e confirmação. O banco local fica em server/data e não entra no Git. Consulte [administração e importação](docs/administracao.md).

## Próximas etapas

1. Validar a jornada e identidade visual.
2. Receber a OpenAPI do backend e substituir os mocks por endpoints `/api/v1`.
3. Construir administração, catálogo e importação com prévia.
4. Validar em dispositivos reais e preparar distribuição nas lojas.

NestJS, Prisma e PostgreSQL continuam como proposta do backend. A primeira entrega não incluía servidor nem IA. O piloto local agora tem um servidor mínimo para Claude; autenticação real e publicação continuam pendentes. O contrato de autenticação administrativa móvel precisa ser acordado: a proposta de cookie do guia é voltada à web.

## Verificação da primeira entrega

`npm run typecheck`, `npm run lint`, `npm test` e `npm run export:web` disponíveis dentro de `meu-sommelier`. Após exportar, `npm run preview` serve a versão web em http://localhost:8081.

Validados no navegador: pesquisa até o detalhe e feedback, filtros sem resultado, troca de modo com critérios preservados, erro e recuperação, isolamento entre estabelecimentos e larguras de 360, 768 e 1280 px. Android e iOS ainda precisam de teste em dispositivos; não há declaração de conformidade WCAG nesta etapa.

Pendência antes do piloto: `npm audit --omit=dev` reportou 19 alertas altos na árvore do template, incluindo cadeias de ferramentas Expo/Metro. As correções sugeridas pelo audit incluem mudanças incompatíveis de SDK. Revisar as versões e os avisos antes da publicação; não foi aplicado downgrade automático.
