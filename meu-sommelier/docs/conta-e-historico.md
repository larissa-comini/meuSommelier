# Conta opcional e histórico por estabelecimento

## Fluxo implementado

O QR Code abre o estabelecimento. Visitantes escolhem seu perfil e conversam sem cadastro. A primeira tela e a lateral oferecem entrar ou criar conta. Durante uma conversa anônima aparece um convite para guardá-la.

Ao entrar na demonstração, a conversa atual é associada ao perfil sem duplicação. O perfil fica salvo, e entradas seguintes pelo QR abrem uma conversa nova diretamente. O histórico mostra conversas agrupadas por estabelecimento, título e data. A página inicial também permite retomar conversas sem ler outro QR, mesmo depois da visita. A troca de estabelecimento preserva as conversas salvas e separa os critérios da nova carta.

Sair oculta o histórico e limpa a conversa da tela, cancela operações pendentes e volta à entrada de visitante. Iniciar uma conversa nova mantém o perfil. Abrir uma conversa salva restaura mensagens, filtros e feedback. O acesso pelo identificador da conversa verifica simultaneamente a conta e o estabelecimento no repositório local.

## Limites da demonstração

Ainda não há backend nem provedor de autenticação configurado. O acesso é explicitamente identificado como demonstração local; não pede senha ou e-mail, não verifica identidade e não constitui autenticação real. Qualquer pessoa com acesso a este mesmo perfil local pode experimentar essa conta. Use somente dados de teste.

Na web, o estado fica no armazenamento deste navegador. No app, usa o adaptador local do Expo SQLite. Os dados não sincronizam entre dispositivos. Se a leitura do armazenamento falhar, o conteúdo anterior é preservado e a tela informa que os novos dados ficam em memória. Uma falha de gravação exibe a opção de tentar salvar novamente.

Os áudios temporários não são persistidos no histórico. Uma conversa retomada sinaliza quando havia uma mensagem de voz cujo arquivo já não está disponível. Texto, recomendações, preços históricos e feedback permanecem no snapshot salvo.

## Preços e catálogo

As mensagens guardam o preço da recomendação. A ficha lê o catálogo atual e informa mudanças de preço. Uma nova pesquisa sempre valida o catálogo atual, sem reaproveitar o estoque do snapshot. Um pedido para relembrar uma recomendação recupera somente os itens daquela conversa e identifica o preço como histórico.

## Contrato necessário para o backend

- Autenticação e criação de conta do cliente, recuperação de acesso, sessão e logout, separados da administração.
- Perfil salvo com nível de explicação, obtido da conta autenticada.
- Listagem e leitura de conversas do próprio usuário por estabelecimento, com paginação e snapshots de preços.
- Criação e atualização idempotentes das mensagens e adoção explícita da conversa anônima após login.
- Identidade derivada da autenticação no servidor, com checagem de proprietário e estabelecimento em toda operação. Os filtros locais não substituem autorização no servidor.
- Upload e retenção de áudio, transcrição, exclusão de histórico e política de retenção.

Não colocar credenciais de autenticação reais no armazenamento usado por esta demonstração. A versão de produção depende desses endpoints e da política de sessões apropriada a web e app.

## Verificação

Executados tipos, lint, testes dos mocks e geração web. Testados no navegador: visitante para conta sem perder a conversa, persistência após recarga, entrada com perfil salvo, duas cartas com históricos separados, retomada pela lateral e pela página inicial, lembrança de recomendação, ficha e retorno, rejeição de conversa pertencente a outro estabelecimento, saída e reentrada. Conferido o menu em 360 px. Android e iOS ainda precisam de execução em aparelhos; os filtros locais de propriedade não substituem testes de autorização no servidor.

## Telas de acesso (prévia)

O diálogo agora abre em Entrar, com uma aba Criar conta e um fluxo de recuperação de senha. O cadastro solicita nome, e-mail, senha, confirmação e nível de experiência. Campos inválidos recebem mensagens e foco; a senha pode ser mostrada ou ocultada. Trocar de fluxo limpa as senhas. Fechar desmonta o formulário, descartando os dados digitados.

Os formulários ainda não autenticam, não cadastram e não enviam recuperação: após validar, informam que o serviço está indisponível, sem exibir sucesso. Nenhuma credencial é enviada, persistida ou registrada em logs. O perfil local anterior permanece acessível em Conhecer a demonstração e não é apresentado como login real. A integração com o backend continua pendente.

Verificação das telas de acesso: tipos e lint aprovados; testes dos mocks e exportação web aprovados. No navegador, conferidos erros de campos vazios, confirmação divergente, mostrar/ocultar senha, aviso de cadastro indisponível, recuperação sem falso envio, retorno ao login, descarte de senha ao trocar fluxo e fechamento do formulário. Layout conferido em 390 px sem transbordamento horizontal. Login real, envio de e-mail e execução nativa permanecem pendentes.

## Configurações em tela cheia

A engrenagem ao lado do nome abre Preferências do chat: tipos de vinho, orçamento em uma lista simples e estilo das explicações ficam juntos, sem cartões separados. Conta e histórico ficam recolhidos. No celular, o menu lateral fecha antes da abertura. O formulário mantém alterações em rascunho: Salvar preferências é habilitado após uma mudança e aplica apenas os campos alterados à conversa atual, sem gerar uma recomendação automaticamente. Desfazer restaura as escolhas iniciais. O texto da busca e atualizações do chat em preferências não editadas são preservados. Voltar e o botão nativo de voltar descartam o rascunho. O histórico e as mensagens continuam no contexto da mesma conversa.

Conferidos no navegador desktop e em 390 px: abertura, salvar e reabrir com tipo/orçamento selecionados, voltar sem salvar, fechamento do drawer na abertura e acesso ao botão de salvar com conteúdo rolável. Tipos, lint e exportação web aprovados. Execução em Android/iOS ainda pendente.

## Vários tipos de vinho

Preferências de vinho permite marcar vários tipos, com seleção independente e indicação de marcado. Sem preferência limpa os tipos; nenhum tipo marcado permite todos. A busca aceita qualquer um dos tipos escolhidos e mantém orçamento, disponibilidade e isolamento por estabelecimento. O chat também reconhece pedidos como tinto ou branco. As mensagens exibem todos os tipos aplicados, e o histórico antigo de tipo único é convertido ao carregar, incluindo os filtros das recomendações salvas.

Verificados tipos, lint, testes de busca com branco e tinto, orçamento, preservação dos filtros, conversão do histórico antigo e geração web. No navegador, branco e tinto marcados produziram um Merlot e um Chardonnay na mesma resposta. Conferidos desmarcar um tipo, manter o outro e limpar com Sem preferência em 390 px.
