import { useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  FolderTree,
  Plus,
  Save,
  X,
  Hash,
  Loader2,
  FileX,
  Sparkles,
  Landmark,
  Search
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IPlanoConta {
  id: string;
  codigoEstrutural: string;
  codigoReduzido?: string;
  nomeConta: string;
  tipoConta: 'SINTETICA' | 'ANALITICA';
  natureza: 'DEVEDORA' | 'CREDORA';
  // 🚀 ATUALIZADO: Novos grupos contábeis oficiais
  grupo: 'ATIVO' | 'PASSIVO' | 'PATRIMONIO LIQUIDO' | 'CONTAS DE RESULTADO' | 'CONTAS DE COMPENSAÇÃO' | 'OUTRAS';
  nivel: number;
  ativa: boolean;
  contaReferencial?: string;
}

export function PlanoContasPage() {
  const [contas, setContas] = useState<IPlanoConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');

  const [formData, setFormData] = useState<Partial<IPlanoConta>>({
    codigoEstrutural: '',
    codigoReduzido: '',
    nomeConta: '',
    tipoConta: 'ANALITICA',
    nivel: 1,
    natureza: 'DEVEDORA',
    grupo: 'ATIVO', // Default atualizado
    contaReferencial: ''
  });

  useEffect(() => {
    carregarContas();
  }, []);

  const carregarContas = async () => {
    setLoading(true);
    try {
      const response = await api.get<IPlanoConta[]>('/api/contabilidade/planos');

      const contasOrdenadas = response.data.sort((a, b) =>
        a.codigoEstrutural.localeCompare(b.codigoEstrutural)
      );
      setContas(contasOrdenadas);
    } catch (error) {
      console.error('Erro ao buscar contas', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!formData.codigoEstrutural || !formData.nomeConta) {
      return alert('Preencha o código estrutural e o nome da conta!');
    }

    setSaving(true);
    try {
      await api.post<IPlanoConta>('/api/contabilidade/planos', formData);

      alert('✅ Conta criada com sucesso!');
      setIsModalOpen(false);
      setFormData({
        codigoEstrutural: '',
        codigoReduzido: '',
        nomeConta: '',
        tipoConta: 'ANALITICA',
        nivel: 1,
        natureza: 'DEVEDORA',
        grupo: 'ATIVO',
        contaReferencial: ''
      });
      carregarContas();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao salvar conta contábil.');
    } finally {
      setSaving(false);
    }
  };

  const contasFiltradas = contas.filter(conta => {
    const termo = busca.toLowerCase();
    return (
      conta.nomeConta.toLowerCase().includes(termo) ||
      conta.codigoEstrutural.includes(termo) ||
      (conta.codigoReduzido && conta.codigoReduzido.toLowerCase().includes(termo))
    );
  });

  // 🚀 ATUALIZADO: Formatação visual dos novos grupos
  const formatarGrupo = (grupo: string) => {
    switch (grupo) {
      case 'ATIVO': return '1. Ativo';
      case 'PASSIVO': return '2. Passivo';
      case 'PATRIMONIO LIQUIDO': return '3. Patrimônio Líquido';
      case 'CONTAS DE RESULTADO': return '4. Contas de Resultado';
      case 'CONTAS DE COMPENSAÇÃO': return '5. Contas de Compensação';
      case 'OUTRAS': return '6. Outras';
      default: return grupo;
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15';
  const labelClass =
    'mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal {
          animation: modalEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        
        {/* CABEÇALHO */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Accounting Structure
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <FolderTree className="h-8 w-8 text-violet-300" />
                </div>
                Plano de Contas
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Estrutura hierárquica das contas contábeis para balanço patrimonial
                e DRE, com suporte a contas sintéticas e analíticas.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Nova Conta
            </button>
          </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div className="bg-[#08101f]/90 border border-white/10 rounded-[20px] p-4 shadow-xl backdrop-blur-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por Estrutural (ex: 1.01), Reduzido (ex: 00001) ou Nome..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${inputClass} pl-12`}
            />
          </div>
        </div>

        {/* TABELA DA ÁRVORE CONTÁBIL */}
        <div className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="overflow-x-auto flex-1">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-12 gap-4 border-b border-white/10 bg-black/10 p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <div className="col-span-2 pl-2">Estrutural</div>
                <div className="col-span-1">Reduzido</div>
                <div className="col-span-4">Nome da Conta</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-2">Natureza / Grupo</div>
                <div className="col-span-1 text-center">Status</div>
              </div>

              <div className="divide-y divide-white/5">
                {loading ? (
                  <div className="flex flex-col items-center gap-4 p-16 text-center">
                    <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                    </div>
                    <p className="font-bold text-slate-300">
                      Carregando estrutura contábil...
                    </p>
                  </div>
                ) : contasFiltradas.length === 0 ? (
                  <div className="flex flex-col items-center bg-black/10 p-16 text-center">
                    <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <FileX className="h-12 w-12 text-slate-500" />
                    </div>
                    <p className="text-lg font-black text-white">
                      Nenhuma conta encontrada
                    </p>
                  </div>
                ) : (
                  contasFiltradas.map(conta => {
                    const isSintetica = conta.tipoConta === 'SINTETICA';
                    const paddingLeft = `${(conta.nivel - 1) * 1.5}rem`;

                    return (
                      <div
                        key={conta.id}
                        className={`grid grid-cols-12 gap-4 items-center p-4 transition-colors hover:bg-white/5 ${
                          isSintetica ? 'bg-white/[0.03]' : ''
                        }`}
                      >
                        <div
                          className={`col-span-2 pl-2 font-mono text-sm ${
                            isSintetica ? 'font-black text-white' : 'font-bold text-slate-400'
                          }`}
                        >
                          {conta.codigoEstrutural}
                        </div>

                        <div className="col-span-1 font-mono text-sm font-black text-emerald-400">
                          {conta.codigoReduzido || '-'}
                        </div>

                        <div
                          className="col-span-4 flex items-center gap-2"
                          style={{ paddingLeft }}
                        >
                          {!isSintetica && (
                            <Hash className="h-3.5 w-3.5 shrink-0 text-violet-400/50" />
                          )}

                          <span
                            className={
                              isSintetica
                                ? 'text-sm font-black uppercase tracking-[0.12em] text-white'
                                : 'font-medium text-slate-300'
                            }
                          >
                            {conta.nomeConta}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                              isSintetica
                                ? 'border-white/10 bg-white/5 text-slate-400'
                                : 'border-violet-400/20 bg-violet-500/10 text-violet-300'
                            }`}
                          >
                            {conta.tipoConta}
                          </span>
                        </div>

                        <div className="col-span-2 flex flex-col gap-0.5 text-xs text-slate-400">
                          <span className="font-medium text-slate-300">{conta.natureza}</span>
                          <span className="font-bold text-violet-300/70">{formatarGrupo(conta.grupo)}</span>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <div
                            className={`h-3 w-3 rounded-full border-2 ${
                              conta.ativa
                                ? 'border-emerald-300 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.45)]'
                                : 'border-slate-600 bg-slate-700'
                            }`}
                            title={conta.ativa ? 'Ativa' : 'Inativa'}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/10 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Landmark className="h-4 w-4 text-violet-300" />
              A hierarquia do plano de contas organiza a base para conciliação, razão, DRE e balanço patrimonial.
            </div>
          </div>
        </div>

        {/* MODAL DE CADASTRO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative flex w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-400" />

              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-6 py-6 sm:px-8">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Nova conta
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    Nova Conta Contábil
                  </h2>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="custom-scrollbar max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Código Estrutural *</label>
                    <input
                      type="text"
                      value={formData.codigoEstrutural}
                      onChange={(e) => setFormData({ ...formData, codigoEstrutural: e.target.value })}
                      placeholder="Ex: 1.01.02.003.00001"
                      className={`${inputClass} font-mono text-base font-bold text-violet-300`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Código Reduzido</label>
                    <input
                      type="text"
                      value={formData.codigoReduzido}
                      onChange={(e) => setFormData({ ...formData, codigoReduzido: e.target.value })}
                      placeholder="Ex: 00001 ou 15"
                      className={`${inputClass} font-mono text-base font-black text-emerald-400`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
                  <div className="sm:col-span-3">
                    <label className={labelClass}>Nome da Conta *</label>
                    <input
                      type="text"
                      value={formData.nomeConta}
                      onChange={(e) => setFormData({ ...formData, nomeConta: e.target.value })}
                      placeholder="Ex: Clientes Nacionais"
                      className={`${inputClass} text-base font-bold`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nível</label>
                    <input
                      type="number"
                      min="1"
                      max="9"
                      value={formData.nivel}
                      onChange={(e) => setFormData({ ...formData, nivel: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Tipo de Conta</label>
                    <select
                      value={formData.tipoConta}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tipoConta: e.target.value as 'SINTETICA' | 'ANALITICA'
                        })
                      }
                      className={inputClass}
                    >
                      <option value="SINTETICA">Sintética (Apenas Totaliza)</option>
                      <option value="ANALITICA">Analítica (Recebe Lançamentos)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Natureza</label>
                    <select
                      value={formData.natureza}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          natureza: e.target.value as 'DEVEDORA' | 'CREDORA'
                        })
                      }
                      className={inputClass}
                    >
                      <option value="DEVEDORA">Devedora (Aumenta a Débito)</option>
                      <option value="CREDORA">Credora (Aumenta a Crédito)</option>
                    </select>
                  </div>

                  {/* 🚀 ATUALIZADO: Select com os novos grupos contábeis */}
                  <div>
                    <label className={labelClass}>Grupo Contábil</label>
                    <select
                      value={formData.grupo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grupo: e.target.value as any
                        })
                      }
                      className={inputClass}
                    >
                      <option value="ATIVO">1. Ativo (Bens e Direitos)</option>
                      <option value="PASSIVO">2. Passivo (Obrigações)</option>
                      <option value="PATRIMONIO LIQUIDO">3. Patrimônio Líquido</option>
                      <option value="CONTAS DE RESULTADO">4. Contas de Resultado (Receitas/Despesas)</option>
                      <option value="CONTAS DE COMPENSAÇÃO">5. Contas de Compensação</option>
                      <option value="OUTRAS">6. Outras</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Conta Referencial (SPED) - Opcional</label>
                  <input
                    type="text"
                    value={formData.contaReferencial}
                    onChange={(e) => setFormData({ ...formData, contaReferencial: e.target.value })}
                    placeholder="Código da Receita Federal"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/10 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSalvar}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Conta'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}