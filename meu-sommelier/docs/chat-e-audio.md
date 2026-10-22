# Conversa e mensagens de voz

A jornada principal agora é um chat. O usuário escreve livremente ou grava uma mensagem de até um minuto, pode ouvir a prévia, descartar ou adicionar o áudio à conversa local. Preferências por tipo, preço e perfil ficam recolhidas. Os cartões da carta aparecem dentro do histórico.

As preferências ficam na barra lateral esquerda. No celular e no tablet, o botão no cabeçalho abre a lateral; o botão de fechar, o toque fora e Escape/voltar a fecham. Aplicar preferências também fecha a lateral no celular, preservando a conversa e o texto digitado.

Antes do primeiro chat, a sessão anônima pergunta “Quanto você conhece de vinhos?”, com as opções “Estou começando” e “Já conheço vinhos”. A resposta define o perfil da sessão e pode ser alterada na lateral. Iniciar uma nova conversa preserva o perfil. O acesso opcional de demonstração usa o perfil local salvo e pula essa pergunta. A autenticação real e a sincronização ainda dependem do backend; os limites e o contrato estão em `conta-e-historico.md`.

## O que funciona nesta entrega

- Histórico em memória por estabelecimento; retorno da ficha preserva a conversa.
- Exemplos de conversa reconhecem tipo, orçamento, alguns nomes de uva e origem. O orçamento é preservado em mensagens seguintes. Negação, ambiguidades e pedidos de harmonização sem informação suficiente geram uma pergunta.
- Seleção determinística usando somente vinhos ativos e disponíveis do mock. Campos ausentes continuam sem preenchimento por suposição.
- Solicitação de microfone somente após tocar em gravar. Gravação, parada, prévia, reprodução, descarte e mensagem local de áudio usam os módulos oficiais do Expo.
- Permissão negada e falha de captura são exibidas no compositor sem apagar o texto. Ao sair da tela ou deixar o app em segundo plano, uma gravação em andamento é interrompida. Ao limpar a conversa, os áudios locais associados são liberados.

## Integração ainda necessária

Não há upload, transcrição, processamento da fala, voz sintetizada nem resposta de IA nesta entrega. Nenhum áudio é enviado a um servidor. A mensagem de confirmação no chat informa isso explicitamente.

Antes de ligar ao backend, acordar na OpenAPI: envio autenticado de áudio, formatos aceitos por plataforma, limite de tamanho e duração, idempotência, cancelamento, estados de transcrição, texto reconhecido editável, retenção e exclusão. O áudio só deve chegar ao serviço de transcrição pelo backend, sem chaves de provedor no app. Texto transcrito confirmado deve entrar no mesmo fluxo de mensagens e recomendações, preservando o isolamento do estabelecimento.

## Validação

Tipos, lint, build web e testes dos mocks e do vocabulário demonstrativo executados. Conferida a jornada por texto no navegador, com retorno da ficha, feedback, critérios sem resultado e aplicação dos filtros. Microfone real e fluxo nativo de Android/iOS precisam de validação em aparelhos. O navegador exige HTTPS ou localhost e suporte de gravação de áudio.
