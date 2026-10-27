# Administração e importação de cartas

Implementação das etapas F04 e F05 do **Meu Sommelier Guia de desenvolvimento Frontend**, versão 1.0 de 21/10/2026. A área administrativa é separada da conta de demonstração do cliente. O estabelecimento é obtido da sessão autenticada, nunca de um slug escolhido pelo navegador.

## Acesso e provisionamento

Abra `http://localhost:8081/admin/login`. O servidor precisa estar rodando com `npm run server` e a prévia com `npm run preview` após `npm run export:web`.

O primeiro acesso solicitado foi criado localmente. As credenciais estão em `server/admin-access.local.txt`, ignorado pelo Git. O banco e as sessões ficam em `server/data/sommelier.sqlite`, também fora do Git. A senha fica armazenada no banco apenas como hash com salt e scrypt.

Para criar outro estabelecimento e seu administrador, execute localmente:

```sh
npm run admin:create -- --email admin@exemplo.com --slug meu-restaurante --name "Responsável" --establishment "Meu Restaurante"
```

Um identificador novo cria um estabelecimento com a carta vazia. Um identificador existente cria acesso apenas àquela carta. O comando não sobrescreve contas existentes. O provisionamento é feito pelo responsável pelo ambiente; não há cadastro administrativo público nem permissão global para editar outro estabelecimento.

## Sessão e recuperação

- Sessão de oito horas em cookie HttpOnly, SameSite=Lax, com Secure quando `NODE_ENV=production`. O frontend envia `credentials: include`.
- Token CSRF somente em memória, enviado no cabeçalho `X-CSRF-Token` de alterações. Origens são verificadas no servidor. Nenhum token administrativo é guardado em localStorage.
- Login e recuperação têm limites por endereço de origem. Login inválido usa mensagem genérica. A sessão é invalidada no logout e após redefinir a senha.
- A recuperação registra a solicitação e gera um link de uso único válido por 30 minutos, salvo no diretório privado `server/data/reset-outbox`. No piloto, o responsável fornece esse link ao titular; **não existe envio automático de e-mail**. A senha nova deve ser escolhida pelo titular na página `/admin/reset`.
- Rotas protegidas tratam 401, 403, 404, 409, 413, 429 e indisponibilidade. Os erros têm `code`, `message`, `fieldErrors` e `requestId`.

Este acesso foi validado no navegador. A integração administrativa em aplicativos nativos ainda exige validar o transporte de cookies e a política de origem. Para produção, são necessários HTTPS, serviço de e-mail, gestão operacional de contas e hospedagem adequados.

## Catálogo

`/admin/catalog` tem busca por nome, SKU ou uva, paginação de 20 registros e filtros de ativo/disponível. O editor exige SKU único na carta, nome, tipo, estilo, preço, moeda, ativo e disponibilidade. Os atributos opcionais permanecem nulos quando não cadastrados.

Os estilos publicados em `/admin/vocabularies` são `seco`, `meio_seco`, `doce`, `brut` e `demi_sec`; a moeda do piloto é BRL. Preços são inteiros em centavos na API. Faixas sensoriais são de 1 a 5. Validações são feitas no formulário e repetidas no servidor.

Cada edição envia a versão completa do vinho. Se outra sessão alterou a ficha, o servidor retorna 409; recarregue a ficha antes de salvar. Ativo e disponível são controles diferentes. A carta pública se atualiza ao salvar nesta janela e consulta alterações a cada 15 segundos nas outras janelas. A IA revalida a carta atual antes de montar os cartões de resposta.

`/admin/settings` permite alterar nome, boas-vindas, avisos e ativação. Identificador e moeda não são editáveis nessa tela.

## Importação

`/admin/imports`: baixar modelo CSV/XLSX → enviar arquivo → mapear colunas → revisar registros e erros → corrigir ou ignorar inválidos → confirmar → conferir totais.

- **CSV:** UTF-8, separador vírgula ou ponto e vírgula, cabeçalhos na primeira linha, suporte a células entre aspas.
- **XLSX:** primeira aba visível com dados, cabeçalhos na primeira linha. Outras abas são avisadas e não importadas. Fórmulas são rejeitadas: cole os valores antes de enviar.
- **XML:** registros de vinho/produto com campos mapeáveis, incluindo estruturas com dados aninhados. Declarações DOCTYPE e entidades são rejeitadas. XML fiscal exige atenção ao preço unitário, que pode ser preço de compra, e não o preço da carta.
- **PDF digital:** extração textual local, até 30 páginas. Identifica linhas com nome e preço ao final da mesma linha. Mostra avisos e amostra do texto não aproveitado. Não promete reconstruir tabelas arbitrárias, colunas complexas ou páginas fotografadas.
- **PDF escaneado:** informa a necessidade de OCR. OCR não está implementado nesta etapa.

Limites: 8 MB por arquivo, 500 registros, 50 colunas e duas leituras simultâneas. A leitura ocorre em processo isolado com limite de memória e tempo. Nenhum arquivo é enviado à Anthropic. O arquivo original não é persistido; os registros extraídos, o mapeamento e o resultado ficam no banco local.

`priceCents` representa centavos; outras colunas de preço representam reais. Para linhas sem tipo ou estilo, o administrador pode escolher valores padrão explicitamente. Para vinhos sem SKU, pode autorizar a geração de código. Sem coluna correspondente, o formulário de importação informa que os registros entram ativos e disponíveis, em BRL. A revisão é obrigatória antes de confirmar.

SKU existente atualiza aquele vinho dentro do mesmo estabelecimento; SKU novo cria um vinho. Alterar o mapeamento ou corrigir uma célula bloqueia a confirmação até revalidar. Uma alteração na carta após a prévia retorna 409 e exige revalidação. A confirmação é transacional e idempotente: repetir o pedido não duplica registros. Somente os registros válidos entram quando o administrador opta por ignorar inválidos. Os totais distinguem criados, atualizados, ignorados e com erro.

Desfazer não é oferecido porque a API retorna `rollbackEligible: false`. Indicadores administrativos e painel ampliado pertencem à etapa F06 e não foram simulados nesta entrega.

## Contrato implementado

Prefixo `/api/v1`; IDs opacos; datas ISO 8601 em UTC.

| Método | Rota | Operação |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/logout` | Entrar e encerrar sessão |
| POST | `/auth/password-reset/request`, `/auth/password-reset/confirm` | Solicitar e confirmar recuperação |
| GET | `/admin/me`, `/admin/vocabularies` | Sessão, estabelecimento e vocabulários autorizados |
| GET/PATCH | `/admin/establishment` | Consultar e salvar configurações com versão |
| GET/POST | `/admin/wines` | Listar com q/page/pageSize/active/available; criar vinho |
| GET/PUT | `/admin/wines/:id` | Consultar e editar ficha completa com versão |
| GET | `/admin/import-template?format=csv\|xlsx`, `/admin/wines/export` | Modelo e exportação |
| GET/POST | `/admin/imports` | Histórico recente e upload multipart no campo file |
| GET | `/admin/imports/:id` | Prévia, erros, totais e status |
| PUT | `/admin/imports/:id/mapping` | Mapeamento, valores padrão e correções; exige versão |
| POST | `/admin/imports/:id/commit` | Confirmação com versão e ignoreInvalidRows |
| GET | `/public/establishments`, `/public/establishments/:slug` | Cartas ativas para o app público |

Os vocabulários, a listagem pública, os valores padrão e a correção manual da prévia são extensões locais explícitas ao contrato proposto pelo guia. A migração para NestJS/Prisma/PostgreSQL e a publicação de OpenAPI para uma equipe externa continuam pendentes. O piloto usa SQLite do Node 22, que é experimental nessa versão. Não há promessa de equivalência a uma implantação de produção.

## Verificação e backup

Execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run export:web`. Os testes cobrem autorização por estabelecimento, CSRF, expiração, logout, recuperação, validação, conflitos, persistência, os quatro formatos, prévia sem alteração, confirmação repetida e falhas de arquivo.

Antes de atualizar o ambiente, pare o servidor e copie o diretório privado `server/data` para um backup seguro. Restaure com o servidor parado. Banco, sessões, links de recuperação, credenciais e arquivos de teste não devem ser enviados ao GitHub.
