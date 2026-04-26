import { type FC } from 'react';
// src/modules/producao/configuracoes/EstacaoTrabalhoFormModal.tsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  X,
  MonitorSmartphone,
  Scale,
  Printer,
  Factory,
  Truck,
  Settings,
  Loader2,
  AlertCircle,
  Save,
  Link as LinkIcon,
  Network,
  Tag,
  Search,
} from 'lucide-react';
import { api } from '../../../services/api';
import { EstacaoTrabalho, ModoOperacaoEstacao } from '../types/estacaoTrabalho';

type TriBool = '' | 'true' | 'false';

function triFromDb(v: boolean | null | undefined): TriBool {
  if (v === null || v === undefined) return '';
  return v ? 'true' : 'false';
}

function triToPayload(s: TriBool): boolean | null {
  if (s === '') return null;
  return s === 'true';
}

const API_BASE = '/api/producao/configuracoes/estacoes-trabalho';
/** Lista de layouts cadastrados na loja (rota registrada em `routes.ts`). */
const LAYOUT_ETIQUETAS_API = '/api/layout-etiquetas';

/** Mock até integração QZ Tray — substituir por lista real da API/agente. */
const MOCK_IMPRESSORAS_QZ_FUTURO = [
  'ZDesigner GC420t',
  'Zebra TLP2844',
  'Elgin L42 Pro',
  'Argox OS-214 Plus',
  'Microsoft Print to PDF',
  'Enviar para o OneNote',
] as const;

function extrairListaIdNome(payload: unknown): { id: string; nome: string }[] {
  let raw: unknown = payload;
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw) {
    raw = (raw as { data: unknown }).data;
  }
  if (!Array.isArray(raw)) return [];
  const out: { id: string; nome: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = rec.id;
    const nome = rec.nome;
    if (typeof id === 'string' && typeof nome === 'string') {
      out.push({ id, nome });
    }
  }
  return out;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estacao: EstacaoTrabalho | null;
  onSave: () => void;
}

type FormState = {
  nome: string;
  identificadorMaquina: string;
  descricao: string;
  ip: string;
  nomeMaquina: string;
  modoOperacao: ModoOperacaoEstacao;
  ativo: boolean;
  balancaId: string;
  layoutPesagemId: string;
  layoutInternaId: string;
  layoutRecebimentoId: string;
  layoutExpedicaoId: string;
  usarImpressoraPadrao: boolean;
  nomeImpressora: string;
  observacao: string;
  tipoTerminal: 'PDV' | 'TOTEM';
  modoPdv: 'NFCE' | 'CONSUMIDOR';
  totemEmitir: TriBool;
  totemImprimir: TriBool;
  totemExigirCpf: TriBool;
  totemPermitirNome: TriBool;
};

const initialState: FormState = {
  nome: '',
  identificadorMaquina: '',
  descricao: '',
  ip: '',
  nomeMaquina: '',
  modoOperacao: 'PRODUCAO',
  ativo: true,
  balancaId: '',
  layoutPesagemId: '',
  layoutInternaId: '',
  layoutRecebimentoId: '',
  layoutExpedicaoId: '',
  usarImpressoraPadrao: true,
  nomeImpressora: '',
  observacao: '',
  tipoTerminal: 'PDV',
  modoPdv: 'NFCE',
  totemEmitir: '',
  totemImprimir: '',
  totemExigirCpf: '',
  totemPermitirNome: '',
};

const getModoIcon = (modo: string) => {
  switch (modo) {
    case 'PESAGEM':
      return <Scale className="text-emerald-400" size={20} />;
    case 'IMPRESSAO':
      return <Printer className="text-blue-400" size={20} />;
    case 'EXPEDICAO':
      return <Truck className="text-orange-400" size={20} />;
    case 'ADMINISTRATIVO':
      return <Settings className="text-gray-400" size={20} />;
    default:
      return <Factory className="text-violet-400" size={20} />;
  }
};

const EstacaoTrabalhoFormModal: FC<Props> = ({
  isOpen,
  onClose,
  estacao,
  onSave,
}) => {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [balancas, setBalancas] = useState<{ id: string; nome: string }[]>([]);
  const [layouts, setLayouts] = useState<{ id: string; nome: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [impressorasDisponiveis, setImpressorasDisponiveis] = useState<
    string[]
  >([]);
  const [buscandoImpressoras, setBuscandoImpressoras] = useState(false);
  const [impressoraComboAberto, setImpressoraComboAberto] = useState(false);
  const impressoraComboRef = useRef<HTMLDivElement>(null);

  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosError = err as {
        response?: { data?: { message?: string; error?: string } };
      };
      return (
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Erro inesperado na operação.'
      );
    }
    return err instanceof Error ? err.message : 'Erro inesperado.';
  };

  useEffect(() => {
    if (!isOpen) return;

    if (estacao) {
      const pesagem =
        estacao.layoutPesagemId || estacao.layoutEtiquetaId || '';
      setForm({
        nome: estacao.nome,
        identificadorMaquina: estacao.identificadorMaquina,
        descricao: estacao.descricao || '',
        ip: estacao.ip || '',
        nomeMaquina: estacao.nomeMaquina || '',
        modoOperacao: estacao.modoOperacao,
        ativo: estacao.ativo,
        balancaId: estacao.balancaId || '',
        layoutPesagemId: pesagem,
        layoutInternaId: estacao.layoutInternaId || '',
        layoutRecebimentoId: estacao.layoutRecebimentoId || '',
        layoutExpedicaoId: estacao.layoutExpedicaoId || '',
        usarImpressoraPadrao: estacao.usarImpressoraPadrao,
        nomeImpressora: estacao.nomeImpressora || '',
        observacao: estacao.observacao || '',
        tipoTerminal: estacao.tipoTerminal === 'TOTEM' ? 'TOTEM' : 'PDV',
        modoPdv: estacao.modoPdv === 'CONSUMIDOR' ? 'CONSUMIDOR' : 'NFCE',
        totemEmitir: triFromDb(estacao.totemEmitirNfceAutomatico),
        totemImprimir: triFromDb(estacao.totemImprimirComprovante),
        totemExigirCpf: triFromDb(estacao.totemExigirCpf),
        totemPermitirNome: triFromDb(estacao.totemPermitirInformarNome),
      });
    } else {
      setForm(initialState);
    }
    setError(null);
    setImpressorasDisponiveis([]);
    setImpressoraComboAberto(false);
    setBuscandoImpressoras(false);
  }, [estacao, isOpen]);

  useEffect(() => {
    if (!isOpen || estacao) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`${API_BASE}/info-rede`);
        const body = res.data as {
          success?: boolean;
          data?: { ip?: string; nomeMaquina?: string };
          ip?: string;
          nomeMaquina?: string;
        };
        const d =
          body.data ??
          (typeof body.ip === 'string' || typeof body.nomeMaquina === 'string'
            ? { ip: body.ip, nomeMaquina: body.nomeMaquina }
            : undefined);
        if (cancelled || !d) return;
        setForm((f) => ({
          ...f,
          ip: f.ip || (typeof d.ip === 'string' ? d.ip : '') || '',
          nomeMaquina:
            f.nomeMaquina ||
            (typeof d.nomeMaquina === 'string' ? d.nomeMaquina : '') ||
            '',
        }));
      } catch {
        /* silencioso: auto-preenchimento é opcional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, estacao]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [balancasRes, layoutsRes] = await Promise.all([
          api.get('/api/balancas'),
          api.get(LAYOUT_ETIQUETAS_API),
        ]);

        setBalancas(extrairListaIdNome(balancasRes.data));
        setLayouts(extrairListaIdNome(layoutsRes.data));
      } catch (err) {
        console.error('Erro ao carregar opções', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    void fetchOptions();
  }, [isOpen]);

  useEffect(() => {
    const root = impressoraComboRef.current;
    if (!root) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!root.contains(e.target as Node)) {
        setImpressoraComboAberto(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const handleBuscarImpressoras = useCallback(async () => {
    setBuscandoImpressoras(true);
    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1000);
      });
      setImpressorasDisponiveis([...MOCK_IMPRESSORAS_QZ_FUTURO]);
      setImpressoraComboAberto(true);
    } finally {
      setBuscandoImpressoras(false);
    }
  }, []);

  const impressorasFiltradas = useMemo(() => {
    const q = form.nomeImpressora.trim().toLowerCase();
    if (impressorasDisponiveis.length === 0) return [];
    if (!q) return impressorasDisponiveis;
    return impressorasDisponiveis.filter((n) =>
      n.toLowerCase().includes(q),
    );
  }, [impressorasDisponiveis, form.nomeImpressora]);

  const handleChange = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!form.nome.trim() || !form.identificadorMaquina.trim()) {
      setError('Os campos Nome e Identificador da Máquina são obrigatórios.');
      return;
    }

    if (!form.usarImpressoraPadrao && !form.nomeImpressora.trim()) {
      setError(
        'Informe o nome exato da impressora no Windows quando não usar a padrão.',
      );
      return;
    }

    setLoading(true);

    const u = (s: string) => s.trim().toUpperCase();
    const payload: Record<string, unknown> = {
      nome: u(form.nome),
      identificadorMaquina: u(form.identificadorMaquina),
      descricao: form.descricao.trim() ? u(form.descricao) : null,
      ip: form.ip.trim() ? form.ip.trim() : null,
      nomeMaquina: form.nomeMaquina.trim() ? u(form.nomeMaquina) : null,
      modoOperacao: form.modoOperacao,
      ativo: form.ativo,
      balancaId: form.balancaId || null,
      layoutPesagemId: form.layoutPesagemId || null,
      layoutEtiquetaId: form.layoutPesagemId || null,
      layoutInternaId: form.layoutInternaId || null,
      layoutRecebimentoId: form.layoutRecebimentoId || null,
      layoutExpedicaoId: form.layoutExpedicaoId || null,
      usarImpressoraPadrao: form.usarImpressoraPadrao,
      nomeImpressora: form.usarImpressoraPadrao
        ? null
        : u(form.nomeImpressora),
      observacao: form.observacao.trim() ? u(form.observacao) : null,
    };
    payload.tipoTerminal = form.tipoTerminal;
    if (form.tipoTerminal === 'PDV') {
      payload.modoPdv = form.modoPdv;
      payload.totemEmitirNfceAutomatico = null;
      payload.totemImprimirComprovante = null;
      payload.totemExigirCpf = null;
      payload.totemPermitirInformarNome = null;
    } else {
      payload.totemEmitirNfceAutomatico = triToPayload(form.totemEmitir);
      payload.totemImprimirComprovante = triToPayload(form.totemImprimir);
      payload.totemExigirCpf = triToPayload(form.totemExigirCpf);
      payload.totemPermitirInformarNome = triToPayload(form.totemPermitirNome);
    }

    try {
      if (estacao) {
        await api.put(`${API_BASE}/${estacao.id}`, payload);
      } else {
        await api.post(API_BASE, payload);
      }
      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full bg-[#131b2f] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all';
  const labelClass =
    'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b1324] w-full max-w-4xl rounded-2xl border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              {getModoIcon(form.modoOperacao)}
            </div>
            {estacao ? 'Editar Estação de Trabalho' : 'Nova Estação de Trabalho'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
              <MonitorSmartphone size={16} className="text-violet-400" />
              Identificação da Máquina
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome Amigável *</label>
                <input
                  value={form.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: CAIXA 01, BALANÇA AÇOUGUE..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Identificador da Máquina (MAC / Hostname) *
                </label>
                <input
                  value={form.identificadorMaquina}
                  onChange={(e) =>
                    handleChange('identificadorMaquina', e.target.value)
                  }
                  placeholder="Ex: DESKTOP-CX01 OU 00:1A:2B..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Modo de Operação *</label>
                <select
                  value={form.modoOperacao}
                  onChange={(e) =>
                    handleChange(
                      'modoOperacao',
                      e.target.value as ModoOperacaoEstacao,
                    )
                  }
                  className={inputClass}
                >
                  <option value="PRODUCAO">
                    Produção (Chão de Fábrica / Retaguarda)
                  </option>
                  <option value="PESAGEM">Pesagem (Açougue / Padaria)</option>
                  <option value="IMPRESSAO">
                    Estação de Impressão Dedicada
                  </option>
                  <option value="EXPEDICAO">Expedição (Logística)</option>
                  <option value="ADMINISTRATIVO">
                    Administrativo (Escritório)
                  </option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Descrição (opcional)</label>
                <input
                  value={form.descricao}
                  onChange={(e) => handleChange('descricao', e.target.value)}
                  placeholder="Ex: BALANÇA PRINCIPAL DO AÇOUGUE"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-cyan-500/15 bg-[#131b2f]/40 p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
              <Network size={16} className="text-cyan-400" />
              Rede / Terminal
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Ao cadastrar uma nova estação, o IP e o nome do terminal são
              sugeridos a partir da conexão com o servidor (e PTR DNS, quando
              existir). Você pode ajustar antes de salvar.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>IP (visto pelo servidor)</label>
                <input
                  value={form.ip}
                  onChange={(e) => handleChange('ip', e.target.value)}
                  placeholder="Ex: 192.168.1.50"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nome do Terminal</label>
                <input
                  value={form.nomeMaquina}
                  onChange={(e) => handleChange('nomeMaquina', e.target.value)}
                  placeholder="Hostname / nome amigável"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-violet-500/20 bg-[#131b2f]/40 p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
              <MonitorSmartphone size={16} className="text-violet-400" />
              PDV / Totem (documento e autoatendimento)
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              PDV: modo NFc ou Consumidor (F9 no caixa). Totem: use &quot;Padrão da loja&quot; ou defina
              overrides abaixo (valores vazios herdam a loja).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de terminal</label>
                <select
                  value={form.tipoTerminal}
                  onChange={(e) =>
                    handleChange('tipoTerminal', e.target.value as 'PDV' | 'TOTEM')
                  }
                  className={inputClass}
                >
                  <option value="PDV">PDV (caixa / balcão)</option>
                  <option value="TOTEM">Totem / autoatendimento</option>
                </select>
              </div>
              {form.tipoTerminal === 'PDV' ? (
                <div>
                  <label className={labelClass}>Modo padrão do PDV</label>
                  <select
                    value={form.modoPdv}
                    onChange={(e) =>
                      handleChange('modoPdv', e.target.value as 'NFCE' | 'CONSUMIDOR')
                    }
                    className={inputClass}
                  >
                    <option value="NFCE">NFc (NFC-e)</option>
                    <option value="CONSUMIDOR">Consumidor (sem NFC-e automática)</option>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>Emitir NFC-e automaticamente</label>
                    <select
                      value={form.totemEmitir}
                      onChange={(e) =>
                        handleChange('totemEmitir', e.target.value as TriBool)
                      }
                      className={inputClass}
                    >
                      <option value="">Padrão da loja</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Imprimir comprovante</label>
                    <select
                      value={form.totemImprimir}
                      onChange={(e) =>
                        handleChange('totemImprimir', e.target.value as TriBool)
                      }
                      className={inputClass}
                    >
                      <option value="">Padrão da loja</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Exigir CPF</label>
                    <select
                      value={form.totemExigirCpf}
                      onChange={(e) =>
                        handleChange('totemExigirCpf', e.target.value as TriBool)
                      }
                      className={inputClass}
                    >
                      <option value="">Padrão da loja</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Permitir informar nome</label>
                    <select
                      value={form.totemPermitirNome}
                      onChange={(e) =>
                        handleChange('totemPermitirNome', e.target.value as TriBool)
                      }
                      className={inputClass}
                    >
                      <option value="">Padrão da loja</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
              <LinkIcon size={16} className="text-emerald-400" />
              Integrações de Hardware
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>Balança Vinculada</label>
                <select
                  value={form.balancaId}
                  onChange={(e) => handleChange('balancaId', e.target.value)}
                  className={inputClass}
                  disabled={loadingOptions}
                >
                  <option value="">Nenhuma balança vinculada</option>
                  {balancas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
                {loadingOptions && (
                  <Loader2
                    size={16}
                    className="absolute right-4 top-10 animate-spin text-gray-500"
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-[#0b1324]/80 p-5 space-y-4">
              <h4 className="text-xs font-bold text-violet-300 uppercase tracking-widest flex items-center gap-2">
                <Tag size={14} />
                Layouts de Etiqueta por Operação
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Etiqueta Pesagem Produção</label>
                  <select
                    value={form.layoutPesagemId}
                    onChange={(e) =>
                      handleChange('layoutPesagemId', e.target.value)
                    }
                    className={inputClass}
                    disabled={loadingOptions}
                  >
                    <option value="">Nenhum</option>
                    {layouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Etiqueta Interna Produção</label>
                  <select
                    value={form.layoutInternaId}
                    onChange={(e) =>
                      handleChange('layoutInternaId', e.target.value)
                    }
                    className={inputClass}
                    disabled={loadingOptions}
                  >
                    <option value="">Nenhum</option>
                    {layouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Etiqueta de Recebimento</label>
                  <select
                    value={form.layoutRecebimentoId}
                    onChange={(e) =>
                      handleChange('layoutRecebimentoId', e.target.value)
                    }
                    className={inputClass}
                    disabled={loadingOptions}
                  >
                    <option value="">Nenhum</option>
                    {layouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Etiqueta de Expedição</label>
                  <select
                    value={form.layoutExpedicaoId}
                    onChange={(e) =>
                      handleChange('layoutExpedicaoId', e.target.value)
                    }
                    className={inputClass}
                    disabled={loadingOptions}
                  >
                    <option value="">Nenhum</option>
                    {layouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-[#131b2f]/50 p-5 rounded-2xl border border-gray-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Printer size={16} className="text-blue-400" />
              Impressão Local (Zebra / Elgin / QZ Tray)
            </h3>

            <label className="flex items-center gap-3 cursor-pointer group w-max">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={form.usarImpressoraPadrao}
                  onChange={(e) =>
                    handleChange('usarImpressoraPadrao', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                Usar Impressora Padrão do Windows
              </span>
            </label>

            {!form.usarImpressoraPadrao && (
              <div
                ref={impressoraComboRef}
                className="mt-4 pt-4 border-t border-gray-800 space-y-2"
              >
                <label className={labelClass}>Nome da Impressora *</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      role="combobox"
                      aria-expanded={impressoraComboAberto}
                      aria-autocomplete="list"
                      value={form.nomeImpressora}
                      onChange={(e) => {
                        handleChange('nomeImpressora', e.target.value);
                        if (impressorasDisponiveis.length > 0) {
                          setImpressoraComboAberto(true);
                        }
                      }}
                      onFocus={() => {
                        if (impressorasDisponiveis.length > 0) {
                          setImpressoraComboAberto(true);
                        }
                      }}
                      placeholder="Busque ou digite o nome exato (Windows)"
                      className={inputClass}
                      autoComplete="off"
                    />
                    {impressoraComboAberto &&
                      impressorasDisponiveis.length > 0 && (
                        <ul
                          role="listbox"
                          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-xl border border-gray-700 bg-[#0b1324] py-1 shadow-xl"
                        >
                          {impressorasFiltradas.map((nome) => (
                            <li key={nome}>
                              <button
                                type="button"
                                role="option"
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-violet-600/20 hover:text-white transition-colors"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  handleChange('nomeImpressora', nome);
                                  setImpressoraComboAberto(false);
                                }}
                              >
                                {nome}
                              </button>
                            </li>
                          ))}
                          {impressorasFiltradas.length === 0 && (
                            <li className="px-4 py-3 text-xs text-gray-500">
                              Nenhuma correspondência na lista — continue
                              digitando o nome exato da sua impressora.
                            </li>
                          )}
                        </ul>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleBuscarImpressoras()}
                    disabled={buscandoImpressoras}
                    title="Buscar impressoras (simulação QZ Tray)"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-blue-200 hover:bg-blue-500/20 disabled:opacity-50 disabled:pointer-events-none transition-colors sm:min-h-[46px]"
                  >
                    {buscandoImpressoras ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                    <span className="hidden sm:inline">
                      {buscandoImpressoras ? 'Buscando…' : 'Buscar impressoras'}
                    </span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Use &quot;Buscar impressoras&quot; para carregar sugestões
                  (mock). Você pode escolher na lista ou digitar livremente o
                  nome exato como no Windows. Com QZ Tray, esta lista virá das
                  impressoras reais instaladas.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea
              value={form.observacao}
              onChange={(e) => handleChange('observacao', e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Notas internas..."
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#131b2f]/30 rounded-xl border border-gray-800">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="ativo"
                checked={form.ativo}
                onChange={(e) => handleChange('ativo', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </div>
            <label htmlFor="ativo" className="text-sm font-medium text-gray-300 cursor-pointer">
              Estação ativa (permite login e operações)
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-[#08101f] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-transparent border border-gray-600 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {loading ? 'Salvando...' : 'Salvar Estação'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstacaoTrabalhoFormModal;
