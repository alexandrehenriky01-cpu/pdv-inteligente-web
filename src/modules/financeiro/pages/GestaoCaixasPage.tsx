import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Landmark,
  Building2,
  Loader2,
  Wallet,
  AlertCircle,
  CheckCircle,
  Hash,
  DollarSign
} from 'lucide-react';
import { AxiosError } from 'axios';

// 🚀 1. Interface atualizada com o campo 'codigo'
export interface IContaBancaria {
  id: string;
  codigo: string; // Adicionado
  descricao: string;
  bancoId?: string;
  agencia?: string;
  conta?: string;
  saldoInicial: number;
}

export function GestaoCaixasPage() {
  const [caixas, setCaixas] = useState<IContaBancaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caixaSelecionado, setCaixaSelecionado] = useState<IContaBancaria | null>(null);

  // Estados do Formulário
  const [codigo, setCodigo] = useState(''); // 🚀 Novo estado
  const [descricao, setDescricao] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');

  useEffect(() => {
    carregarCaixas();
  }, []);

  async function carregarCaixas() {
    setLoading(true);
    try {
      const response = await api.get<IContaBancaria[]>('/api/financeiro/caixas');
      setCaixas(response.data);
    } catch (err) {
      console.error('Erro ao buscar caixas:', err);
    } finally {
      setLoading(false);
    }
  }

  function abrirModalNovo() {
    setCaixaSelecionado(null);
    setCodigo(''); // Limpa
    setDescricao('');
    setAgencia('');
    setConta('');
    setSaldoInicial('0');
    setIsModalOpen(true);
  }

  function abrirModalEdit(caixa: IContaBancaria) {
    setCaixaSelecionado(caixa);
    setCodigo(caixa.codigo || ''); // Carrega
    setDescricao(caixa.descricao);
    setAgencia(caixa.agencia || '');
    setConta(caixa.conta || '');
    setSaldoInicial(caixa.saldoInicial.toString());
    setIsModalOpen(true);
  }

  function fecharModal() {
    setIsModalOpen(false);
    setCaixaSelecionado(null);
  }

  async function salvarCaixa() {
    // 🚀 TRAVA DE SEGURANÇA
    if (!codigo.trim()) {
      alert('⚠️ O Código (ID Interno ou Número do Banco) é obrigatório.');
      return;
    }

    if (!descricao.trim()) {
      alert('⚠️ A descrição da conta/caixa é obrigatória.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        codigo: codigo.trim().toUpperCase(), // 🚀 Enviando para a API
        descricao,
        agencia,
        conta,
        saldoInicial: Number(saldoInicial)
      };

      if (caixaSelecionado) {
        await api.put(`/api/financeiro/caixas/${caixaSelecionado.id}`, payload);
      } else {
        await api.post('/api/financeiro/caixas', payload);
      }

      fecharModal();
      carregarCaixas();
    } catch (err) {
      const error = err as AxiosError<{ erro?: string, error?: string }>;
      alert(error.response?.data?.erro || error.response?.data?.error || 'Erro ao salvar a conta bancária.');
    } finally {
      setSaving(false);
    }
  }

  async function excluirCaixa(id: string, nome: string) {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${nome}"?`)) {
      try {
        await api.delete(`/api/financeiro/caixas/${id}`);
        carregarCaixas();
      } catch (err) {
        const error = err as AxiosError<{ erro?: string }>;
        alert(error.response?.data?.erro || 'Erro ao excluir. Verifique se existem movimentações vinculadas.');
      }
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50';
  const labelClass = 'mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';

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
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.8); }
      `}</style>

      <div className="mx-auto flex h-full max-w-6xl flex-col space-y-6 pb-12">
        {/* CABEÇALHO */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-300">
                <Landmark className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Contas Bancárias e Caixas</h1>
                <p className="mt-1 font-medium text-slate-400">Gerencie os locais de recebimento e pagamento da sua empresa.</p>
              </div>
            </div>

            <button
              onClick={abrirModalNovo}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Nova Conta / Caixa
            </button>
          </div>
        </div>

        {/* LISTAGEM DE CONTAS (GRID) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="mt-4 font-bold text-slate-400">Carregando contas...</p>
          </div>
        ) : caixas.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 p-16 text-center shadow-xl backdrop-blur-xl">
            <Wallet className="mx-auto mb-4 h-12 w-12 text-slate-500" />
            <p className="text-lg font-black text-white">Nenhuma conta bancária ou caixa cadastrado.</p>
            <p className="mt-2 text-slate-400">Cadastre seu primeiro caixa para poder realizar baixas de títulos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {caixas.map((caixa) => (
              <div key={caixa.id} className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[#08101f]/90 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => abrirModalEdit(caixa)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-cyan-400"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => excluirCaixa(caixa.id, caixa.descricao)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2.5 text-cyan-400">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    {/* 🚀 Exibição do Código no Card */}
                    <span className="inline-block px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-mono font-bold mb-1">
                      {caixa.codigo || 'S/CÓD'}
                    </span>
                    <h3 className="text-lg font-black text-white leading-tight">{caixa.descricao}</h3>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Agência</span>
                    <span className="font-mono text-sm text-slate-300">{caixa.agencia || '---'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Conta</span>
                    <span className="font-mono text-sm text-slate-300">{caixa.conta || '---'}</span>
                  </div>
                  <div className="mt-2 border-t border-white/5 pt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Saldo Inicial</span>
                    <span className="font-mono font-black text-cyan-400">{formatarMoeda(caixa.saldoInicial)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
          <div className="animate-modal w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
            
            <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-6">
              <h2 className="text-xl font-black text-white">{caixaSelecionado ? 'Editar Conta/Caixa' : 'Nova Conta Bancária'}</h2>
              <button onClick={fecharModal} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-6 p-6">
              
              {/* 🚀 NOVO INPUT DE CÓDIGO */}
              <div>
                <label className={labelClass}>Código / Número do Banco *</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input 
                    required
                    type="text" 
                    value={codigo} 
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())} 
                    placeholder="Ex: 001, 341, CX-INT" 
                    className={`${inputClass} pl-12 font-mono uppercase`} 
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Descrição (Nome do Caixa/Banco) *</label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input 
                    required
                    type="text" 
                    value={descricao} 
                    onChange={(e) => setDescricao(e.target.value)} 
                    placeholder="Ex: Caixa Interno, Conta Bradesco, Santander..." 
                    className={`${inputClass} pl-12`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Agência</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="0000-0" className={`${inputClass} pl-11 font-mono`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Conta</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={conta} onChange={(e) => setConta(e.target.value)} placeholder="000000-0" className={`${inputClass} pl-11 font-mono`} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Saldo Inicial (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500" />
                  <input type="number" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} className={`${inputClass} pl-12 font-mono text-lg font-black text-cyan-300 focus:border-cyan-400/30`} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  O saldo inicial será atualizado automaticamente com as baixas de títulos.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/20 p-6 sm:flex-row sm:justify-end">
              <button onClick={fecharModal} className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 hover:bg-white/10 hover:text-white sm:w-auto">Cancelar</button>
              <button onClick={salvarCaixa} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-3.5 font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50 sm:w-auto">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />} Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}