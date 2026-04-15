import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import { AxiosError } from 'axios';

/** Linha retornada pela API (campos canônicos + aliases legados). */
export interface INaturezaOperacaoApi {
  id: string;
  codigoCfop: string;
  descricaoInterna: string;
  tipoOperacao: 'ENTRADA' | 'SAIDA';
  aplicacao?: string | null;
  controlaEstoque: boolean;
  controlaFinanceiro: boolean;
  controlaContabilidade: boolean;
  controlaLivroFiscal: boolean;
  exigeProcessoCompras: boolean;
  somaFaturamento: boolean;
  operacaoDevolucao: boolean;
  calculaTributos: boolean;
  cfopInverso?: string | null;
  contaContabil?: string | null;
  cstIcmsPadrao?: string | null;
  aliquotaIcmsPadrao?: number | null;
  percRedBcIcmsPadrao?: number | null;
  cstCsosnPadrao?: string | null;
  cstPisPadrao?: string | null;
  aliquotaPisPadrao?: number | null;
  cstCofinsPadrao?: string | null;
  aliquotaCofinsPadrao?: number | null;
  cstIpiPadrao?: string | null;
  aliquotaIpiPadrao?: number | null;
  ipiEnquadramento?: string | null;
  tributacaoIcms?: unknown;
  tributacaoPisCofins?: unknown;
  tributacaoIpi?: unknown;
  cstIbsCbsPadrao?: string | null;
  aliquotaIbsPadrao?: number | null;
  aliquotaCbsPadrao?: number | null;
  aliquotaIsPadrao?: number | null;
  codigo?: string;
  descricao?: string;
  movimentaEstoque?: boolean;
  geraFinanceiro?: boolean;
}

type TabId = 'identificacao' | 'icms' | 'pis' | 'ipi';

function extrairLista(res: { data: unknown }): INaturezaOperacaoApi[] {
  const raw = res.data as { sucesso?: boolean; dados?: INaturezaOperacaoApi[] } | INaturezaOperacaoApi[];
  if (Array.isArray(raw)) return raw;
  return raw?.dados ?? [];
}

function jsonToText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return '';
  }
}

function parseJsonOpcional(raw: string): unknown | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  return JSON.parse(t) as unknown;
}

function formatFloat(val: string | number | boolean | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || typeof val === 'boolean') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const n = parseFloat(String(val).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function estadoInicialForm(): Record<string, string | boolean | number | ''> {
  return {
    codigoCfop: '',
    descricaoInterna: '',
    tipoOperacao: 'ENTRADA',
    aplicacao: '',
    cfopInverso: '',
    contaContabil: '',
    controlaEstoque: true,
    controlaFinanceiro: true,
    controlaContabilidade: true,
    controlaLivroFiscal: true,
    exigeProcessoCompras: false,
    somaFaturamento: true,
    operacaoDevolucao: false,
    calculaTributos: true,
    cstIcmsPadrao: '',
    cstCsosnPadrao: '',
    aliquotaIcmsPadrao: '',
    percRedBcIcmsPadrao: '',
    cstPisPadrao: '',
    aliquotaPisPadrao: '',
    cstCofinsPadrao: '',
    aliquotaCofinsPadrao: '',
    cstIpiPadrao: '',
    aliquotaIpiPadrao: '',
    ipiEnquadramento: '',
    cstIbsCbsPadrao: '',
    aliquotaIbsPadrao: '',
    aliquotaCbsPadrao: '',
    aliquotaIsPadrao: '',
    tributacaoIcmsJson: '',
    tributacaoPisCofinsJson: '',
    tributacaoIpiJson: '',
  };
}

function rowParaForm(n: INaturezaOperacaoApi): Record<string, string | boolean | number | ''> {
  const cod = n.codigoCfop ?? n.codigo ?? '';
  const desc = n.descricaoInterna ?? n.descricao ?? '';
  return {
    codigoCfop: cod,
    descricaoInterna: desc,
    tipoOperacao: n.tipoOperacao,
    aplicacao: n.aplicacao ?? '',
    cfopInverso: n.cfopInverso ?? '',
    contaContabil: n.contaContabil ?? '',
    controlaEstoque: n.controlaEstoque ?? n.movimentaEstoque ?? true,
    controlaFinanceiro: n.controlaFinanceiro ?? n.geraFinanceiro ?? true,
    controlaContabilidade: n.controlaContabilidade ?? true,
    controlaLivroFiscal: n.controlaLivroFiscal ?? true,
    exigeProcessoCompras: n.exigeProcessoCompras ?? false,
    somaFaturamento: n.somaFaturamento ?? true,
    operacaoDevolucao: n.operacaoDevolucao ?? false,
    calculaTributos: n.calculaTributos ?? true,
    cstIcmsPadrao: n.cstIcmsPadrao ?? '',
    cstCsosnPadrao: n.cstCsosnPadrao ?? '',
    aliquotaIcmsPadrao: n.aliquotaIcmsPadrao ?? '',
    percRedBcIcmsPadrao: n.percRedBcIcmsPadrao ?? '',
    cstPisPadrao: n.cstPisPadrao ?? '',
    aliquotaPisPadrao: n.aliquotaPisPadrao ?? '',
    cstCofinsPadrao: n.cstCofinsPadrao ?? '',
    aliquotaCofinsPadrao: n.aliquotaCofinsPadrao ?? '',
    cstIpiPadrao: n.cstIpiPadrao ?? '',
    aliquotaIpiPadrao: n.aliquotaIpiPadrao ?? '',
    ipiEnquadramento: n.ipiEnquadramento ?? '',
    cstIbsCbsPadrao: n.cstIbsCbsPadrao ?? '',
    aliquotaIbsPadrao: n.aliquotaIbsPadrao ?? '',
    aliquotaCbsPadrao: n.aliquotaCbsPadrao ?? '',
    aliquotaIsPadrao: n.aliquotaIsPadrao ?? '',
    tributacaoIcmsJson: jsonToText(n.tributacaoIcms),
    tributacaoPisCofinsJson: jsonToText(n.tributacaoPisCofins),
    tributacaoIpiJson: jsonToText(n.tributacaoIpi),
  };
}

export function CadastroCfop() {
  const [lista, setLista] = useState<INaturezaOperacaoApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [aba, setAba] = useState<TabId>('identificacao');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filtroQ, setFiltroQ] = useState('');
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroDesc, setFiltroDesc] = useState('');

  const [form, setForm] = useState(() => estadoInicialForm());

  const setCampo = useCallback((campo: string, valor: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const carregarLista = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filtroQ.trim()) params.q = filtroQ.trim();
      if (filtroCodigo.trim()) params.codigoCfop = filtroCodigo.trim();
      if (filtroDesc.trim()) params.descricaoInterna = filtroDesc.trim();
      const response = await api.get('/api/cfops', { params });
      setLista(extrairLista(response));
    } catch (error) {
      console.error('Erro ao carregar naturezas de operação', error);
      setLista([]);
    }
  }, [filtroQ, filtroCodigo, filtroDesc]);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  const limparForm = () => {
    setForm(estadoInicialForm());
    setEditingId(null);
    setFormError(null);
    setAba('identificacao');
  };

  const montarPayload = () => {
    let tributacaoIcms: unknown | undefined;
    let tributacaoPisCofins: unknown | undefined;
    let tributacaoIpi: unknown | undefined;
    try {
      tributacaoIcms = parseJsonOpcional(String(form.tributacaoIcmsJson ?? ''));
    } catch {
      throw new Error('JSON inválido na aba ICMS (tributação avançada).');
    }
    try {
      tributacaoPisCofins = parseJsonOpcional(String(form.tributacaoPisCofinsJson ?? ''));
    } catch {
      throw new Error('JSON inválido na aba PIS/COFINS (tributação avançada).');
    }
    try {
      tributacaoIpi = parseJsonOpcional(String(form.tributacaoIpiJson ?? ''));
    } catch {
      throw new Error('JSON inválido na aba IPI (tributação avançada).');
    }

    const aplicacaoStr = String(form.aplicacao ?? '').trim();

    return {
      codigoCfop: String(form.codigoCfop ?? '').trim(),
      descricaoInterna: String(form.descricaoInterna ?? '').trim(),
      tipoOperacao: form.tipoOperacao as 'ENTRADA' | 'SAIDA',
      aplicacao: aplicacaoStr.length ? aplicacaoStr : null,
      controlaEstoque: Boolean(form.controlaEstoque),
      controlaFinanceiro: Boolean(form.controlaFinanceiro),
      controlaContabilidade: Boolean(form.controlaContabilidade),
      controlaLivroFiscal: Boolean(form.controlaLivroFiscal),
      exigeProcessoCompras: Boolean(form.exigeProcessoCompras),
      somaFaturamento: Boolean(form.somaFaturamento),
      operacaoDevolucao: Boolean(form.operacaoDevolucao),
      calculaTributos: Boolean(form.calculaTributos),
      cfopInverso: String(form.cfopInverso ?? '').trim() || null,
      contaContabil: String(form.contaContabil ?? '').trim() || null,
      cstIcmsPadrao: String(form.cstIcmsPadrao ?? '').trim() || null,
      aliquotaIcmsPadrao: formatFloat(form.aliquotaIcmsPadrao),
      percRedBcIcmsPadrao: formatFloat(form.percRedBcIcmsPadrao),
      cstCsosnPadrao: String(form.cstCsosnPadrao ?? '').trim() || null,
      cstPisPadrao: String(form.cstPisPadrao ?? '').trim() || null,
      aliquotaPisPadrao: formatFloat(form.aliquotaPisPadrao),
      cstCofinsPadrao: String(form.cstCofinsPadrao ?? '').trim() || null,
      aliquotaCofinsPadrao: formatFloat(form.aliquotaCofinsPadrao),
      cstIpiPadrao: String(form.cstIpiPadrao ?? '').trim() || null,
      aliquotaIpiPadrao: formatFloat(form.aliquotaIpiPadrao),
      ipiEnquadramento: String(form.ipiEnquadramento ?? '').trim() || null,
      tributacaoIcms,
      tributacaoPisCofins,
      tributacaoIpi,
      cstIbsCbsPadrao: String(form.cstIbsCbsPadrao ?? '').trim() || null,
      aliquotaIbsPadrao: formatFloat(form.aliquotaIbsPadrao),
      aliquotaCbsPadrao: formatFloat(form.aliquotaCbsPadrao),
      aliquotaIsPadrao: formatFloat(form.aliquotaIsPadrao),
    };
  };

  const handleSalvar = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!String(form.codigoCfop ?? '').trim() || !String(form.descricaoInterna ?? '').trim()) {
      setFormError('Código CFOP e descrição interna são obrigatórios.');
      setAba('identificacao');
      return;
    }

    let payload: ReturnType<typeof montarPayload>;
    try {
      payload = montarPayload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Dados inválidos.');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/api/cfops/${editingId}`, payload);
      } else {
        await api.post('/api/cfops', payload);
      }
      await carregarLista();
      limparForm();
    } catch (err) {
      const ax = err as AxiosError<{ erro?: string; error?: string }>;
      const msg =
        ax.response?.data?.erro ||
        ax.response?.data?.error ||
        (err instanceof Error ? err.message : 'Erro ao salvar.');
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Excluir esta natureza de operação?')) return;
    try {
      await api.delete(`/api/cfops/${id}`);
      await carregarLista();
      if (editingId === id) limparForm();
    } catch (err) {
      const ax = err as AxiosError<{ erro?: string; error?: string }>;
      alert(ax.response?.data?.erro || ax.response?.data?.error || 'Erro ao excluir.');
    }
  };

  const inputClass =
    'w-full p-2.5 bg-[#0b1324] border border-white/10 text-white rounded-xl focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500 text-sm';
  const labelClass = 'block text-xs font-bold text-slate-400 uppercase tracking-[0.16em] mb-1.5';
  const tabBtn = (id: TabId, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setAba(id)}
      className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
        aba === id
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
          : 'bg-[#0b1324] text-slate-400 hover:text-white border border-white/10'
      }`}
    >
      {label}
    </button>
  );

  const toggleRow = (n: INaturezaOperacaoApi) => {
    setEditingId(n.id);
    setForm(rowParaForm(n));
    setFormError(null);
    setAba('identificacao');
  };

  const cfopDisplay = (n: INaturezaOperacaoApi) => n.codigoCfop ?? n.codigo ?? '—';
  const descDisplay = (n: INaturezaOperacaoApi) => n.descricaoInterna ?? n.descricao ?? '—';

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)]">
          <h1 className="text-3xl font-extrabold text-white">Natureza de operação / motor fiscal</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
            CFOP duplicável por descrição interna
          </div>
          <p className="mt-2 text-slate-400">
            Cadastre várias regras com o mesmo código CFOP (ex.: 5102) diferenciadas pela descrição interna e parâmetros
            de estoque, financeiro e tributação.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex h-fit flex-col rounded-[30px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <h2 className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3 text-lg font-bold text-violet-300">
                <span className="text-2xl">⚙️</span>
                {editingId ? 'Editar natureza de operação' : 'Nova natureza de operação'}
              </h2>

              <div className="mb-4 flex flex-wrap gap-2">
                {tabBtn('identificacao', '1 · Identificação')}
                {tabBtn('icms', '2 · ICMS')}
                {tabBtn('pis', '3 · PIS/COFINS')}
                {tabBtn('ipi', '4 · IPI')}
              </div>

              {formError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSalvar} className="flex flex-1 flex-col">
                <div className="min-h-[420px] space-y-4">
                  {aba === 'identificacao' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Código CFOP</label>
                          <input
                            required
                            type="text"
                            placeholder="Ex: 5102"
                            value={String(form.codigoCfop ?? '')}
                            onChange={(e) => setCampo('codigoCfop', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Tipo</label>
                          <select
                            value={String(form.tipoOperacao)}
                            onChange={(e) => setCampo('tipoOperacao', e.target.value)}
                            className={inputClass}
                          >
                            <option value="ENTRADA">Entrada</option>
                            <option value="SAIDA">Saída</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Descrição interna</label>
                        <input
                          required
                          type="text"
                          placeholder="Ex: Compra p/ comercialização — fora do estado"
                          value={String(form.descricaoInterna ?? '')}
                          onChange={(e) => setCampo('descricaoInterna', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className={labelClass}>Aplicação / finalidade (texto livre)</label>
                          <input
                            type="text"
                            placeholder="Ex: COMERCIALIZACAO"
                            value={String(form.aplicacao ?? '')}
                            onChange={(e) => setCampo('aplicacao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>CFOP inverso (devolução)</label>
                          <input
                            type="text"
                            value={String(form.cfopInverso ?? '')}
                            onChange={(e) => setCampo('cfopInverso', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Conta contábil (referência)</label>
                        <input
                          type="text"
                          value={String(form.contaContabil ?? '')}
                          onChange={(e) => setCampo('contaContabil', e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0b1324]/70 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          Controles internos
                        </p>
                        {(
                          [
                            ['controlaEstoque', 'Controla estoque físico'],
                            ['controlaFinanceiro', 'Controla financeiro (AP/AR)'],
                            ['controlaContabilidade', 'Controla contabilidade'],
                            ['controlaLivroFiscal', 'Controla livro fiscal'],
                            ['exigeProcessoCompras', 'Exige processo de compras'],
                            ['somaFaturamento', 'Soma faturamento bruto'],
                            ['operacaoDevolucao', 'Operação de devolução'],
                            ['calculaTributos', 'Calcular tributos na operação'],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(form[key])}
                              onChange={(e) => setCampo(key, e.target.checked)}
                              className="h-4 w-4 rounded border-white/20 bg-[#08101f] accent-violet-500"
                            />
                            <span className="text-sm text-slate-300">{label}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  {aba === 'icms' && (
                    <>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="col-span-2">
                          <label className={labelClass}>CST ICMS</label>
                          <input
                            type="text"
                            value={String(form.cstIcmsPadrao ?? '')}
                            onChange={(e) => setCampo('cstIcmsPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={labelClass}>CSOSN (Simples)</label>
                          <input
                            type="text"
                            value={String(form.cstCsosnPadrao ?? '')}
                            onChange={(e) => setCampo('cstCsosnPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={labelClass}>Alíquota ICMS (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(form.aliquotaIcmsPadrao ?? '')}
                            onChange={(e) => setCampo('aliquotaIcmsPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={labelClass}>% redução BC ICMS</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(form.percRedBcIcmsPadrao ?? '')}
                            onChange={(e) => setCampo('percRedBcIcmsPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/15 to-transparent p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-300">
                          Reforma tributária (IBS/CBS/IS)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className={labelClass}>CST IBS/CBS</label>
                            <input
                              type="text"
                              value={String(form.cstIbsCbsPadrao ?? '')}
                              onChange={(e) => setCampo('cstIbsCbsPadrao', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Alíq. IBS (%)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={String(form.aliquotaIbsPadrao ?? '')}
                              onChange={(e) => setCampo('aliquotaIbsPadrao', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Alíq. CBS (%)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={String(form.aliquotaCbsPadrao ?? '')}
                              onChange={(e) => setCampo('aliquotaCbsPadrao', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className={labelClass}>Alíq. IS (%)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={String(form.aliquotaIsPadrao ?? '')}
                              onChange={(e) => setCampo('aliquotaIsPadrao', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>JSON — tributação ICMS (avançado)</label>
                        <textarea
                          rows={5}
                          value={String(form.tributacaoIcmsJson ?? '')}
                          onChange={(e) => setCampo('tributacaoIcmsJson', e.target.value)}
                          placeholder='{"modBC":"3","pRedBC":"0"}'
                          className={`${inputClass} font-mono text-xs`}
                        />
                      </div>
                    </>
                  )}

                  {aba === 'pis' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>CST PIS</label>
                          <input
                            type="text"
                            value={String(form.cstPisPadrao ?? '')}
                            onChange={(e) => setCampo('cstPisPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Alíquota PIS (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(form.aliquotaPisPadrao ?? '')}
                            onChange={(e) => setCampo('aliquotaPisPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>CST COFINS</label>
                          <input
                            type="text"
                            value={String(form.cstCofinsPadrao ?? '')}
                            onChange={(e) => setCampo('cstCofinsPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Alíquota COFINS (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(form.aliquotaCofinsPadrao ?? '')}
                            onChange={(e) => setCampo('aliquotaCofinsPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>JSON — PIS/COFINS (avançado)</label>
                        <textarea
                          rows={5}
                          value={String(form.tributacaoPisCofinsJson ?? '')}
                          onChange={(e) => setCampo('tributacaoPisCofinsJson', e.target.value)}
                          className={`${inputClass} font-mono text-xs`}
                        />
                      </div>
                    </>
                  )}

                  {aba === 'ipi' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>CST IPI</label>
                          <input
                            type="text"
                            value={String(form.cstIpiPadrao ?? '')}
                            onChange={(e) => setCampo('cstIpiPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Alíquota IPI (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(form.aliquotaIpiPadrao ?? '')}
                            onChange={(e) => setCampo('aliquotaIpiPadrao', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={labelClass}>Enquadramento IPI</label>
                          <input
                            type="text"
                            value={String(form.ipiEnquadramento ?? '')}
                            onChange={(e) => setCampo('ipiEnquadramento', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>JSON — IPI (avançado)</label>
                        <textarea
                          rows={5}
                          value={String(form.tributacaoIpiJson ?? '')}
                          onChange={(e) => setCampo('tributacaoIpiJson', e.target.value)}
                          className={`${inputClass} font-mono text-xs`}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
                  {editingId && (
                    <button
                      type="button"
                      onClick={limparForm}
                      className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/5"
                    >
                      Cancelar edição
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:shadow-[0_0_25px_rgba(139,92,246,0.45)] disabled:opacity-70"
                  >
                    {loading ? 'Salvando…' : editingId ? 'Atualizar natureza' : 'Salvar natureza'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="border-b border-white/10 bg-[#0b1324] p-5">
                <h2 className="text-lg font-bold text-white">Naturezas cadastradas</h2>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="search"
                    placeholder="Busca geral (código ou descrição)"
                    value={filtroQ}
                    onChange={(e) => setFiltroQ(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar código CFOP"
                    value={filtroCodigo}
                    onChange={(e) => setFiltroCodigo(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar descrição interna"
                    value={filtroDesc}
                    onChange={(e) => setFiltroDesc(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#0b1324] text-xs uppercase text-slate-400">
                      <th className="p-4 font-bold tracking-wider">CFOP</th>
                      <th className="p-4 font-bold tracking-wider">Descrição interna</th>
                      <th className="p-4 text-center font-bold tracking-wider">Controles</th>
                      <th className="p-4 text-center font-bold tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {lista.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-500">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    ) : (
                      lista.map((n) => (
                        <tr
                          key={n.id}
                          className={`cursor-pointer transition-colors hover:bg-white/5 ${
                            editingId === n.id ? 'bg-violet-500/10' : ''
                          }`}
                          onClick={() => toggleRow(n)}
                        >
                          <td className="p-4">
                            <div className="text-lg font-black text-white">{cfopDisplay(n)}</div>
                            <span
                              className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                n.tipoOperacao === 'ENTRADA'
                                  ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                                  : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {n.tipoOperacao}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-300">{descDisplay(n)}</td>
                          <td className="p-4 text-center text-[10px] font-bold text-slate-400">
                            <div className="flex flex-col gap-1">
                              <span>{(n.controlaEstoque ?? n.movimentaEstoque) ? 'Est' : '—'}</span>
                              <span>{(n.controlaFinanceiro ?? n.geraFinanceiro) ? 'Fin' : '—'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleExcluir(n.id)}
                              className="rounded-lg p-2 text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
