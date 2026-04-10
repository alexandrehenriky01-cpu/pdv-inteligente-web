import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';
// 🚀 Importando as interfaces centralizadas
import { ILoginResponse, IAuthError } from '../../types/auth';

export function Login() {
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      // 🛡️ Tipagem estrita no retorno da API. O 'response.data' agora é ILoginResponse (nunca 'any')
      const response = await api.post<ILoginResponse>('/login', {  
        email,
        senha
      });

      const { token, usuario } = response.data;

      localStorage.setItem('@PDVToken', token);
      localStorage.setItem('@PDVUsuario', JSON.stringify(usuario));

      navigate('/dashboard');
      
    } catch (err) {
      // 🛡️ Tipagem estrita de erros usando a interface centralizada
      const error = err as AxiosError<IAuthError>;
      
      const serverError = error.response?.data;
      if (serverError?.erro || serverError?.error || serverError?.mensagem) {
        setErro(serverError.erro || serverError.error || serverError.mensagem || 'Erro de autenticação');
      } else {
        setErro('Erro ao conectar com o servidor. O Backend está rodando?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060a13] relative overflow-hidden">
      {/* Efeitos de Luz de Fundo (Glow) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Container do Login (Glassmorphism) */}
      <div className="relative w-full max-w-md p-8 m-4 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] z-10">
        
        {/* Cabeçalho / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-3xl text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            A
          </div>
          <h1 className="text-3xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
            AURYA
          </h1>
          <p className="text-xs font-bold text-slate-400 tracking-[0.3em] uppercase mt-1">
            Soluções
          </p>
          <p className="text-sm text-slate-500 mt-6 font-medium">
            Acesse o seu Painel de Gestão
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600 disabled:opacity-50 shadow-inner"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600 disabled:opacity-50 shadow-inner"
              required
            />
          </div>

          {erro && (
            <div className="p-4 bg-red-950/50 border border-red-500/30 text-red-400 rounded-xl text-sm text-center font-medium animate-in fade-in zoom-in duration-200 shadow-inner">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:transform-none disabled:cursor-not-allowed flex justify-center items-center gap-3 tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="#" className="text-sm font-bold text-slate-500 hover:text-cyan-400 transition-colors">
            Esqueceu sua senha?
          </a>
        </div>
      </div>
    </div>
  );
}