import { AppError, ErrorCode } from './errorTypes';
import { supabase } from '../supabase';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; 

/**
 * Função mestre de rede com retry automático e injeção de segurança.
 */
export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF): Promise<Response> {
  try {
    // 1. Prepara os headers de forma segura
    const headers = new Headers(options.headers);
    
    // Garante Content-Type para envios de dados (POST/PUT)
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // 2. INJEÇÃO FORÇADA DO TOKEN (O "Crachá")
    // Buscamos a sessão ativa do Supabase para validar a requisição no backend
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        console.warn(`[API] Nenhuma sessão encontrada para: ${url}. O backend pode recusar a conexão.`);
      }
    }

    // 3. CONVERSÃO PARA OBJETO PLANO
    // Alguns navegadores/sandboxes falham ao passar o objeto Headers diretamente.
    // Convertemos para um objeto JS simples para máxima compatibilidade.
    const finalHeaders: Record<string, string> = {};
    headers.forEach((value, key) => {
      finalHeaders[key] = value;
    });

    const finalOptions = {
      ...options,
      headers: finalHeaders
    };

    // 4. Executa a chamada de rede real
    const response = await fetch(url, finalOptions);

    // TRATAMENTO DE 401 (Não Autorizado / Token Expirado)
    if (response.status === 401 && retries > 0) {
       console.log("[API] Acesso negado (401). Tentando renovar token e repetir...");
       if (supabase) {
         const { data, error } = await supabase.auth.refreshSession();
         if (!error && data.session) {
            // Tenta novamente com o token novo
            return fetchWithRetry(url, options, retries - 1, backoff);
         }
       }
    }

    // TRATAMENTO DE ERROS DE SERVIDOR (500+)
    if (response.status >= 500) {
       let errorMessage = `Erro interno no servidor (${response.status})`;
       try {
         const errorBody = await response.clone().text();
         const parsed = JSON.parse(errorBody);
         errorMessage = parsed.message || parsed.error || errorMessage;
       } catch (e) { /* fallback para mensagem padrão */ }
       
       throw new AppError(errorMessage, ErrorCode.ERR_BACK_INTERNAL, { status: response.status }, true);
    }

    return response;

  } catch (error: any) {
    // Lógica de Re-tentativa em falhas de rede (Timeout / Conexão perdida)
    if (retries > 0 && (error.code === ErrorCode.ERR_BACK_TIMEOUT || error.name === 'TypeError')) {
      console.warn(`[API] Falha de conexão em ${url}. Tentando novamente... (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || 'Erro de comunicação com o servidor', ErrorCode.ERR_FRONT_NETWORK, error);
  }
}

/**
 * Utilitário para parsear JSON com tratamento de erro padronizado.
 */
export async function safeJson<T>(response: Response): Promise<T> {
    try {
        if (!response.ok) {
            const errorBody = await response.text();
            let parsedError;
            try {
                parsedError = JSON.parse(errorBody);
            } catch {
                parsedError = { message: errorBody };
            }
            
            const errorCode = response.status === 401 ? ErrorCode.ERR_BACK_AUTH : ErrorCode.ERR_BACK_INTERNAL;
            
            throw new AppError(
                parsedError.error || parsedError.message || `Erro HTTP ${response.status}`, 
                errorCode, 
                parsedError
            );
        }
        return await response.json();
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Falha ao processar dados (JSON) do servidor', ErrorCode.ERR_FRONT_RENDER, error);
    }
}