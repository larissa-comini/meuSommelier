# Meu Sommelier

Piloto de um sommelier por conversa, feito com React Native, Expo e TypeScript para web, Android e iOS. O código do aplicativo e o servidor local ficam em [`meu-sommelier/`](meu-sommelier/).

## O que já funciona

- Marca `ms.`, conversa por texto e envio com Enter (Shift + Enter quebra a linha na web).
- Duas cartas fictícias, com dez rótulos na Casa da Uva, fichas, preços e disponibilidade.
- Modo de demonstração por regras e integração opcional com o Claude da Anthropic.
- Recomendações com até três vinhos da carta e validação de preço, disponibilidade e filtros nos cartões.
- Consumo de tokens, custo estimado em dólares e conversão opcional para reais com câmbio informado.
- Preferências, feedback e conta de demonstração com histórico salvo neste aparelho.
- Gravação e reprodução local de mensagens de voz, ainda sem transcrição.

## Rodar a prévia web

Requer Node.js 22.13 ou superior, compatível com Expo SDK 58.

```sh
cd meu-sommelier
npm ci
npm run export:web
npm run preview
```

Abra [localhost:8081](http://localhost:8081). A demonstração funciona sem chave de IA.

Para desenvolver com atualização automática, use `npm run web` no lugar da exportação e da prévia. Para testar com Expo Go, use `npm start`.

## Ativar Claude no piloto local

1. Copie `meu-sommelier/server/.env.example` para `meu-sommelier/server/.env.local`.
2. Preencha `ANTHROPIC_API_KEY` nesse arquivo, somente no seu computador.
3. Em outro terminal, dentro de `meu-sommelier`, execute `npm run server`.
4. Na conversa, clique em **Usar Claude**. Após cada resposta, **Ver custos** mostra os detalhes do consumo.

Nunca coloque a chave em variáveis `EXPO_PUBLIC_` nem no frontend. Os arquivos de ambiente locais são ignorados pelo Git. O servidor escuta apenas no computador local; o envio do código ao GitHub não hospeda o aplicativo.

O [guia do piloto](meu-sommelier/docs/piloto-claude.md) descreve configuração, limites, tarifas de referência e roteiro de apresentação. A carta de demonstração fica em [`demo-catalog.json`](meu-sommelier/src/features/catalog/demo-catalog.json).

## Verificações

Dentro de `meu-sommelier`:

```sh
npm run lint
npm run typecheck
npm test
npm run export:web
```

Os testes automatizados usam respostas controladas e não consomem créditos de IA. As conversas reais com Claude usam a API da conta configurada.

## Limites desta etapa

Estabelecimentos, vinhos e preços são fictícios. Conta e histórico são locais, sem autenticação real ou sincronização. Banco de dados, administração do catálogo, transcrição de áudio e publicação para clientes ainda são próximas etapas. Android e iOS precisam de validação em dispositivos reais.

Consulte também a [documentação do aplicativo](meu-sommelier/README.md), o [fluxo de conversa e áudio](meu-sommelier/docs/chat-e-audio.md) e o [histórico de demonstração](meu-sommelier/docs/conta-e-historico.md).
