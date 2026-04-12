import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from '../../../components/Layout';
import type { LucideIcon } from 'lucide-react';
import {
  Shield,
  Save,
  Loader2,
  CheckSquare,
  Square,
  Monitor,
  Package,
  Wallet,
  Receipt,
  Users,
  LayoutDashboard,
  BrainCircuit,
  Sparkles,
  ShieldAlert,
  BadgeCheck,
  Activity,
  LockKeyhole,
  Wand2,
  Eye,
  Landmark,
  ShoppingCart,
  Factory,
  Printer,
  Tag,
} from 'lucide-react';
import { api } from '../../../services/api';
import { AxiosError } from 'axios';

interface ModuloApi {
  id: string;
  nome: string;
  sensivel: boolean;
}

interface CargoApi {
  id: string;
  nome: string;
}

interface MatrizPermissoesResponse {
  modulos: ModuloApi[];
  cargos: CargoApi[];
  permissoesPorCargo: Record<string, string[]>;
}

const CARGO_ESTILO: Record<string, { color: string; bg: string; border: string }> = {
  CAIXA: { color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-400/20' },
  VENDEDOR: { color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-400/20' },
  GERENTE: { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-400/20' },
  DIRETOR: { color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-400/20' },
};

function estiloCargo(id: string) {
  return (
    CARGO_ESTILO[id] ?? {
      color: 'text-slate-300',
      bg: 'bg-slate-500/10',
      border: 'border-slate-400/20',
    }
  );
}

const ICONE_POR_MODULO: Record<string, LucideIcon> = {
  pdv: Monitor,
  estoque: Package,
  financeiro: Wallet,
  fiscal: Receipt,
  contabil: Landmark,
  compras: ShoppingCart,
  equipe: Users,
  dashboard: LayoutDashboard,
  ia: BrainCircuit,
  estrutura: Package,
  producao: Factory,
  etiquetas: Tag,
};

function iconeModulo(id: string): LucideIcon {
  return ICONE_POR_MODULO[id] ?? Printer;
}

type Insight = {
  tipo: 'ok' | 'alerta' | 'info';
  titulo: string;
  descricao: string;
};

export function GestaoPermissoesPage() {
  const [modulos, setModulos] = useState<ModuloApi[]>([]);
  const [cargos, setCargos] = useState<CargoApi[]>([]);
  const [permissoes, setPermissoes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [iaApplying, setIaApplying] = useState(false);

  const carregarMatriz = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<MatrizPermissoesResponse>('/api/permissoes/matriz');
      setModulos(data.modulos);
      setCargos(data.cargos);
      setPermissoes(data.permissoesPorCargo);
    } catch (err) {
      const ax = err as AxiosError<{ error?: string }>;
      const msg =
        ax.response?.data?.error ||
        'Não foi possível carregar a matriz. Verifique se você está logado em uma loja.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarMatriz();
  }, [carregarMatriz]);

  const togglePermissao = (cargoId: string, moduloId: string) => {
    setPermissoes((prev) => {
      const permissoesCargo = prev[cargoId] || [];
      const temPermissao = permissoesCargo.includes(moduloId);

      if (temPermissao) {
        return { ...prev, [cargoId]: permissoesCargo.filter((id) => id !== moduloId) };
      }
      return { ...prev, [cargoId]: [...permissoesCargo, moduloId] };
    });
  };

  const salvarPermissoes = async () => {
    setSaving(true);
    try {
      await api.put('/api/configuracoes/permissoes', { permissoes });
      alert('✅ Matriz de permissões atualizada com sucesso!');
      await carregarMatriz();
    } catch (error) {
      console.error('Erro ao salvar permissões', error);
      const ax = error as AxiosError<{ error?: string }>;
      alert(ax.response?.data?.error || '❌ Erro ao salvar permissões.');
    } finally {
      setSaving(false);
    }
  };

  const aplicarSugestaoAurya = async () => {
    if (modulos.length === 0) return;
    setIaApplying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const todosIds = modulos.map((m) => m.id);
      setPermissoes((prev) => ({
        ...prev,
        CAIXA: ['pdv'],
        VENDEDOR: ['pdv', 'estoque'],
        GERENTE: [...todosIds],
        DIRETOR: [...todosIds],
      }));
      alert('✨ Aurya aplicou a matriz sugerida com base em menor privilégio e criticidade operacional.');
    } finally {
      setIaApplying(false);
    }
  };

  const totalPermissoes = useMemo(
    () => Object.values(permissoes).reduce((acc, arr) => acc + arr.length, 0),
    [permissoes]
  );

  const cargosComAcessoFinanceiro = useMemo(
    () =>
      Object.entries(permissoes)
        .filter(([, mods]) => mods.includes('financeiro'))
        .map(([cargo]) => cargo),
    [permissoes]
  );

  const cargosComAcessoFiscal = useMemo(
    () =>
      Object.entries(permissoes)
        .filter(([, mods]) => mods.includes('fiscal'))
        .map(([cargo]) => cargo),
    [permissoes]
  );

  const cargosComAcessoIA = useMemo(
    () =>
      Object.entries(permissoes)
        .filter(([, mods]) => mods.includes('ia'))
        .map(([cargo]) => cargo),
    [permissoes]
  );

  const insightsAurya = useMemo<Insight[]>(() => {
    const insights: Insight[] = [];

    if (cargosComAcessoFinanceiro.length > 2) {
      insights.push({
        tipo: 'alerta',
        titulo: 'Excesso de acesso ao financeiro',
        descricao: `Atualmente ${cargosComAcessoFinanceiro.length} cargos têm acesso ao módulo financeiro. A Aurya recomenda restringir esse acesso a perfis estratégicos.`,
      });
    } else {
      insights.push({
        tipo: 'ok',
        titulo: 'Financeiro bem protegido',
        descricao:
          'O acesso ao módulo financeiro está concentrado em poucos perfis, reduzindo risco operacional.',
      });
    }

    if (cargosComAcessoFiscal.length === 0) {
      insights.push({
        tipo: 'alerta',
        titulo: 'Nenhum perfil com acesso fiscal',
        descricao:
          'Sem acesso ao módulo fiscal, a operação pode ficar travada para emissão ou correção de notas.',
      });
    } else {
      insights.push({
        tipo: 'ok',
        titulo: 'Cobertura fiscal habilitada',
        descricao: `Há ${cargosComAcessoFiscal.length} perfil(is) aptos a operar o módulo fiscal.`,
      });
    }

    if (cargosComAcessoIA.length > 1) {
      insights.push({
        tipo: 'info',
        titulo: 'IA distribuída entre múltiplos perfis',
        descricao:
          'A Aurya recomenda manter a IA apenas em perfis de gestão para preservar decisões estratégicas.',
      });
    } else if (cargosComAcessoIA.length === 1) {
      insights.push({
        tipo: 'ok',
        titulo: 'IA sob controle',
        descricao:
          'A inteligência Aurya está restrita a um perfil estratégico, o que está alinhado com boas práticas.',
      });
    }

    return insights;
  }, [cargosComAcessoFinanceiro.length, cargosComAcessoFiscal.length, cargosComAcessoIA.length]);

  const getBadgeSensivel = (sensivel: boolean) => {
    if (sensivel) {
      return 'border-red-400/20 bg-red-500/10 text-red-300';
    }
    return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
  };

  return (
    <Layout>
      <div className="mx-auto flex max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Access Intelligence
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <Shield className="h-8 w-8 text-violet-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    Matriz de Acesso Inteligente
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                    Módulos carregados dinamicamente do servidor. Novos recursos (ex.: etiquetas) passam a
                    aparecer aqui automaticamente após publicação da API.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => void aplicarSugestaoAurya()}
                disabled={iaApplying || loading || modulos.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-5 py-3.5 font-black text-violet-300 transition-all hover:bg-violet-500/15 disabled:opacity-50"
              >
                {iaApplying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                {iaApplying ? 'Aplicando IA...' : 'Aplicar sugestão Aurya'}
              </button>

              <button
                type="button"
                onClick={() => void salvarPermissoes()}
                disabled={saving || loading || !!loadError || modulos.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {saving ? 'Salvando...' : 'Salvar Matriz'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="rounded-[26px] border border-white/10 bg-[#08101f]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <Activity className="h-4 w-4 text-violet-300" />
              <span className="text-xs font-black uppercase tracking-[0.16em]">Permissões ativas</span>
            </div>
            <p className="text-3xl font-black text-white">{totalPermissoes}</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-[#08101f]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <ShieldAlert className="h-4 w-4 text-red-300" />
              <span className="text-xs font-black uppercase tracking-[0.16em]">Acesso financeiro</span>
            </div>
            <p className="text-3xl font-black text-white">{cargosComAcessoFinanceiro.length}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">Perfis com permissão em módulo sensível</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-[#08101f]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <BrainCircuit className="h-4 w-4 text-emerald-300" />
              <span className="text-xs font-black uppercase tracking-[0.16em]">Aurya ativa</span>
            </div>
            <p className="text-3xl font-black text-white">{cargosComAcessoIA.length}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">Perfis com inteligência avançada liberada</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-[#08101f]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <LockKeyhole className="h-4 w-4 text-sky-300" />
              <span className="text-xs font-black uppercase tracking-[0.16em]">Cobertura fiscal</span>
            </div>
            <p className="text-3xl font-black text-white">{cargosComAcessoFiscal.length}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">Perfis prontos para operação fiscal</p>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_24%),linear-gradient(135deg,_#0b1020_0%,_#08101f_52%,_#0a1224_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10 shadow-inner">
              <BrainCircuit className="h-7 w-7 text-violet-300" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Aurya Risk Insight</h2>
              <p className="mt-1 text-sm font-medium text-slate-300">
                A IA analisa a distribuição de acesso e aponta oportunidades de redução de risco.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {insightsAurya.map((insight, idx) => {
              const style =
                insight.tipo === 'ok'
                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                  : insight.tipo === 'alerta'
                    ? 'border-red-400/20 bg-red-500/10 text-red-300'
                    : 'border-sky-400/20 bg-sky-500/10 text-sky-300';

              const Icon =
                insight.tipo === 'ok' ? BadgeCheck : insight.tipo === 'alerta' ? ShieldAlert : Eye;

              return (
                <div key={idx} className="rounded-2xl border border-white/10 bg-[#08101f]/70 p-4">
                  <div
                    className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${style}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {insight.titulo}
                  </div>
                  <p className="text-sm leading-6 text-slate-300">{insight.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">Matriz Operacional</h2>
              <p className="mt-1 text-xs text-slate-500">
                Clique nos blocos para liberar ou restringir acesso por cargo (fonte: API)
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
              {modulos.length} módulos
            </span>
          </div>

          {loadError && (
            <div className="border-b border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 w-72 border-b border-white/10 bg-[#0b1324] p-5 text-xs font-black uppercase tracking-widest text-slate-400 backdrop-blur-xl">
                      Módulos do Sistema
                    </th>
                    {cargos.map((cargo) => {
                      const st = estiloCargo(cargo.id);
                      return (
                        <th
                          key={cargo.id}
                          className="min-w-[150px] border-b border-white/10 bg-[#0b1324] p-5 text-center"
                        >
                          <div
                            className={`inline-flex items-center justify-center rounded-xl border px-4 py-1.5 text-xs font-black uppercase tracking-widest ${st.bg} ${st.color} ${st.border}`}
                          >
                            {cargo.nome}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {modulos.map((modulo) => {
                    const Icon = iconeModulo(modulo.id);
                    return (
                      <tr key={modulo.id} className="group transition-colors hover:bg-white/5">
                        <td className="sticky left-0 z-10 border-r border-white/10 bg-[#08101f] p-4 transition-colors group-hover:bg-[#0b1324]">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-white/10 bg-[#0b1324] p-2">
                              <Icon className="h-4 w-4 text-violet-300" />
                            </div>
                            <div>
                              <span className="block text-sm font-bold text-white">{modulo.nome}</span>
                              <span
                                className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getBadgeSensivel(modulo.sensivel)}`}
                              >
                                {modulo.sensivel ? 'Módulo sensível' : 'Uso operacional'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {cargos.map((cargo) => {
                          const st = estiloCargo(cargo.id);
                          const temPermissao = permissoes[cargo.id]?.includes(modulo.id);

                          return (
                            <td
                              key={`${cargo.id}-${modulo.id}`}
                              className="border-r border-white/10 p-4 text-center last:border-r-0"
                            >
                              <button
                                type="button"
                                onClick={() => togglePermissao(cargo.id, modulo.id)}
                                className="group/btn rounded-2xl border border-white/10 bg-white/5 p-3 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                title={`${temPermissao ? 'Remover' : 'Adicionar'} acesso`}
                              >
                                {temPermissao ? (
                                  <CheckSquare
                                    className={`h-6 w-6 ${st.color} drop-shadow-[0_0_8px_currentColor] transition-transform group-hover/btn:scale-110`}
                                  />
                                ) : (
                                  <Square className="h-6 w-6 text-slate-600 transition-transform group-hover/btn:scale-110 group-hover/btn:text-slate-400" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-violet-400/20 bg-violet-500/10 p-5">
          <div className="flex items-start gap-4">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-violet-300" />
            <div>
              <h4 className="mb-1 text-sm font-black text-violet-300">
                Como funciona a Matriz Inteligente de Acesso?
              </h4>
              <p className="text-sm leading-6 text-violet-100/80">
                As permissões marcadas definem quais menus e telas ficam visíveis para cada grupo de usuários.
                <strong className="text-violet-200"> Diretor, Gerente, Admin da loja e Super Admin</strong> têm
                bypass em rotas críticas de configuração (ex.: layouts de etiquetas), mesmo antes da matriz ser
                atualizada. O catálogo de módulos é centralizado no backend — novos IDs passam a aparecer nesta
                tela após deploy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
