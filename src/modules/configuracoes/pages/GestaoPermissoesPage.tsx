import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
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
} from 'lucide-react';
import { api } from '../../../services/api';

// Definição dos Módulos do Sistema
const MODULOS = [
  { id: 'pdv', nome: 'Frente de Caixa (PDV)', icon: Monitor, criticidade: 'alta' },
  { id: 'estoque', nome: 'Gestão de Estoque', icon: Package, criticidade: 'alta' },
  { id: 'financeiro', nome: 'Módulo Financeiro', icon: Wallet, criticidade: 'alta' },
  { id: 'fiscal', nome: 'Emissão de Notas Fiscais', icon: Receipt, criticidade: 'alta' },
  { id: 'equipe', nome: 'Gestão de Equipe', icon: Users, criticidade: 'media' },
  { id: 'dashboard', nome: 'Dashboards e Relatórios', icon: LayoutDashboard, criticidade: 'media' },
  { id: 'ia', nome: 'Inteligência Artificial (Aurya)', icon: BrainCircuit, criticidade: 'alta' },
] as const;

// Definição dos Cargos Padrões
const CARGOS = [
  { id: 'CAIXA', nome: 'Caixa', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-400/20' },
  { id: 'VENDEDOR', nome: 'Vendedor', color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-400/20' },
  { id: 'GERENTE', nome: 'Gerente', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-400/20' },
  { id: 'DIRETOR', nome: 'Diretor', color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-400/20' },
] as const;

// Estado Inicial Mockado
const PERMISSOES_PADRAO: Record<string, string[]> = {
  CAIXA: ['pdv'],
  VENDEDOR: ['pdv', 'estoque'],
  GERENTE: ['pdv', 'estoque', 'financeiro', 'fiscal', 'equipe', 'dashboard'],
  DIRETOR: ['pdv', 'estoque', 'financeiro', 'fiscal', 'equipe', 'dashboard', 'ia'],
};

type CargoId = keyof typeof PERMISSOES_PADRAO;

type Insight = {
  tipo: 'ok' | 'alerta' | 'info';
  titulo: string;
  descricao: string;
};

export function GestaoPermissoesPage() {
  const [permissoes, setPermissoes] = useState<Record<string, string[]>>(PERMISSOES_PADRAO);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [iaApplying, setIaApplying] = useState(false);

  useEffect(() => {
    // simularBuscaDePermissoes();
  }, []);

  const togglePermissao = (cargoId: string, moduloId: string) => {
    setPermissoes(prev => {
      const permissoesCargo = prev[cargoId] || [];
      const temPermissao = permissoesCargo.includes(moduloId);

      if (temPermissao) {
        return { ...prev, [cargoId]: permissoesCargo.filter(id => id !== moduloId) };
      } else {
        return { ...prev, [cargoId]: [...permissoesCargo, moduloId] };
      }
    });
  };

  const salvarPermissoes = async () => {
    setSaving(true);
    try {
      // await api.put('/api/configuracoes/permissoes', { permissoes });
      await new Promise(resolve => setTimeout(resolve, 800));
      alert('✅ Matriz de permissões atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar permissões', error);
      alert('❌ Erro ao salvar permissões.');
    } finally {
      setSaving(false);
    }
  };

  const aplicarSugestaoAurya = async () => {
    setIaApplying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 700));

      setPermissoes({
        CAIXA: ['pdv'],
        VENDEDOR: ['pdv', 'estoque'],
        GERENTE: ['pdv', 'estoque', 'financeiro', 'fiscal', 'equipe', 'dashboard'],
        DIRETOR: ['pdv', 'estoque', 'financeiro', 'fiscal', 'equipe', 'dashboard', 'ia'],
      });

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
        descricao: 'O acesso ao módulo financeiro está concentrado em poucos perfis, reduzindo risco operacional.',
      });
    }

    if (cargosComAcessoFiscal.length === 0) {
      insights.push({
        tipo: 'alerta',
        titulo: 'Nenhum perfil com acesso fiscal',
        descricao: 'Sem acesso ao módulo fiscal, a operação pode ficar travada para emissão ou correção de notas.',
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
        descricao: 'A Aurya recomenda manter a IA apenas em perfis de gestão para preservar decisões estratégicas.',
      });
    } else if (cargosComAcessoIA.length === 1) {
      insights.push({
        tipo: 'ok',
        titulo: 'IA sob controle',
        descricao: 'A inteligência Aurya está restrita a um perfil estratégico, o que está alinhado com boas práticas.',
      });
    }

    return insights;
  }, [cargosComAcessoFinanceiro.length, cargosComAcessoFiscal.length, cargosComAcessoIA.length]);

  const getBadgeByCriticality = (criticidade: string) => {
    if (criticidade === 'alta') {
      return 'border-red-400/20 bg-red-500/10 text-red-300';
    }
    return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
  };

  return (
    <Layout>
      <div className="mx-auto flex max-w-7xl flex-col space-y-6 pb-12">
        {/* HEADER */}
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
                    Defina permissões por cargo com apoio da Aurya para reduzir risco, organizar responsabilidades e proteger módulos sensíveis.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                onClick={aplicarSugestaoAurya}
                disabled={iaApplying}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-5 py-3.5 font-black text-violet-300 transition-all hover:bg-violet-500/15"
              >
                {iaApplying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                {iaApplying ? 'Aplicando IA...' : 'Aplicar sugestão Aurya'}
              </button>

              <button
                onClick={salvarPermissoes}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {saving ? 'Salvando...' : 'Salvar Matriz'}
              </button>
            </div>
          </div>
        </div>

        {/* KPIs / IA */}
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

        {/* INSIGHTS AURYA */}
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
                insight.tipo === 'ok'
                  ? BadgeCheck
                  : insight.tipo === 'alerta'
                  ? ShieldAlert
                  : Eye;

              return (
                <div key={idx} className="rounded-2xl border border-white/10 bg-[#08101f]/70 p-4">
                  <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${style}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {insight.titulo}
                  </div>
                  <p className="text-sm leading-6 text-slate-300">{insight.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* MATRIZ DE PERMISSÕES */}
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Matriz Operacional
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Clique nos blocos para liberar ou restringir acesso por cargo
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
              {MODULOS.length} módulos
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-72 border-b border-white/10 bg-[#0b1324] p-5 text-xs font-black uppercase tracking-widest text-slate-400 backdrop-blur-xl">
                    Módulos do Sistema
                  </th>
                  {CARGOS.map(cargo => (
                    <th
                      key={cargo.id}
                      className="min-w-[150px] border-b border-white/10 bg-[#0b1324] p-5 text-center"
                    >
                      <div
                        className={`inline-flex items-center justify-center rounded-xl border px-4 py-1.5 text-xs font-black uppercase tracking-widest ${cargo.bg} ${cargo.color} ${cargo.border}`}
                      >
                        {cargo.nome}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {MODULOS.map(modulo => {
                  const Icon = modulo.icon;

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
                              className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getBadgeByCriticality(modulo.criticidade)}`}
                            >
                              {modulo.criticidade === 'alta' ? 'Módulo sensível' : 'Uso gerencial'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {CARGOS.map(cargo => {
                        const temPermissao = permissoes[cargo.id]?.includes(modulo.id);

                        return (
                          <td
                            key={`${cargo.id}-${modulo.id}`}
                            className="border-r border-white/10 p-4 text-center last:border-r-0"
                          >
                            <button
                              onClick={() => togglePermissao(cargo.id, modulo.id)}
                              className="group/btn rounded-2xl border border-white/10 bg-white/5 p-3 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                              title={`${temPermissao ? 'Remover' : 'Adicionar'} acesso`}
                            >
                              {temPermissao ? (
                                <CheckSquare
                                  className={`h-6 w-6 ${cargo.color} drop-shadow-[0_0_8px_currentColor] transition-transform group-hover/btn:scale-110`}
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
        </div>

        {/* INFO BOX */}
        <div className="rounded-[24px] border border-violet-400/20 bg-violet-500/10 p-5">
          <div className="flex items-start gap-4">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-violet-300" />
            <div>
              <h4 className="mb-1 text-sm font-black text-violet-300">
                Como funciona a Matriz Inteligente de Acesso?
              </h4>
              <p className="text-sm leading-6 text-violet-100/80">
                As permissões marcadas definem quais menus e telas ficam visíveis para cada grupo de usuários.
                A Aurya recomenda adotar a política de menor privilégio: cada cargo deve acessar apenas o que precisa
                para operar. O cargo <strong>SUPER_ADMIN</strong> permanece com acesso irrestrito por padrão.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
