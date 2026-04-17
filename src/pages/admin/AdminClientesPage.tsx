import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import {
  Building2, Plus, X, ShieldCheck, CheckCircle2,
  User, Key, Mail, FileText, Loader2, Server, Settings, Save, ChevronDown, ChevronRight
} from 'lucide-react';
import { AxiosError } from 'axios';
import { MODULES_CONFIG } from '../../config/permissions';

interface SubModulo {
  id: string;
  nome: string;
}

interface ModuloHierarquico {
  id: string;
  nome: string;
  subModulos?: SubModulo[];
}

const MODULOS_HIERARQUICOS: ModuloHierarquico[] = [
  { id: 'ESTRUTURA', nome: 'Administrativo (Estrutura)', subModulos: [
    { id: 'ESTRUTURA.PRODUTOS', nome: 'Produtos' },
    { id: 'ESTRUTURA.CATEGORIAS', nome: 'Categorias' },
    { id: 'ESTRUTURA.EMBALAGENS', nome: 'Embalagens (BOM)' },
    { id: 'ESTRUTURA.PESSOAS', nome: 'Pessoas' },
    { id: 'ESTRUTURA.EQUIPES', nome: 'Equipe' },
    { id: 'ESTRUTURA.PERMISSOES', nome: 'Permissões' },
    { id: 'ESTRUTURA.MINHA_LOJA', nome: 'Minha Loja' },
    { id: 'ESTRUTURA.ETIQUETAS', nome: 'Layout Etiquetas' },
    { id: 'ESTRUTURA.ESTACOES', nome: 'Estações de Trabalho' },
    { id: 'ESTRUTURA.LOCAIS_COBRANCA', nome: 'Locais de Cobrança' },
    { id: 'ESTRUTURA.CAIXAS_PDV', nome: 'Caixas PDV' },
    { id: 'ESTRUTURA.TEF', nome: 'Gestão TEF' },
    { id: 'ESTRUTURA.BALANCAS', nome: 'Balanças' },
  ]},
  { id: 'PDV', nome: 'Vendas PDV', subModulos: [
    { id: 'PDV.VAREJO', nome: 'PDV Varejo' },
    { id: 'PDV.AUTOATENDIMENTO', nome: 'Autoatendimento' },
  ]},
  { id: 'FOOD_SERVICE', nome: 'Food Service', subModulos: [
    { id: 'FOOD_SERVICE.PDV', nome: 'PDV Food' },
    { id: 'FOOD_SERVICE.AUTOATENDIMENTO', nome: 'Autoatendimento FOODS' },
    { id: 'FOOD_SERVICE.CARDAPIOS', nome: 'Cadastro de Cardápio' },
    { id: 'FOOD_SERVICE.KDS', nome: 'KDS (Cozinha)' },
    { id: 'FOOD_SERVICE.DELIVERY', nome: 'Gestão Delivery/Pedidos' },
    { id: 'FOOD_SERVICE.EXPEDICAO', nome: 'Gestão Food/Expedição' },
    { id: 'FOOD_SERVICE.COMANDA_MOBILE', nome: 'Comanda Mobile' },
    { id: 'FOOD_SERVICE.GARCOM', nome: 'Garçom (Mesas)' },
    { id: 'FOOD_SERVICE.IFOOD', nome: 'Pedidos IFOOD' },
  ]},
  { id: 'COMERCIAL', nome: 'Comercial', subModulos: [
    { id: 'COMERCIAL.CAMPANHAS', nome: 'Campanhas e Promoções' },
    { id: 'COMERCIAL.LISTA_PRECO', nome: 'Listas de Preços' },
    { id: 'COMERCIAL.CARGA_BALANCA', nome: 'Carga de Balanças' },
  ]},
  { id: 'COMPRAS', nome: 'Compras', subModulos: [
    { id: 'COMPRAS.SOLICITACOES', nome: 'Solicitações' },
    { id: 'COMPRAS.COTACOES', nome: 'Cotações' },
    { id: 'COMPRAS.GER_COTACOES', nome: 'Gerenciar Cotações' },
    { id: 'COMPRAS.APROVACAO', nome: 'Aprovação de Compras' },
    { id: 'COMPRAS.PEDIDOS', nome: 'Pedidos' },
    { id: 'COMPRAS.ACOMPANHAMENTO', nome: 'Acompanhamento P2P' },
    { id: 'COMPRAS.PEDIDOS_RECEBIMENTO', nome: 'Pedidos de Recebimento' },
    { id: 'COMPRAS.RECEBIMENTO', nome: 'Recebimento Mercadorias' },
    { id: 'COMPRAS.DIVERGENCIAS', nome: 'Divergências' },
    { id: 'COMPRAS.XML', nome: 'XML' },
    { id: 'COMPRAS.NOTAS_ENTRADA', nome: 'Notas de Entrada' },
    { id: 'COMPRAS.AURYA', nome: 'Análise Aurya' },
  ]},
  { id: 'ESTOQUE', nome: 'Estoque', subModulos: [
    { id: 'ESTOQUE.AURYA', nome: 'Inteligência de Estoque' },
    { id: 'ESTOQUE.GESTAO', nome: 'Gestão' },
    { id: 'ESTOQUE.INVENTARIO', nome: 'Inventário' },
    { id: 'ESTOQUE.BIPADOR', nome: 'Bipador' },
    { id: 'ESTOQUE.LISTAS_PRECO', nome: 'Listas de Preços' },
    { id: 'ESTOQUE.CARGA_BALANCAS', nome: 'Carga de Balanças' },
  ]},
  { id: 'WMS', nome: 'Logística WMS', subModulos: [
    { id: 'WMS.RECEBIMENTO', nome: 'Recebimento (Doca)' },
    { id: 'WMS.ARMAZENAGEM', nome: 'Armazenagem (Putaway)' },
    { id: 'WMS.MAPA', nome: 'Mapa de Estoque' },
    { id: 'WMS.CAMARAS', nome: 'Câmaras Frias & Áreas' },
  ]},
  { id: 'PRODUCAO', nome: 'Produção', subModulos: [
    { id: 'PRODUCAO.ORDENS', nome: 'Ordens de Produção' },
    { id: 'PRODUCAO.BALANCA', nome: 'Terminal de Balança' },
  ]},
  { id: 'FISCAL', nome: 'Fiscal', subModulos: [
    { id: 'FISCAL.PDV', nome: 'Notas PDV' },
    { id: 'FISCAL.NFE', nome: 'NF-e' },
    { id: 'FISCAL.MOTOR', nome: 'Motor Fiscal' },
    { id: 'FISCAL.CFOP', nome: 'CFOP' },
  ]},
  { id: 'FINANCEIRO', nome: 'Financeiro', subModulos: [
    { id: 'FINANCEIRO.AURYA', nome: 'Aurya Análise Financeiro' },
    { id: 'FINANCEIRO.TITULOS', nome: 'Títulos (Pagar/Receber)' },
    { id: 'FINANCEIRO.CONTAS_CAIXAS', nome: 'Contas e Caixas' },
    { id: 'FINANCEIRO.EXTRATO', nome: 'Extrato de Contas' },
    { id: 'FINANCEIRO.CHEQUES', nome: 'Cheques' },
  ]},
  { id: 'CONTABIL', nome: 'Contabilidade', subModulos: [
    { id: 'CONTABIL.AURYA', nome: 'Aurya Diagnóstico Contábil' },
    { id: 'CONTABIL.DRE', nome: 'DRE' },
    { id: 'CONTABIL.PLANO_CONTAS', nome: 'Plano de Contas' },
    { id: 'CONTABIL.RAZAO', nome: 'Livro Razão' },
    { id: 'CONTABIL.CONCILIACAO', nome: 'Conciliação' },
    { id: 'CONTABIL.FECHAMENTO', nome: 'Fechamento Contábil' },
  ]},
  { id: 'IA', nome: 'Central Aurya', subModulos: [
    { id: 'IA.INSIGHTS', nome: 'Insights' },
    { id: 'IA.ALERTAS', nome: 'Alertas' },
    { id: 'IA.OPORTUNIDADES', nome: 'Oportunidades' },
  ]},
  { id: 'DASHBOARD', nome: 'Dashboards' },
];

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface ILojaAdmin {
  id: string;
  nome: string;
  cnpj?: string;
  plano: string;
  statusLicenca: 'ATIVA' | 'TRIAL' | 'INADIMPLENTE' | 'SUSPENSA' | 'CANCELADA';
  modulosAtivos: string[];
  limiteUsuarios: number;
  limiteTerminais: number;
  _count?: {
    usuarios: number;
  };
}

export interface IFormDataNovoCliente {
  nomeLoja: string;
  cnpj: string;
  plano: string;
  nomeAdmin: string;
  emailAdmin: string;
  senhaAdmin: string;
  modulosAtivos: string[];
  limiteTerminais: number;
}

export function AdminClientesPage() {
  const [clientes, setClientes] = useState<ILojaAdmin[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🚀 NOVOS ESTADOS PARA O MODAL DE GERENCIAR
  const [isGerenciarModalOpen, setIsGerenciarModalOpen] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState<ILojaAdmin | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  /** Redefinição de senha do dono (Master / suporte) — não persiste em `lojaSelecionada`. */
  const [novaSenhaDono, setNovaSenhaDono] = useState('');

  const [formData, setFormData] = useState<IFormDataNovoCliente>({
    nomeLoja: '',
    cnpj: '',
    plano: 'START',
    nomeAdmin: '',
    emailAdmin: '',
    senhaAdmin: '',
    modulosAtivos: ['PDV'],
    limiteTerminais: 1
  });

  const modulosDisponiveis = MODULES_CONFIG.map((m) => ({
    id: m.id,
    desc: m.label,
  }));

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get<ILojaAdmin[]>('/api/admin/lojas');
      setClientes(res.data);
    } catch (error) {
      console.error('Erro ao carregar clientes', error);
      alert('⚠️ Acesso Negado. Apenas o Super Admin pode ver esta tela.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleModulo = (modulo: string) => {
    setFormData(prev => {
      const ativos = prev.modulosAtivos.includes(modulo)
        ? prev.modulosAtivos.filter(m => m !== modulo)
        : [...prev.modulosAtivos, modulo];
      return { ...prev, modulosAtivos: ativos };
    });
  };

  const toggleSubModulo = (subModuloId: string, moduloId: string) => {
    setFormData(prev => {
      const ativos = prev.modulosAtivos.includes(subModuloId)
        ? prev.modulosAtivos.filter(m => m !== subModuloId)
        : [...prev.modulosAtivos, subModuloId];
      
      if (!prev.modulosAtivos.includes(moduloId)) {
        return { ...prev, modulosAtivos: [...ativos, moduloId] };
      }
      return { ...prev, modulosAtivos: ativos };
    });
  };

  const toggleModuleExpansion = (moduloId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduloId)) {
        next.delete(moduloId);
      } else {
        next.add(moduloId);
      }
      return next;
    });
  };

  const isModuloActive = (moduloId: string, modulosAtivos: string[]) => modulosAtivos.includes(moduloId);

  const isSubModuloActive = (subModuloId: string, modulosAtivos: string[]) => modulosAtivos.includes(subModuloId);

  const isAllSubModulosActive = (modulo: ModuloHierarquico, modulosAtivos: string[]) => {
    if (!modulo.subModulos || modulo.subModulos.length === 0) return false;
    return modulo.subModulos.every(sm => modulosAtivos.includes(sm.id));
  };

  const toggleAllSubModulos = (modulo: ModuloHierarquico, setFunc: React.Dispatch<React.SetStateAction<IFormDataNovoCliente>>) => {
    if (!modulo.subModulos) return;
    setFunc(prev => {
      const allActive = modulo.subModulos!.every(sm => prev.modulosAtivos.includes(sm.id));
      let novos: string[];
      if (allActive) {
        novos = prev.modulosAtivos.filter(m => !modulo.subModulos!.map(sm => sm.id).includes(m));
      } else {
        const subs = modulo.subModulos?.map(sm => sm.id) ?? [];
        const withoutParent = prev.modulosAtivos.filter(m => m !== modulo.id && !subs.includes(m));
        novos = [...withoutParent, modulo.id, ...subs];
      }
      return { ...prev, modulosAtivos: novos };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post<ILojaAdmin>('/api/admin/lojas', formData);

      alert('✅ Cliente (Tenant) provisionado com sucesso! Banco de dados isolado criado.');
      setIsModalOpen(false);

      setFormData({
        nomeLoja: '',
        cnpj: '',
        plano: 'START',
        nomeAdmin: '',
        emailAdmin: '',
        senhaAdmin: '',
        modulosAtivos: ['PDV'],
        limiteTerminais: 1
      });

      carregarClientes();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao criar cliente:', error.response?.data || error.message);
      alert(`❌ Erro ao criar cliente: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 🚀 FUNÇÕES PARA GERENCIAR CLIENTE
  const abrirModalGerenciar = (loja: ILojaAdmin) => {
    setLojaSelecionada({ 
      ...loja, 
      limiteTerminais: loja.limiteTerminais ?? 1 
    }); // Cria uma cópia para não alterar a tabela antes de salvar
    setNovaSenhaDono('');
    setIsGerenciarModalOpen(true);
  };

  const fecharModalGerenciar = () => {
    setNovaSenhaDono('');
    setIsGerenciarModalOpen(false);
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!lojaSelecionada) return;
    const value = e.target.name === 'limiteUsuarios' || e.target.name === 'limiteTerminais'
      ? parseInt(e.target.value) || 0
      : e.target.value;
    setLojaSelecionada({ ...lojaSelecionada, [e.target.name]: value });
  };

  const toggleModuloEdit = (modulo: string) => {
    if (!lojaSelecionada) return;
    const ativos = lojaSelecionada.modulosAtivos.includes(modulo)
      ? lojaSelecionada.modulosAtivos.filter(m => m !== modulo)
      : [...lojaSelecionada.modulosAtivos, modulo];
    setLojaSelecionada({ ...lojaSelecionada, modulosAtivos: ativos });
  };

  const toggleSubModuloEdit = (subModuloId: string, moduloId: string) => {
    if (!lojaSelecionada) return;
    const ativos = lojaSelecionada.modulosAtivos.includes(subModuloId)
      ? lojaSelecionada.modulosAtivos.filter(m => m !== subModuloId)
      : [...lojaSelecionada.modulosAtivos, subModuloId];
    
    if (!lojaSelecionada.modulosAtivos.includes(moduloId)) {
      setLojaSelecionada({ ...lojaSelecionada, modulosAtivos: [...ativos, moduloId] });
    } else {
      setLojaSelecionada({ ...lojaSelecionada, modulosAtivos: ativos });
    }
  };

  const toggleAllSubModulosEdit = (modulo: ModuloHierarquico) => {
    if (!modulo.subModulos || !lojaSelecionada) return;
    const allActive = modulo.subModulos!.every(sm => lojaSelecionada.modulosAtivos.includes(sm.id));
    setLojaSelecionada(prev => {
      if (!prev) return prev;
      const allActive = modulo.subModulos!.every(sm => prev.modulosAtivos.includes(sm.id));
      let novos: string[];
      if (allActive) {
        novos = prev.modulosAtivos.filter(m => !modulo.subModulos!.map(sm => sm.id).includes(m));
      } else {
        const subs = modulo.subModulos?.map(sm => sm.id) ?? [];
        const withoutParent = prev.modulosAtivos.filter(m => m !== modulo.id && !subs.includes(m));
        novos = [...withoutParent, modulo.id, ...subs];
      }
      return { ...prev, modulosAtivos: novos };
    });
  };

  const handleUpdateCliente = async (e: FormEvent) => {
    e.preventDefault();
    if (!lojaSelecionada) return;

    const senhaTrim = novaSenhaDono.trim();
    if (senhaTrim.length > 0 && senhaTrim.length < 6) {
      alert('A nova senha do dono deve ter no mínimo 6 caracteres ou ficar em branco.');
      return;
    }

    setSavingEdit(true);
    try {
      const modulosValidos = [
        'PDV', 'FOOD_SERVICE', 'WMS', 'FINANCEIRO', 'CONTABIL', 'ESTOQUE',
        'COMPRAS', 'NFE', 'ESTRUTURA', 'IA', 'FISCAL', 'COMERCIAL', 'PRODUCAO', 'DASHBOARD'
      ];
      
      const isValidModule = (m: string): boolean => {
        const upper = m.toUpperCase();
        if (modulosValidos.includes(upper)) return true;
        const parts = upper.split('.');
        if (parts.length === 2 && modulosValidos.includes(parts[0])) return true;
        return false;
      };

      const modulosAtivosFiltrados = (lojaSelecionada.modulosAtivos || []).filter(isValidModule);

      const payload: Record<string, unknown> = {
        nome: lojaSelecionada.nome,
        plano: lojaSelecionada.plano,
        statusLicenca: lojaSelecionada.statusLicenca,
        modulosAtivos: modulosAtivosFiltrados.length > 0 ? modulosAtivosFiltrados : ['PDV', 'IA'],
        limiteUsuarios: Number(lojaSelecionada.limiteUsuarios) || 3,
        limiteTerminais: Number(lojaSelecionada.limiteTerminais) || 1,
      };
      if (senhaTrim.length >= 6) {
        payload.novaSenhaDono = senhaTrim;
      }

      await api.put(`/api/admin/lojas/${lojaSelecionada.id}`, payload);

      alert(
        senhaTrim.length >= 6
          ? '✅ Cliente atualizado e senha do dono redefinida com sucesso!'
          : '✅ Cliente atualizado com sucesso!'
      );
      fecharModalGerenciar();
      carregarClientes(); // Recarrega a tabela com os novos dados
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao atualizar cliente:', error.response?.data || error.message);
      alert(`❌ Erro ao atualizar cliente: ${error.response?.data?.error || error.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const formatarCnpj = (cnpj?: string) => {
    if (!cnpj) return '-';
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length === 14) return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return cnpj;
  };

  const inputClass =
    'w-full p-3.5 bg-[#0b1324] border border-white/10 text-white rounded-xl focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500 text-sm shadow-inner';

  const labelClass =
    'block text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-1.5 pl-1';

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* HEADER */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]"></div>
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]"></div>

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                <ShieldCheck className="w-8 h-8 text-violet-300" />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  Gestão SaaS
                </div>
                <h1 className="text-3xl font-black text-white">Gestão de Clientes (SaaS)</h1>
                <p className="mt-1 text-lg font-medium text-slate-300">
                  Controle de inquilinos, licenças e provisionamento de módulos.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="relative z-10 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.30)] transition-all hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" /> Novo Cliente (Tenant)
            </button>
          </div>
        </div>

        {/* TABELA DE CLIENTES */}
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-[#0b1324] border-b border-white/10">
                <tr>
                  <th className="p-5 text-xs font-black uppercase tracking-wider text-slate-400">Empresa (Loja)</th>
                  <th className="p-5 text-xs font-black uppercase tracking-wider text-slate-400">Status / Plano</th>
                  <th className="p-5 text-xs font-black uppercase tracking-wider text-slate-400">Módulos Contratados</th>
                  <th className="p-5 text-center text-xs font-black uppercase tracking-wider text-slate-400">Usuários</th>
                  <th className="p-5 text-center text-xs font-black uppercase tracking-wider text-slate-400">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-violet-300" />
                      <p className="font-bold text-slate-400">Carregando base de inquilinos...</p>
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="bg-[#08101f]/40 p-16 text-center">
                      <Server className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                      <p className="text-lg font-bold text-slate-300">Nenhum cliente cadastrado ainda.</p>
                      <p className="mt-1 font-medium text-slate-500">Crie o primeiro tenant para começar a faturar.</p>
                    </td>
                  </tr>
                ) : (
                  clientes.map((loja) => (
                    <tr key={loja.id} className="group transition-colors hover:bg-white/5">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0b1324]">
                            <Building2 className="w-5 h-5 text-violet-300" />
                          </div>
                          <div>
                            <p className="text-base font-black text-white">{loja.nome}</p>
                            <p className="mt-0.5 font-mono text-xs text-slate-400">{formatarCnpj(loja.cnpj)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                            loja.statusLicenca === 'ATIVA'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : loja.statusLicenca === 'TRIAL'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                              : loja.statusLicenca === 'SUSPENSA'
                              ? 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                              : 'bg-red-500/10 text-red-300 border-red-500/20'
                          }`}>
                            {loja.statusLicenca}
                          </span>
                          <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
                            {loja.plano}
                          </span>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex flex-wrap gap-1.5">
                          {loja.modulosAtivos?.map((mod: string) => (
                            <span
                              key={mod}
                              className="rounded border border-white/10 bg-[#0b1324] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300"
                            >
                              {mod}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-5 text-center">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1324] px-3 py-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-white">
                            {loja._count?.usuarios || 0} <span className="mx-0.5 text-slate-500">/</span> {loja.limiteUsuarios}
                          </span>
                        </div>
                      </td>

                      <td className="p-5 text-center">
                        <button 
                          onClick={() => abrirModalGerenciar(loja)} // 🚀 AQUI ESTÁ A NOVA FUNÇÃO DO BOTÃO
                          className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-violet-300 opacity-0 transition-colors hover:bg-violet-500/20 hover:text-violet-200 group-hover:opacity-100"
                        >
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE CRIAÇÃO DE CLIENTE */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="my-8 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.60)] animate-modal">
              <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600"></div>

              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1324]/70 p-6 sm:p-8">
                <div>
                  <h2 className="flex items-center gap-3 text-xl font-black text-white sm:text-2xl">
                    <Building2 className="w-7 h-7 text-violet-300" /> Provisionar Novo Cliente
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">Crie o banco de dados isolado e defina os acessos.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="custom-scrollbar flex-1 overflow-y-auto p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  {/* Coluna 1: Dados da Empresa e Admin */}
                  <div className="space-y-8">
                    <div className="rounded-2xl border border-white/10 bg-[#0b1324]/70 p-6 shadow-inner">
                      <h3 className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500"></div> 1. Dados da Empresa
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>Nome da Empresa/Loja *</label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                              required
                              type="text"
                              name="nomeLoja"
                              value={formData.nomeLoja}
                              onChange={handleInputChange}
                              className={`${inputClass} pl-12`}
                              placeholder="Ex: Supermercado Silva"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>CNPJ</label>
                            <div className="relative">
                              <FileText className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                              <input
                                type="text"
                                name="cnpj"
                                value={formData.cnpj}
                                onChange={handleInputChange}
                                className={`${inputClass} pl-12 font-mono`}
                                placeholder="Apenas números"
                              />
                            </div>
                          </div>

                          <div>
                            <label className={labelClass}>Plano Base</label>
                            <select
                              name="plano"
                              value={formData.plano}
                              onChange={handleInputChange}
                              className={`${inputClass} font-black text-white`}
                            >
                              <option value="START">START</option>
                              <option value="PRO">PRO</option>
                              <option value="ENTERPRISE">ENTERPRISE</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Qtd. de Estações (Terminais)</label>
                            <div className="relative">
                              <Server className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                              <input
                                type="number"
                                name="limiteTerminais"
                                min={1}
                                value={formData.limiteTerminais}
                                onChange={(e) => setFormData({ ...formData, limiteTerminais: parseInt(e.target.value) || 1 })}
                                className={`${inputClass} pl-12 font-mono`}
                                placeholder="Ex: 5"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0b1324]/70 p-6 shadow-inner">
                      <h3 className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> 2. Usuário Master (Dono)
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>Nome Completo *</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                              required
                              type="text"
                              name="nomeAdmin"
                              value={formData.nomeAdmin}
                              onChange={handleInputChange}
                              className={`${inputClass} pl-12`}
                              placeholder="Ex: João da Silva"
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>E-mail de Acesso *</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                              required
                              type="email"
                              name="emailAdmin"
                              value={formData.emailAdmin}
                              onChange={handleInputChange}
                              className={`${inputClass} pl-12`}
                              placeholder="joao@empresa.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Senha Inicial *</label>
                          <div className="relative">
                            <Key className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                              required
                              type="password"
                              name="senhaAdmin"
                              value={formData.senhaAdmin}
                              onChange={handleInputChange}
                              className={`${inputClass} pl-12 font-mono`}
                              placeholder="Min. 6 caracteres"
                              minLength={6}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Módulos Contratados */}
                  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0b1324]/70 p-6 shadow-inner">
                    <h3 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-sky-500"></div> 3. Provisionamento de Módulos
                    </h3>
                    <p className="mb-5 text-xs font-medium text-slate-400">
                      Selecione as funcionalidades que este inquilino terá acesso no menu lateral.
                    </p>

                    <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 gap-3">
                        {MODULOS_HIERARQUICOS.map(modulo => {
                          const isAtivo = isModuloActive(modulo.id, formData.modulosAtivos);
                          const isExpanded = expandedModules.has(modulo.id);
                          const hasSubModulos = modulo.subModulos && modulo.subModulos.length > 0;
                          const allSubActive = isAllSubModulosActive(modulo, formData.modulosAtivos);

                          return (
                            <div key={modulo.id} className="rounded-xl border border-white/10 bg-[#08101f] overflow-hidden">
                              <div 
                                className={`flex cursor-pointer items-center p-4 transition-all ${
                                  isAtivo ? 'bg-violet-500/10' : 'hover:bg-white/5'
                                }`}
                                onClick={() => hasSubModulos && toggleModuleExpansion(modulo.id)}
                              >
                                {hasSubModulos ? (
                                  <button
                                    type="button"
                                    className="mr-3 flex h-6 w-6 items-center justify-center rounded border-2 border-white/10 bg-[#0b1324] transition-transform hover:border-violet-500/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleModuleExpansion(modulo.id);
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-violet-300" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-slate-400" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="mr-3 w-6" />
                                )}

                                <div
                                  className={`mr-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                                    isAtivo
                                      ? 'bg-violet-500 border-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.35)]'
                                      : 'border-white/10 bg-[#08101f]'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasSubModulos) {
                                      toggleAllSubModulos(modulo, setFormData);
                                    } else {
                                      toggleModulo(modulo.id);
                                    }
                                  }}
                                >
                                  {isAtivo && <CheckCircle2 className="h-4 w-4 text-white" />}
                                </div>

                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-black uppercase tracking-[0.16em] ${
                                      isAtivo ? 'text-violet-300' : 'text-slate-300'
                                    }`}
                                  >
                                    {modulo.nome}
                                  </p>
                                  {hasSubModulos && (
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                      {allSubActive ? 'Todos marcados' : 'Clique para expandir'}
                                    </p>
                                  )}
                                </div>

                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isAtivo}
                                  onChange={() => hasSubModulos ? toggleAllSubModulos(modulo, setFormData) : toggleModulo(modulo.id)}
                                />
                              </div>

                              {hasSubModulos && isExpanded && (
                                <div className="border-t border-white/10 bg-[#0b1324]/50 p-3 pl-10">
                                  <div className="grid grid-cols-1 gap-2">
                                    {modulo.subModulos!.map(subModulo => {
                                      const isSubAtivo = isSubModuloActive(subModulo.id, formData.modulosAtivos);
                                      return (
                                        <label
                                          key={subModulo.id}
                                          className={`flex cursor-pointer items-center rounded-lg border p-3 transition-all ${
                                            isSubAtivo
                                              ? 'border-violet-500/30 bg-violet-500/10'
                                              : 'border-white/5 bg-[#08101f]/50 hover:border-white/20'
                                          }`}
                                        >
                                          <div
                                            className={`mr-3 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                                              isSubAtivo
                                                ? 'bg-violet-500 border-violet-300'
                                                : 'border-white/10 bg-[#0b1324]'
                                            }`}
                                          >
                                            {isSubAtivo && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                          </div>
                                          <span className={`text-sm font-medium ${isSubAtivo ? 'text-violet-200' : 'text-slate-400'}`}>
                                            {subModulo.nome}
                                          </span>
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSubAtivo}
                                            onChange={() => toggleSubModulo(subModulo.id, modulo.id)}
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex shrink-0 flex-col justify-end gap-4 border-t border-white/10 pt-6 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.30)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Server className="w-5 h-5" />}
                    {saving ? 'Provisionando...' : 'Criar Cliente e Liberar Acesso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🚀 NOVO MODAL: GERENCIAMENTO (EDIÇÃO) DO CLIENTE */}
        {isGerenciarModalOpen && lojaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="my-8 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.60)] animate-modal">
              {/* Detalhe visual: Borda superior Esmeralda para diferenciar do modal de Criação */}
              <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>

              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1324]/70 p-6 sm:p-8">
                <div>
                  <h2 className="flex items-center gap-3 text-xl font-black text-white sm:text-2xl">
                    <Settings className="w-7 h-7 text-emerald-400" /> Gerenciar Cliente
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">Altere o plano, status da licença e módulos de <strong className="text-white">{lojaSelecionada.nome}</strong>.</p>
                </div>
                <button
                  type="button"
                  onClick={fecharModalGerenciar}
                  className="rounded-full bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateCliente} className="custom-scrollbar flex-1 overflow-y-auto p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  
                  {/* Coluna 1: Informações e Licença */}
                  <div className="space-y-8">
                    <div className="rounded-2xl border border-white/10 bg-[#0b1324]/70 p-6 shadow-inner">
                      <h3 className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> 1. Informações e Licença
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>Nome da Empresa/Loja</label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                              required
                              type="text"
                              name="nome"
                              value={lojaSelecionada.nome}
                              onChange={handleEditChange}
                              className={`${inputClass} pl-12`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Status da Licença</label>
                            <select
                              name="statusLicenca"
                              value={lojaSelecionada.statusLicenca}
                              onChange={handleEditChange}
                              className={`${inputClass} font-black ${
                                lojaSelecionada.statusLicenca === 'ATIVA' ? 'text-emerald-400' : 
                                lojaSelecionada.statusLicenca === 'TRIAL' ? 'text-sky-400' : 
                                lojaSelecionada.statusLicenca === 'SUSPENSA' ? 'text-slate-400' : 'text-red-400'
                              }`}
                            >
                              <option value="ATIVA" className="bg-[#0b1020] text-emerald-400">ATIVA</option>
                              <option value="SUSPENSA" className="bg-[#0b1020] text-slate-400">SUSPENSA</option>
                              <option value="INADIMPLENTE" className="bg-[#0b1020] text-red-400">INADIMPLENTE</option>
                              <option value="CANCELADA" className="bg-[#0b1020] text-red-400">CANCELADA</option>
                              <option value="TRIAL" className="bg-[#0b1020] text-sky-400">TRIAL</option>
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Plano Base</label>
                            <select
                              name="plano"
                              value={lojaSelecionada.plano}
                              onChange={handleEditChange}
                              className={`${inputClass} font-black text-white`}
                            >
                              <option value="START" className="bg-[#0b1020]">START</option>
                              <option value="PRO" className="bg-[#0b1020]">PRO</option>
                              <option value="ENTERPRISE" className="bg-[#0b1020]">ENTERPRISE</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Limite de Usuários</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                              required
                              type="number"
                              min="1"
                              name="limiteUsuarios"
                              value={lojaSelecionada.limiteUsuarios}
                              onChange={handleEditChange}
                              className={`${inputClass} pl-12`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Qtd. de Estações (Terminais)</label>
                          <div className="relative">
                            <Server className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                              required
                              type="number"
                              min="1"
                              name="limiteTerminais"
                              value={lojaSelecionada.limiteTerminais}
                              onChange={handleEditChange}
                              className={`${inputClass} pl-12`}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                          <label className={labelClass}>Redefinir senha do dono</label>
                          <div className="relative mt-1">
                            <Key className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500/80" />
                            <input
                              type="password"
                              name="novaSenhaDono"
                              value={novaSenhaDono}
                              onChange={(e) => setNovaSenhaDono(e.target.value)}
                              autoComplete="new-password"
                              placeholder="Deixe em branco para não alterar"
                              className={`${inputClass} pl-12`}
                            />
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                            Preencha apenas se precisar redefinir a senha de acesso do dono desta loja para suporte.
                            Mínimo 6 caracteres.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Módulos Contratados (Edição) */}
                  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0b1324]/70 p-6 shadow-inner">
                    <h3 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-sky-500"></div> 2. Módulos Ativos
                    </h3>
                    <p className="mb-5 text-xs font-medium text-slate-400">
                      Ligue ou desligue o acesso aos módulos para este cliente.
                    </p>

                    <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 gap-3">
                        {MODULOS_HIERARQUICOS.map(modulo => {
                          const isAtivo = isModuloActive(modulo.id, lojaSelecionada.modulosAtivos);
                          const isExpanded = expandedModules.has(modulo.id);
                          const hasSubModulos = modulo.subModulos && modulo.subModulos.length > 0;
                          const allSubActive = isAllSubModulosActive(modulo, lojaSelecionada.modulosAtivos);

                          return (
                            <div key={modulo.id} className="rounded-xl border border-white/10 bg-[#08101f] overflow-hidden">
                              <div 
                                className={`flex cursor-pointer items-center p-4 transition-all ${
                                  isAtivo ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                                }`}
                                onClick={() => hasSubModulos && toggleModuleExpansion(modulo.id)}
                              >
                                {hasSubModulos ? (
                                  <button
                                    type="button"
                                    className="mr-3 flex h-6 w-6 items-center justify-center rounded border-2 border-white/10 bg-[#0b1324] transition-transform hover:border-emerald-500/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleModuleExpansion(modulo.id);
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-emerald-300" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-slate-400" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="mr-3 w-6" />
                                )}

                                <div
                                  className={`mr-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                                    isAtivo
                                      ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                                      : 'border-white/10 bg-[#08101f]'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasSubModulos) {
                                      toggleAllSubModulosEdit(modulo);
                                    } else {
                                      toggleModuloEdit(modulo.id);
                                    }
                                  }}
                                >
                                  {isAtivo && <CheckCircle2 className="h-4 w-4 text-white" />}
                                </div>

                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-black uppercase tracking-[0.16em] ${
                                      isAtivo ? 'text-emerald-300' : 'text-slate-300'
                                    }`}
                                  >
                                    {modulo.nome}
                                  </p>
                                  {hasSubModulos && (
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                      {allSubActive ? 'Todos marcados' : 'Clique para expandir'}
                                    </p>
                                  )}
                                </div>

                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isAtivo}
                                  onChange={() => hasSubModulos ? toggleAllSubModulosEdit(modulo) : toggleModuloEdit(modulo.id)}
                                />
                              </div>

                              {hasSubModulos && isExpanded && (
                                <div className="border-t border-white/10 bg-[#0b1324]/50 p-3 pl-10">
                                  <div className="grid grid-cols-1 gap-2">
                                    {modulo.subModulos!.map(subModulo => {
                                      const isSubAtivo = isSubModuloActive(subModulo.id, lojaSelecionada.modulosAtivos);
                                      return (
                                        <label
                                          key={subModulo.id}
                                          className={`flex cursor-pointer items-center rounded-lg border p-3 transition-all ${
                                            isSubAtivo
                                              ? 'border-emerald-500/30 bg-emerald-500/10'
                                              : 'border-white/5 bg-[#08101f]/50 hover:border-white/20'
                                          }`}
                                        >
                                          <div
                                            className={`mr-3 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                                              isSubAtivo
                                                ? 'bg-emerald-500 border-emerald-300'
                                                : 'border-white/10 bg-[#0b1324]'
                                            }`}
                                          >
                                            {isSubAtivo && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                          </div>
                                          <span className={`text-sm font-medium ${isSubAtivo ? 'text-emerald-200' : 'text-slate-400'}`}>
                                            {subModulo.nome}
                                          </span>
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSubAtivo}
                                            onChange={() => toggleSubModuloEdit(subModulo.id, modulo.id)}
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex shrink-0 flex-col justify-end gap-4 border-t border-white/10 pt-6 sm:flex-row">
                  <button
                    type="button"
                    onClick={fecharModalGerenciar}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-10 py-3.5 font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.30)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                  >
                    {savingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}