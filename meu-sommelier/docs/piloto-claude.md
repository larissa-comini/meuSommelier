# Piloto local com Claude

Casa da Uva é um estabelecimento fictício. A carta possui dez rótulos fictícios (um indisponível), com preços, uvas, corpo, acidez, taninos, doçura e harmonizações de demonstração. Não precisa de parceria comercial para esta etapa.

## Ativar a IA

1. Abra `server/.env.local` e preencha `ANTHROPIC_API_KEY=` com sua chave da Anthropic. Não envie a chave no chat. Esse arquivo é ignorado pelo Git e está fora dos arquivos de ambiente que o Expo carrega.
2. Dentro da pasta `meu-sommelier`, execute `npm run server` em um terminal. Após alterar a chave ou o modelo, reinicie esse servidor.
3. Para a prévia web, execute `npm run export:web` e `npm run preview` em outro terminal, caso a prévia ainda não esteja rodando. Abra `http://localhost:8081/e/casa-da-uva`.
4. Clique em **Usar Claude**. Isso começa uma nova conversa, preservando as anteriores no histórico local da conta de demonstração. O teste de conexão verifica configuração; o primeiro envio confirma acesso e créditos do provedor.

Sem chave, **Demonstração** continua funcionando por regras e sem consumo de IA. A tentativa de usar Claude explica a configuração pendente. Erros de chave, créditos, rede ou limite restauram o texto no campo; não há troca silenciosa para respostas simuladas.

Modelo padrão: `claude-haiku-5-5`, configurável em `ANTHROPIC_MODEL`. A integração usa `POST https://api.anthropic.com/v1/messages`, versão `2026-10-21`, com saída estruturada em `output_config.format`. Não há SDK adicional nem chave no frontend.

## Dados e limites

- Carta compartilhada entre frontend e servidor: `src/features/catalog/demo-catalog.json`. Ao editar, reinicie o servidor e gere a prévia novamente. Ainda é um arquivo JSON, não um banco de dados de produção.
- O app envia ao servidor a mensagem atual e até 12 mensagens de texto da conversa da carta atual, com os IDs dos rótulos previamente recomendados. Nomes de conta, e-mail e gravações não entram no pedido.
- A Anthropic recebe esse contexto e os vinhos disponíveis da carta atual quando o modo Claude está ativo.
- Cada resposta pode gerar até 1.600 tokens. Entradas limitadas a 2.000 caracteres por mensagem; histórico limitado; servidor aceita até duas consultas simultâneas e 20 tentativas por minuto. Não há repetição automática de chamada paga.
- O servidor valida os IDs e reconstrói os cartões com nome, preço e ficha do catálogo. Rejeita vinhos de outro estabelecimento, indisponíveis, repetidos ou fora dos tipos e orçamento retornados. A interpretação das preferências e a qualidade das explicações ainda precisam de testes com o modelo real; essas regras não garantem ausência de erros no texto livre.
- Tokens de entrada e saída das respostas bem-sucedidas aparecem no rodapé e no terminal do servidor. O custo estimado em USD soma o valor calculado individualmente para cada resposta; **Ver custos** mostra a última resposta, o modelo e as tarifas. O contador é da sessão atual e zera ao abrir uma nova conversa; não é uma fatura. Chamadas com erro ou canceladas podem ter consumo no provedor. Confira o custo efetivo no console da Anthropic.
- Para Haiku 5.5, as tarifas verificadas em 22/10/2026 são US$ 0,10 por milhão de tokens de entrada e US$ 0,50 por milhão de saída para contextos até 100 mil tokens. Acima disso, US$ 0,50 e US$ 2,50. O cálculo inclui as categorias de cache quando retornadas pelo provedor. Outros modelos exibem custo indisponível até cadastrar suas tarifas em `server/pricing.cjs`. Preços podem mudar.
- O campo **Câmbio de referência em reais por dólar** é opcional: preencha, por exemplo, `5,00` para simular a conversão. Não há consulta de cotação nem inclusão de impostos, IOF ou taxas de cartão. Valores muito pequenos são exibidos com seis casas em USD e quatro em BRL para não arredondar prematuramente para zero.
- As conversas da conta de demonstração continuam salvas apenas neste aparelho. Autenticação real, sincronização, transcrição e voz de IA não fazem parte desta etapa.

## Roteiro de apresentação

1. “Vou comer peixe grelhado e quero gastar até 120 reais. O que você sugere?”
2. “Qual dessas opções é mais leve? Explica sem termos técnicos.”
3. “Agora quero um tinto para churrasco até 200 reais.”
4. “Tem algum por até 50 reais?” — conferir se informa a falta de opção.
5. “Quero o Reserva indisponível.” — conferir se não recomenda esse rótulo.
6. Abrir **Ver vinho**, conferir ficha e preço, voltar à conversa e enviar uma avaliação.

## Executar verificações

`npm run lint`, `npm run typecheck`, `npm test` e `npm run export:web`.

Os testes do servidor substituem a chamada externa por respostas controladas e não usam créditos. A conversa real só pode ser validada após configurar uma chave com acesso ao modelo.

Este servidor escuta somente em `127.0.0.1`, para apresentação no computador local. Não é uma implantação pública: para um piloto com clientes, ainda são necessários hospedagem com HTTPS, autenticação/limites por usuário, banco de dados e controle de orçamento. Em dispositivos físicos, localhost aponta para o próprio aparelho; será necessária uma API acessível e a configuração de `EXPO_PUBLIC_API_URL`.

O servidor local prioriza IPv4 e desativa a seleção automática de família de endereço apenas no seu processo Node. Isso evita o tempo limite da rota IPv6 observado nesta rede; a resolução DNS e a validação TLS continuam normais. Falhas de conexão são identificadas como indisponibilidade da Anthropic, com o rascunho preservado. Não há reenvio automático de consultas pagas.

Referências: [Messages API](https://platform.claude.com/docs/en/api/messages/create), [saídas estruturadas](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Claude Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview).
