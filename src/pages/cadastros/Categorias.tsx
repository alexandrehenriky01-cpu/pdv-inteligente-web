import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import {
  Tags,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  Beef,
  ShoppingBasket,
  Apple,
  Package2,
  Shapes,
  Shirt,
  Pill,
  Wine,
  UtensilsCrossed,
  Hash 
} from 'lucide-react';
import { AxiosError } from 'axios';
import { transformarParaMaiusculas } from '../../utils/formatters';

// 🚀 1. Interface atualizada
export interface Categoria {
  id: string;
  codigo: string; 
  nome: string;
}

interface CategoriaVisualMeta {
  icon: React.ElementType;
  dotClass: string;
  pillClass: string;
  badgeClass: string;
  hint: string;
}

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoCodigo, setNovoCodigo] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregarCategorias = async () => {
    setLoadingList(true);
    try {
      const response = await api.get<Categoria[]>('/api/categorias');
      setCategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoadingList(false);
    }
  };

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🚀 TRAVA DE SEGURANÇA: Mantemos apenas a do Nome. O Código agora é opcional!
    if (!novaCategoria.trim()) {
      alert("⚠️ O nome da categoria é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const payload = transformarParaMaiusculas({
        nome: novaCategoria.trim(),
        codigo: novoCodigo ? novoCodigo.trim() : '',
      }) as { nome: string; codigo: string };
      await api.post<Categoria>('/api/categorias', payload);

      setNovaCategoria('');
      setNovoCodigo('');
      carregarCategorias();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao criar categoria:', error);
      alert(error.response?.data?.error || 'Erro ao criar categoria. Verifique se o código já existe.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (c: Categoria) => {
    setEditandoId(c.id);
    setEditNome(c.nome);
    setEditCodigo(c.codigo);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditNome('');
    setEditCodigo('');
  };

  const handleSalvarEdicao = async () => {
    if (!editandoId || !editNome.trim()) {
      alert('⚠️ O nome da categoria é obrigatório.');
      return;
    }
    setSalvandoEdicao(true);
    try {
      const payload = transformarParaMaiusculas({
        nome: editNome.trim(),
        codigo: editCodigo.trim(),
      }) as { nome: string; codigo: string };
      await api.put<Categoria>(`/api/categorias/${editandoId}`, payload);
      cancelarEdicao();
      carregarCategorias();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao atualizar categoria:', error);
      alert(error.response?.data?.error || 'Erro ao atualizar categoria.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir esta categoria? Produtos vinculados podem ser afetados.',
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/categorias/${id}`);
      carregarCategorias();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao excluir:', error);
      alert(
        error.response?.data?.error ||
          'Erro ao excluir categoria. Ela pode estar em uso por algum produto.',
      );
    }
  };

  useEffect(() => {
    carregarCategorias();
  }, []);

  const getCategoriaMeta = (nome: string): CategoriaVisualMeta => {
    const n = nome.toLowerCase();

    if (n.includes('carne') || n.includes('bovina') || n.includes('suína') || n.includes('aves') || n.includes('frango') || n.includes('açougue')) {
      return { icon: Beef, dotClass: 'bg-rose-400', pillClass: 'border-rose-400/20 bg-rose-500/10 text-rose-300', badgeClass: 'border-rose-400/20 bg-rose-500/10 text-rose-300', hint: 'Proteína' };
    }
    if (n.includes('horti') || n.includes('fruta') || n.includes('verdura') || n.includes('legume')) {
      return { icon: Apple, dotClass: 'bg-emerald-400', pillClass: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300', badgeClass: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300', hint: 'Fresh' };
    }
    if (n.includes('mercearia') || n.includes('mercado') || n.includes('básico') || n.includes('seco')) {
      return { icon: ShoppingBasket, dotClass: 'bg-amber-400', pillClass: 'border-amber-400/20 bg-amber-500/10 text-amber-300', badgeClass: 'border-amber-400/20 bg-amber-500/10 text-amber-300', hint: 'Giro' };
    }
    if (n.includes('bebida') || n.includes('vinho') || n.includes('refrigerante') || n.includes('cerveja')) {
      return { icon: Wine, dotClass: 'bg-sky-400', pillClass: 'border-sky-400/20 bg-sky-500/10 text-sky-300', badgeClass: 'border-sky-400/20 bg-sky-500/10 text-sky-300', hint: 'Bebidas' };
    }
    if (n.includes('embutido') || n.includes('defumado') || n.includes('frios')) {
      return { icon: Package2, dotClass: 'bg-fuchsia-400', pillClass: 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300', badgeClass: 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300', hint: 'Processado' };
    }
    if (n.includes('restaurante') || n.includes('refeição') || n.includes('pronto') || n.includes('cozinha')) {
      return { icon: UtensilsCrossed, dotClass: 'bg-orange-400', pillClass: 'border-orange-400/20 bg-orange-500/10 text-orange-300', badgeClass: 'border-orange-400/20 bg-orange-500/10 text-orange-300', hint: 'Food' };
    }
    if (n.includes('farm') || n.includes('med')) {
      return { icon: Pill, dotClass: 'bg-cyan-400', pillClass: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300', badgeClass: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300', hint: 'Saúde' };
    }
    if (n.includes('roupa') || n.includes('moda') || n.includes('vest')) {
      return { icon: Shirt, dotClass: 'bg-indigo-400', pillClass: 'border-indigo-400/20 bg-indigo-500/10 text-indigo-300', badgeClass: 'border-indigo-400/20 bg-indigo-500/10 text-indigo-300', hint: 'Moda' };
    }

    return { icon: Shapes, dotClass: 'bg-violet-400', pillClass: 'border-violet-400/20 bg-violet-500/10 text-violet-300', badgeClass: 'border-violet-400/20 bg-violet-500/10 text-violet-300', hint: 'Estrutura' };
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* CABEÇALHO */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]" />

          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Product Structure
            </div>

            <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                <Tags className="h-8 w-8 text-violet-300" />
              </div>
              Categorias Inteligentes
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
              Gerencie os departamentos e a organização dos seus produtos com uma
              estrutura visual mais forte, inteligente e vendável.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Coluna da Esquerda: Formulário de Criação */}
          <div className="lg:col-span-4">
            <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_60%,_#0a1224_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-2.5">
                  <Plus className="h-4 w-4 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                    Nova Categoria
                  </h2>
                  <p className="text-xs text-slate-400">
                    Crie novos agrupamentos para seu catálogo.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCriarCategoria} className="space-y-5">
                
                {/* 🚀 ATUALIZADO: Input agora é Opcional */}
                <div>
                  <label className="mb-2 flex items-center gap-2 pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    <Hash className="h-3.5 w-3.5" />
                    Código Curto <span className="text-slate-500 font-normal normal-case tracking-normal ml-1">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={novoCodigo}
                    onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
                    className="w-full rounded-2xl border border-violet-500/30 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none shadow-inner transition-all focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 uppercase"
                    placeholder="Deixe em branco para gerar 1, 2, 3..."
                  />
                </div>

                <div>
                  <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Nome da Categoria *
                  </label>
                  <input
                    required
                    type="text"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                    placeholder="Ex: Bebidas, Açougue..."
                  />
                </div>

                {/* 🚀 ATUALIZADO: O botão agora só trava se não tiver o Nome */}
                <button
                  type="submit"
                  disabled={loading || !novaCategoria.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-black text-white shadow-[0_0_25px_rgba(139,92,246,0.35)] transition-all hover:scale-[1.02] hover:brightness-110 hover:shadow-[0_0_35px_rgba(139,92,246,0.60)] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                  {loading ? 'Salvando...' : 'Adicionar Categoria'}
                </button>
              </form>
            </div>
          </div>

          {/* Coluna da Direita: Lista de Categorias */}
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                    Categorias Cadastradas
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Estrutura estratégica do catálogo
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
                  {categorias.length} {categorias.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div className="space-y-1 p-2">
                {loadingList ? (
                  <div className="p-12 text-center text-slate-400">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-violet-400" />
                    Carregando categorias...
                  </div>
                ) : categorias.length === 0 ? (
                  <div className="p-16 text-center">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                    <p className="font-medium text-slate-400">
                      Nenhuma categoria cadastrada.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Use o formulário ao lado para criar a primeira.
                    </p>
                  </div>
                ) : (
                  categorias.map((categoria) => {
                    const meta = getCategoriaMeta(categoria.nome);
                    const Icon = meta.icon;
                    const emEdicao = editandoId === categoria.id;

                    return (
                      <div
                        key={categoria.id}
                        className="group flex flex-col gap-4 rounded-xl border border-transparent p-4 transition hover:border-white/10 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex flex-1 items-start gap-4 sm:items-center">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.pillClass}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            {emEdicao ? (
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Código
                                  </label>
                                  <input
                                    type="text"
                                    value={editCodigo}
                                    onChange={(e) => setEditCodigo(e.target.value.toUpperCase())}
                                    className="w-full rounded-xl border border-violet-500/30 bg-[#0d182d] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-violet-400/50"
                                  />
                                </div>
                                <div className="flex-[2]">
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Nome
                                  </label>
                                  <input
                                    type="text"
                                    value={editNome}
                                    onChange={(e) => setEditNome(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#0d182d] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/40"
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="inline-flex items-center rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-mono font-black text-violet-300">
                                    {categoria.codigo || 'SEM-CODIGO'}
                                  </span>
                                  <span className="text-base font-bold tracking-wide text-white transition group-hover:text-violet-300">
                                    <span className="truncate">{categoria.nome}</span>
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${meta.badgeClass}`}
                                  >
                                    {meta.hint}
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                    Categoria ativa
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          {emEdicao ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSalvarEdicao}
                                disabled={salvandoEdicao || !editNome.trim()}
                                className="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-40"
                                title="Salvar"
                              >
                                {salvandoEdicao ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <Check className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={cancelarEdicao}
                                disabled={salvandoEdicao}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10"
                                title="Cancelar"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => iniciarEdicao(categoria)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-violet-500/10 hover:text-violet-300"
                                title="Editar categoria"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleExcluir(categoria.id)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                title="Excluir Categoria"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}