const { PilotError } = require('./sommelier.cjs');

function publicFailure(error, aborted) {
  if (error instanceof PilotError) return { status: error.status, message: error.message };
  if (aborted) return { status: 504, message: 'A consulta demorou demais. Sua mensagem foi preservada; tente novamente.' };
  const code = error.cause?.code ?? error.code;
  if (['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)) {
    return { status: 503, message: 'Não consegui conectar à Anthropic. Sua mensagem foi preservada; confira a conexão e tente novamente.' };
  }
  if (code === 'EACCES') return { status: 503, message: 'O servidor está sem permissão de acesso à Anthropic. Sua mensagem foi preservada.' };
  return { status: 500, message: 'Não foi possível concluir a consulta. Sua mensagem foi preservada; tente novamente.' };
}
module.exports = { publicFailure };
