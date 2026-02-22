
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../src/supabase';
import { MOCK_USERS, DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'login' | 'forgot-password' | 'reset-sent'>('login');

  // Check for existing session on mount
  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email!);
        }
      });
    }
  }, []);

  const fetchUserProfile = async (userId: string, userEmail: string) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const profile = profileData as User | null;

        if (profile) {
          if (!profile.active) {
            setError('Sua conta está desativada. Entre em contato com o administrador.');
            setIsLoading(false);
            return;
          }
          onLogin(profile as User);
        } else {
          // If no profile exists yet, create a default one or use mock logic
          const isAdmin = userEmail.includes('admin');
          const newUser: User = {
            id: userId,
            name: userEmail.split('@')[0],
            email: userEmail,
            role: isAdmin ? UserRole.ADMIN_GERAL : UserRole.OPERADOR,
            permissions: isAdmin ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
            active: true
          };
          onLogin(newUser);
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let msg = error.message;
        if (msg === 'Invalid login credentials') {
          msg = 'Credenciais inválidas. Verifique se o e-mail foi confirmado no Supabase.';
        } else if (msg === 'Email not confirmed') {
          msg = 'E-mail não confirmado. Verifique sua caixa de entrada ou confirme manualmente no painel.';
        }
        setError(msg);
        setIsLoading(false);
      } else if (data.user) {
        fetchUserProfile(data.user.id, data.user.email!);
      }
    } else {
      // Mock Auth Fallback
      setTimeout(() => {
        const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
          if (!user.active) {
            setError('Sua conta está desativada.');
            setIsLoading(false);
            return;
          }
          onLogin(user);
        } else {
          setError('E-mail ou senha inválidos (Modo Mock).');
          setIsLoading(false);
        }
      }, 800);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setView('reset-sent');
    } else {
      setTimeout(() => setView('reset-sent'), 1000);
    }
    setIsLoading(false);
  };

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="bg-white rounded-[40px] p-10 md:p-14 w-full max-w-md shadow-2xl relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Recuperar Senha</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Enviaremos um link para o seu e-mail</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="exemplo@suaempresa.com"
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-5 rounded-[20px] font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all">
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
            <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">Voltar para o Login</button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'reset-sent') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="bg-white rounded-[40px] p-10 md:p-14 w-full max-w-md shadow-2xl relative z-10 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-4">E-mail Enviado!</h1>
          <p className="text-slate-500 text-sm mb-8">Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha em instantes.</p>
          <button onClick={() => setView('login')} className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-black text-sm uppercase">Voltar para o Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decoração de fundo */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>

      <div className="bg-white rounded-[40px] p-10 md:p-14 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl italic shadow-blue-500/30 shadow-xl mx-auto mb-6">S</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Success Platform</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Bem-vindo de volta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-red-500 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="exemplo@suaempresa.com"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
              <button type="button" onClick={() => setView('forgot-password')} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700">Esqueci a senha</button>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-5 rounded-[20px] font-black text-sm uppercase shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>

        {!isSupabaseConfigured() && (
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Dica de Acesso Master (Mock)</p>
             <p className="text-[10px] text-slate-500 text-center font-medium">Use <b>admin@success.com</b> para acesso total.</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">© 2026 Customer Activation & Success</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
