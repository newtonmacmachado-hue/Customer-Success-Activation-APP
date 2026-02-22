export enum ErrorCode {
  // Frontend Errors
  ERR_FRONT_RENDER = 'ERR_FRONT_RENDER',
  ERR_FRONT_VALIDATION = 'ERR_FRONT_VALIDATION',
  ERR_FRONT_AUTH = 'ERR_FRONT_AUTH',
  ERR_FRONT_NETWORK = 'ERR_FRONT_NETWORK',

  // Backend Errors
  ERR_BACK_TIMEOUT = 'ERR_BACK_TIMEOUT',
  ERR_BACK_AUTH = 'ERR_BACK_AUTH',
  ERR_BACK_DB = 'ERR_BACK_DB',
  ERR_BACK_INTERNAL = 'ERR_BACK_INTERNAL',

  // AI/LLM Errors
  ERR_LLM_TIMEOUT = 'ERR_LLM_TIMEOUT',
  ERR_LLM_SAFETY = 'ERR_LLM_SAFETY',
  ERR_LLM_TOKEN_LIMIT = 'ERR_LLM_TOKEN_LIMIT',
  ERR_LLM_GENERIC = 'ERR_LLM_GENERIC',

  // Data Errors
  ERR_DATA_QUERY = 'ERR_DATA_QUERY',
  ERR_DATA_SCHEMA = 'ERR_DATA_SCHEMA',
}

export class AppError extends Error {
  public code: ErrorCode;
  public details?: any;
  public isOperational: boolean;

  constructor(message: string, code: ErrorCode, details?: any, isOperational = true) {
    super(message);
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const getUserMessage = (code: ErrorCode): string => {
  switch (code) {
    case ErrorCode.ERR_FRONT_RENDER:
      return 'Ocorreu um erro ao exibir esta parte da aplicação. Tente recarregar a página.';
    case ErrorCode.ERR_FRONT_VALIDATION:
      return 'Verifique os dados informados e tente novamente.';
    case ErrorCode.ERR_FRONT_AUTH:
    case ErrorCode.ERR_BACK_AUTH:
      return 'Sessão expirada ou inválida. Faça login novamente.';
    case ErrorCode.ERR_FRONT_NETWORK:
      return 'Sem conexão com a internet. Verifique sua rede.';
    case ErrorCode.ERR_BACK_TIMEOUT:
    case ErrorCode.ERR_LLM_TIMEOUT:
      return 'O servidor demorou muito para responder. Tente novamente mais tarde.';
    case ErrorCode.ERR_LLM_SAFETY:
      return 'O conteúdo gerado foi bloqueado por filtros de segurança.';
    case ErrorCode.ERR_LLM_TOKEN_LIMIT:
      return 'A resposta é muito longa. Tente simplificar sua solicitação.';
    case ErrorCode.ERR_BACK_DB:
    case ErrorCode.ERR_DATA_QUERY:
      return 'Erro ao acessar o banco de dados. Contate o suporte se persistir.';
    default:
      return 'Ocorreu um erro inesperado. Tente novamente.';
  }
};
