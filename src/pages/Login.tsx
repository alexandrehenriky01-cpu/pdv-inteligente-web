import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Loader2,
  LockKeyhole,
  Mail,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { ILoginResponse, IAuthError } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/authStorage';

export function Login() {
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [mounted, setMounted] = useState(false);
  const [mouseX, setMouseX] = useState(50);
  const [mouseY, setMouseY] = useState(50);

  const [enteringPortal, setEnteringPortal] = useState(false);
  const [portalText, setPortalText] = useState('Inicializando ambiente Aurya...');

  const navigate = useNavigate();
  const { signInFromApiResponse } = useAuth();

  // 🚀 O CÉREBRO DO ROTEAMENTO (RBAC) - Agora aceita string ou undefined (Resolve o erro do TS)
  const redirecionarPorCargo = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SUPORTE_MASTER':
        navigate('/admin/clientes'); // Dono do SaaS / suporte (break-glass)
        break;
      case 'CAIXA':
      case 'VENDEDOR':
        navigate('/frente-caixa'); // Operação Direta
        break;
      case 'GERENTE':
      case 'DIRETOR':
      default:
        navigate('/dashboard'); // Visão Executiva
        break;
    }
  };

  // 🚀 AUTO-LOGIN: Se já tem token, manda pra tela certa direto sem precisar logar de novo
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userStr = localStorage.getItem(AUTH_USER_KEY);

    if (token && userStr) {
      try {
        const usuario = JSON.parse(userStr) as { role?: string };
        redirecionarPorCargo(usuario.role);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const imageTransform = useMemo(() => {
    const offsetX = (mouseX - 50) / 50;
    const offsetY = (mouseY - 50) / 50;

    const translateX = offsetX * -10;
    const translateY = offsetY * -8;

    return `scale(1.05) translate(${translateX}px, ${translateY}px)`;
  }, [mouseX, mouseY]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || enteringPortal) return;

    setErro('');
    setLoading(true);

    try {
      const loginValor = email.trim();
      const response = await api.post<ILoginResponse>('/api/login', {
        login: loginValor,
        identificacao: loginValor,
        senha,
      });

      const persisted = signInFromApiResponse(response.data);
      if (!persisted.ok) {
        setErro(persisted.reason);
        setLoading(false);
        return;
      }

      const usuario = persisted.usuario;

      setPortalText('Conectando ao ecossistema Aurya...');
      setEnteringPortal(true);

      window.setTimeout(() => {
        setPortalText('Sincronizando ambiente inteligente...');
      }, 450);

      window.setTimeout(() => {
        // 🚀 ROTEAMENTO DINÂMICO APÓS A ANIMAÇÃO DO PORTAL
        redirecionarPorCargo(String(usuario.role ?? ''));
      }, 1400);
    } catch (err) {
      const error = err as AxiosError<IAuthError>;
      const serverError = error.response?.data;

      if (serverError?.erro || serverError?.error || serverError?.mensagem) {
        setErro(
          serverError.erro ||
            serverError.error ||
            serverError.mensagem ||
            'Erro de autenticação'
        );
      } else {
        setErro('Erro ao conectar com o servidor. O Backend está rodando?');
      }

      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#050816_0%,#060b18_45%,#040714_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-600/20 blur-[120px] sm:h-80 sm:w-80 sm:blur-[140px]" />
        <div className="absolute right-[-10%] top-[10%] h-72 w-72 rounded-full bg-fuchsia-600/15 blur-[120px] sm:h-[28rem] sm:w-[28rem] sm:blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-64 w-64 rounded-full bg-purple-700/10 blur-[110px]" />
      </div>

      <div
        className="relative z-10 flex min-h-screen items-center justify-center px-3 py-4 sm:px-4 sm:py-6"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setMouseX(x);
          setMouseY(y);
        }}
      >
        <div
          className={`w-full max-w-7xl overflow-hidden rounded-[26px] border border-white/10 bg-[#08101d]/72 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-700 sm:rounded-[30px] lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:rounded-[34px] ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="relative block min-h-[330px] overflow-hidden border-b border-white/10 lg:hidden">
            <div className="absolute inset-0">
              <img
                src="/Aurya.jpeg"
                alt="Aurya"
                className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#05070f]/88 via-[#070b17]/70 to-[#08101d]/96" />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(139,92,246,0.18),_transparent_25%),radial-gradient(circle_at_80%_75%,_rgba(217,70,239,0.10),_transparent_25%)]" />
            </div>

            <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300 backdrop-blur-md">
                  <Sparkles className="h-3 w-3" />
                  ERP AI-First
                </div>

                <div className="mt-5">
                  <h1 className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-purple-400 bg-clip-text text-3xl font-black tracking-[0.22em] text-transparent drop-shadow-[0_0_18px_rgba(139,92,246,0.80)] sm:text-4xl">
                    AURYA
                  </h1>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.26em] text-slate-300/90 sm:text-[11px]">
                    Soluções inteligentes
                  </p>
                </div>

                <div className="mt-6 max-w-md">
                  <h2 className="text-3xl font-black leading-[1.02] tracking-tight text-white drop-shadow-[0_6px_25px_rgba(0,0,0,0.95)] sm:text-4xl">
                    Gestão moderna com inteligência operacional.
                  </h2>

                  <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.80)] sm:text-[15px] sm:leading-7">
                    Transforme sua operação com automação, análise inteligente e
                    decisões orientadas por dados.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/20 bg-[#04060d]/88 p-3.5 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Operação
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">+ Rápida</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-300">
                    Fluxos limpos para uso diário.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/20 bg-[#04060d]/88 p-3.5 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">
                    Aurya IA
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">Insights</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-300">
                    Decisões em tempo real.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/20 bg-[#04060d]/88 p-3.5 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Segurança
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    Confiável
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-300">
                    Proteção operacional.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[760px] overflow-hidden border-r border-white/10 lg:block">
            <div className="absolute inset-0">
              <img
                src="/Aurya.jpeg"
                alt="Aurya"
                className="absolute inset-0 h-full w-full object-cover object-[center_20%] transition-transform duration-300 ease-out"
                style={{ transform: imageTransform }}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#05070f]/98 via-[#070b17]/90 to-[#0b1020]/70" />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(139,92,246,0.18),_transparent_25%),radial-gradient(circle_at_80%_75%,_rgba(217,70,239,0.12),_transparent_25%)]" />
            </div>

            <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-300 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.10)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  ERP AI-First
                </div>

                <div className="mt-10">
                  <h1 className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-purple-400 bg-clip-text text-4xl font-black tracking-[0.24em] text-transparent drop-shadow-[0_0_18px_rgba(139,92,246,0.80)] xl:text-5xl">
                    AURYA
                  </h1>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.34em] text-slate-300/90">
                    Soluções inteligentes
                  </p>
                </div>

                <div className="mt-14 max-w-2xl">
                  <h2 className="text-5xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_6px_25px_rgba(0,0,0,0.95)] xl:text-6xl">
                    Gestão moderna com inteligência operacional.
                  </h2>

                  <p className="mt-6 max-w-xl text-[18px] leading-8 text-slate-300/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.80)]">
                    Transforme sua operação com automação, análise inteligente
                    e decisões orientadas por dados para vendas, financeiro,
                    fiscal e estoque.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl border border-white/20 bg-[#04060d]/90 p-5 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Operação
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">+ Rápida</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Fluxos visuais limpos para uso diário.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/20 bg-[#04060d]/90 p-5 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                    Aurya IA
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">Insights</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Decisões assistidas em tempo real.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/20 bg-[#04060d]/90 p-5 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Segurança
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">
                    Confiável
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Proteção operacional para sua empresa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[unset] items-center justify-center p-4 sm:p-6 lg:min-h-[760px] lg:p-10">
            <div className="w-full max-w-md">
              <div className="rounded-[24px] border border-white/10 bg-[#06101f]/92 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.60)] backdrop-blur-xl sm:rounded-[28px] sm:p-7 lg:rounded-[30px] lg:p-8">
                <div className="mb-6 text-center sm:mb-8 lg:text-left">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 shadow-[0_0_25px_rgba(139,92,246,0.15)] sm:h-16 sm:w-16 lg:mx-0">
                    <ShieldCheck className="h-7 w-7 text-violet-300 sm:h-8 sm:w-8" />
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300 sm:text-[11px] sm:tracking-[0.18em]">
                    <Sparkles className="h-3 w-3" />
                    Acesso ao sistema
                  </div>

                  <h3 className="mt-4 text-3xl font-black tracking-tight text-white sm:mt-5 sm:text-4xl">
                    Entrar na plataforma
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-[15px] sm:leading-7">
                    Faça login para acessar seu painel operacional, financeiro e
                    inteligência da Aurya.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px] sm:tracking-[0.16em]">
                      E-mail ou Nome de Usuário
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com ou joao.silva"
                        disabled={loading || enteringPortal}
                        required
                        className="w-full rounded-2xl border border-white/10 bg-[#0d182d] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px] sm:tracking-[0.16em]">
                      Senha
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading || enteringPortal}
                        required
                        className="w-full rounded-2xl border border-white/10 bg-[#0d182d] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
                      />
                    </div>
                  </div>

                  {erro && (
                    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-red-500/10 px-4 py-3 text-sm font-medium text-rose-300 shadow-inner">
                      {erro}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || enteringPortal}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_32px_rgba(139,92,246,0.38)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70 sm:py-4 sm:text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Autenticando...
                      </>
                    ) : (
                      'Entrar no sistema'
                    )}
                  </button>
                </form>

                <div className="mt-5 flex flex-col gap-3 text-center sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:text-left">
                  <a
                    href="#"
                    className="text-sm font-semibold text-slate-500 transition-colors hover:text-violet-300"
                  >
                    Esqueceu sua senha?
                  </a>

                  <div className="inline-flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:justify-end">
                    <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                    Ambiente seguro
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] text-slate-500 sm:mt-5 sm:text-xs">
                AURYA SOLUÇÕES • ERP SaaS com identidade AI-First
              </p>
            </div>
          </div>
        </div>
      </div>

      {enteringPortal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-[#030611]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.16),_transparent_30%),radial-gradient(circle_at_center,_rgba(217,70,239,0.12),_transparent_45%)]" />

          <div className="absolute h-[620px] w-[620px] rounded-full border border-violet-400/10 bg-violet-500/5 blur-sm animate-ping" />
          <div className="absolute h-[440px] w-[440px] rounded-full border border-fuchsia-400/20 shadow-[0_0_60px_rgba(139,92,246,0.35)] animate-[spin_2.8s_linear_infinite]" />
          <div className="absolute h-[320px] w-[320px] rounded-full border border-violet-300/25 shadow-[0_0_80px_rgba(217,70,239,0.28)] animate-[spin_1.8s_linear_infinite_reverse]" />
          <div className="absolute h-[200px] w-[200px] rounded-full border border-white/10 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40 blur-[18px] opacity-90 animate-pulse" />
          <div className="absolute h-[80px] w-[80px] rounded-full bg-white/90 blur-[30px] opacity-70" />

          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={index}
                className="absolute rounded-full bg-white/70"
                style={{
                  width: `${2 + (index % 3)}px`,
                  height: `${2 + (index % 3)}px`,
                  left: `${8 + index * 5}%`,
                  top: `${10 + (index % 6) * 12}%`,
                  boxShadow: '0 0 14px rgba(255,255,255,0.45)',
                  animation: `pulse ${1.4 + (index % 5) * 0.25}s ease-in-out infinite`,
                  opacity: 0.55,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 px-6 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/10 shadow-[0_0_40px_rgba(139,92,246,0.35)]">
              <Sparkles className="h-8 w-8 animate-pulse text-violet-300" />
            </div>

            <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Entrando no ecossistema Aurya
            </h3>

            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              {portalText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}