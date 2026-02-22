import express from 'express';
import { isSupabaseConfigured, supabase } from '../../src/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  if (supabase) {
    // Tenta fazer uma consulta mínima para validar a conexão
    const { error } = await supabase.from('accounts').select('id').limit(1);
    
    if (error) {
      // Configurado, mas a conexão falhou (ex: RLS, credenciais erradas)
      res.json({ status: 'error', database: 'supabase_error', message: error.message });
    } else {
      // Sucesso! Conectado e consultando.
      res.json({ status: 'ok', database: 'supabase' });
    }
  } else {
    // Se as variáveis de ambiente do Supabase não estiverem definidas, assume Modo Mock.
    res.json({ status: 'ok', database: 'mock' });
  }
});

export default router;
