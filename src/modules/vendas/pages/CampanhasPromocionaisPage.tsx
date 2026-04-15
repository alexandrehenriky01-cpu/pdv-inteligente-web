import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  Sparkles,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Search,
  Check,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';

type TipoRegraPromocao =
  | 'DESCONTO_SIMPLES'
  | 'LEVE_X_PAGUE_Y'
  | 'DESCONTO_VOLUME'
  | 'KIT_COMBO';

interface CampanhaLista {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
  prioridade: number;
  exigeIdentificacao: boolean;
  _count: { regras: number };
}

interface ProdutoVinculo {
  id: string;
  produtoId: string;
  produto: { id: string; codigo: string; nome: string };
}

interface RegraDetalhe {
  id: string;
  tipo: TipoRegraPromocao;
  parametros: Record<string, unknown>;
  produtos: ProdutoVinculo[];
}

interface CampanhaDetalhe extends CampanhaLista {
  descricao: string | null;
  regras: RegraDetalhe[];
}

interface ProdutoBusca {
  id: string;
  nome: string;
  codigo: string;
}

const LABEL_TIPO: Record<TipoRegraPromocao, string> = {
  DESCONTO_SIMPLES: 'Desconto simples',
  LEVE_X_PAGUE_Y: 'Leve X, pague Y',
  DESCONTO_VOLUME: 'Desconto por volume',
  KIT_COMBO: 'Kit / combo',
};

function fmtData(iso: string): string {
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function defaultParametros(t: TipoRegraPromocao): Record<string, unknown> {
  switch (t) {
    case 'DESCONTO_SIMPLES':
      return { percentualDesconto: 10 };
    case 'LEVE_X_PAGUE_Y':
      return { leve: 3, pague: 2 };
    case 'DESCONTO_VOLUME':
      return { quantidadeMinima: 10, percentualDesconto: 5 };
    case 'KIT_COMBO':
      return { precoFixoKit: 49.9, quantidadesPorKit: {} };
    default:
      return {};
  }
}

function ParametrosEditor({
  tipo,
  value,
  onChange,
}: {
  tipo: TipoRegraPromocao;
  value: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const n = (k: string) => (value[k] !== undefined ? String(value[k]) : '');
  const set = (k: string, v: string) => {
    const num = parseFloat(v.replace(',', '.'));
    onChange({ ...value, [k]: v === '' ? undefined : Number.isFinite(num) ? num : v });
  };
  const setInt = (k: string, v: string) => {
    const i = parseInt(v, 10);
    onChange({ ...value, [k]: v === '' ? undefined : Number.isFinite(i) ? i : v });
  };

  switch (tipo) {
    case 'DESCONTO_SIMPLES':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            % desconto (alternativa ao fixo por unidade)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              type="number"
              value={n('percentualDesconto')}
              onChange={(e) => set('percentualDesconto', e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            R$ desconto fixo por unidade
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              type="number"
              step="0.01"
              value={n('valorDescontoFixoPorUnidade')}
              onChange={(e) => set('valorDescontoFixoPorUnidade', e.target.value)}
            />
          </label>
        </div>
      );
    case 'LEVE_X_PAGUE_Y':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Leve (X)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              type="number"
              min={1}
              value={n('leve')}
              onChange={(e) => setInt('leve', e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            Pague (Y)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              type="number"
              min={1}
              value={n('pague')}
              onChange={(e) => setInt('pague', e.target.value)}
            />
          </label>
        </div>
      );
    case 'DESCONTO_VOLUME':
      return (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Qtd. mínima (soma dos produtos vinculados)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              type="number"
              min={1}
              value={n('quantidadeMinima')}
              onChange={(e) => setInt('quantidadeMinima', e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            % desconto
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              type="number"
              value={n('percentualDesconto')}
              onChange={(e) => set('percentualDesconto', e.target.value)}
            />
          </label>
        </div>
      );
    case 'KIT_COMBO':
      return (
        <div className="space-y-2">
          <label className="text-xs text-slate-400">
            Preço fixo do kit (R$)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              type="number"
              step="0.01"
              value={n('precoFixoKit')}
              onChange={(e) => set('precoFixoKit', e.target.value)}
            />
          </label>
          <p className="text-[11px] text-slate-500">
            Opcional: JSON de quantidades por produto no kit, ex.{' '}
            <code className="text-violet-400">{`{"uuid-produto": 2}`}</code> — uma unidade
            por produto se vazio.
          </p>
          <textarea
            className="w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-xs font-mono focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
            rows={3}
            placeholder='{"produto-id": 1}'
            value={
              typeof value.quantidadesPorKit === 'object' && value.quantidadesPorKit !== null
                ? JSON.stringify(value.quantidadesPorKit, null, 2)
                : '{}'
            }
            onChange={(e) => {
              const t = e.target.value.trim();
              if (!t) {
                onChange({ ...value, quantidadesPorKit: {} });
                return;
              }
              try {
                const parsed = JSON.parse(t) as Record<string, unknown>;
                onChange({ ...value, quantidadesPorKit: parsed });
              } catch {
                /* mantém digitação */
              }
            }}
          />
        </div>
      );
    default:
      return null;
  }
}

export function CampanhasPromocionaisPage() {
  const [lista, setLista] = useState<CampanhaLista[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [selecionada, setSelecionada] = useState<CampanhaDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [modalCampanha, setModalCampanha] = useState(false);
  const [formCamp, setFormCamp] = useState({
    nome: '',
    descricao: '',
    dataInicio: '',
    dataFim: '',
    prioridade: 1,
    ativa: true,
    exigeIdentificacao: false,
  });
  const [salvandoCamp, setSalvandoCamp] = useState(false);

  const [editCamp, setEditCamp] = useState(false);

  const [modalRegra, setModalRegra] = useState(false);
  const [regraEditando, setRegraEditando] = useState<RegraDetalhe | null>(null);
  const [tipoRegra, setTipoRegra] = useState<TipoRegraPromocao>('DESCONTO_SIMPLES');
  const [paramRegra, setParamRegra] = useState<Record<string, unknown>>({});
  const [prodIdsRegra, setProdIdsRegra] = useState<string[]>([]);
  const [buscaProd, setBuscaProd] = useState('');
  const [hitsProd, setHitsProd] = useState<ProdutoBusca[]>([]);
  const [salvandoRegra, setSalvandoRegra] = useState(false);

  const carregarLista = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const { data } = await api.get<{ sucesso: boolean; dados?: CampanhaLista[]; erro?: string }>(
        '/api/campanhas-promocionais'
      );
      if (!data.sucesso || !data.dados) throw new Error(data.erro || 'Falha ao listar.');
      setLista(data.dados);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro.'));
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  const carregarDetalhe = useCallback(async (id: string) => {
    setCarregandoDetalhe(true);
    try {
      const { data } = await api.get<{ sucesso: boolean; dados?: CampanhaDetalhe; erro?: string }>(
        `/api/campanhas-promocionais/${id}`
      );
      if (!data.sucesso || !data.dados) throw new Error(data.erro || 'Falha ao carregar.');
      setSelecionada(data.dados);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro.'));
    } finally {
      setCarregandoDetalhe(false);
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useEffect(() => {
    if (modalCampanha) {
      setFormCamp({
        nome: '',
        descricao: '',
        dataInicio: '',
        dataFim: '',
        prioridade: 1,
        ativa: true,
        exigeIdentificacao: false,
      });
    }
  }, [modalCampanha]);

  useEffect(() => {
    if (buscaProd.trim().length < 2) {
      setHitsProd([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get<ProdutoBusca[]>(
          `/api/cadastros/produtos?busca=${encodeURIComponent(buscaProd.trim())}`
        );
        setHitsProd(Array.isArray(data) ? data.slice(0, 20) : []);
      } catch {
        setHitsProd([]);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [buscaProd]);

  const tiposOrdenados = useMemo(
    () =>
      (Object.keys(LABEL_TIPO) as TipoRegraPromocao[]).sort((a, b) =>
        LABEL_TIPO[a].localeCompare(LABEL_TIPO[b], 'pt-BR')
      ),
    []
  );

  const abrirNovaRegra = () => {
    if (!selecionada) return;
    setRegraEditando(null);
    setTipoRegra('DESCONTO_SIMPLES');
    setParamRegra(defaultParametros('DESCONTO_SIMPLES'));
    setProdIdsRegra([]);
    setBuscaProd('');
    setHitsProd([]);
    setModalRegra(true);
  };

  const abrirEditarRegra = (r: RegraDetalhe) => {
    setRegraEditando(r);
    setTipoRegra(r.tipo);
    const p =
      r.parametros && typeof r.parametros === 'object' && !Array.isArray(r.parametros)
        ? { ...(r.parametros as Record<string, unknown>) }
        : {};
    setParamRegra(p);
    setProdIdsRegra(r.produtos.map((x) => x.produtoId));
    setModalRegra(true);
  };

  useEffect(() => {
    if (modalRegra && !regraEditando) {
      setParamRegra(defaultParametros(tipoRegra));
    }
  }, [tipoRegra, modalRegra, regraEditando]);

  const salvarCampanhaNova = async (e: FormEvent) => {
    e.preventDefault();
    if (!formCamp.nome.trim() || !formCamp.dataInicio || !formCamp.dataFim) {
      toast.warn('Preencha nome e vigência.');
      return;
    }
    setSalvandoCamp(true);
    try {
      const { data } = await api.post<{ sucesso: boolean; dados?: { id: string }; erro?: string }>(
        '/api/campanhas-promocionais',
        {
          nome: formCamp.nome.trim(),
          descricao: formCamp.descricao.trim() || null,
          dataInicio: `${formCamp.dataInicio}T00:00:00`,
          dataFim: `${formCamp.dataFim}T23:59:59`,
          prioridade: formCamp.prioridade,
          ativa: formCamp.ativa,
          exigeIdentificacao: formCamp.exigeIdentificacao,
        }
      );
      if (!data.sucesso || !data.dados) throw new Error(data.erro || 'Falha.');
      toast.success('Campanha criada.');
      setModalCampanha(false);
      setFormCamp({
        nome: '',
        descricao: '',
        dataInicio: '',
        dataFim: '',
        prioridade: 1,
        ativa: true,
        exigeIdentificacao: false,
      });
      await carregarLista();
      await carregarDetalhe(data.dados.id);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro.'));
    } finally {
      setSalvandoCamp(false);
    }
  };

  const salvarCampanhaEdicao = async (e: FormEvent) => {
    e.preventDefault();
    if (!selecionada) return;
    setSalvandoCamp(true);
    try {
      const { data } = await api.put<{ sucesso: boolean; erro?: string }>(
        `/api/campanhas-promocionais/${selecionada.id}`,
        {
          nome: formCamp.nome.trim(),
          descricao: formCamp.descricao.trim() || null,
          dataInicio: `${formCamp.dataInicio}T00:00:00`,
          dataFim: `${formCamp.dataFim}T23:59:59`,
          prioridade: formCamp.prioridade,
          ativa: formCamp.ativa,
          exigeIdentificacao: formCamp.exigeIdentificacao,
        }
      );
      if (!data.sucesso) throw new Error(data.erro || 'Falha.');
      toast.success('Campanha atualizada.');
      setEditCamp(false);
      await carregarLista();
      await carregarDetalhe(selecionada.id);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro.'));
    } finally {
      setSalvandoCamp(false);
    }
  };

  useEffect(() => {
    if (selecionada && editCamp) {
      setFormCamp({
        nome: selecionada.nome,
        descricao: selecionada.descricao ?? '',
        dataInicio: selecionada.dataInicio.slice(0, 10),
        dataFim: selecionada.dataFim.slice(0, 10),
        prioridade: selecionada.prioridade,
        ativa: selecionada.ativa,
        exigeIdentificacao: selecionada.exigeIdentificacao,
      });
    }
  }, [selecionada, editCamp]);

  const excluirCampanha = async () => {
    if (!selecionada) return;
    if (!window.confirm(`Excluir campanha "${selecionada.nome}" e todas as regras?`)) return;
    try {
      const { data } = await api.delete<{ sucesso: boolean; erro?: string }>(
        `/api/campanhas-promocionais/${selecionada.id}`
      );
      if (!data.sucesso) throw new Error(data.erro || 'Falha.');
      toast.success('Campanha removida.');
      setSelecionada(null);
      await carregarLista();
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro.'));
    }
  };

  const salvarRegra = async (e: FormEvent) => {
    e.preventDefault();
    if (!selecionada) return;
    if (prodIdsRegra.length === 0) {
      toast.warn('Vincule ao menos um produto à regra.');
      return;
    }
    setSalvandoRegra(true);
    try {
      if (regraEditando) {
        const { data } = await api.put<{ sucesso: boolean; erro?: string }>(
          `/api/campanhas-promocionais/${selecionada.id}/regras/${regraEditando.id}`,
          {
            tipo: tipoRegra,
            parametros: paramRegra,
            produtoIds: prodIdsRegra,
          }
        );
        if (!data.sucesso) throw new Error(data.erro || 'Falha.');
        toast.success('Regra atualizada.');
      } else {
        const { data } = await api.post<{ sucesso: boolean; erro?: string }>(
          `/api/campanhas-promocionais/${selecionada.id}/regras`,
          {
            tipo: tipoRegra,
            parametros: paramRegra,
            produtoIds: prodIdsRegra,
          }
        );
        if (!data.sucesso) throw new Error(data.erro || 'Falha.');
        toast.success('Regra criada.');
      }
      setModalRegra(false);
      await carregarDetalhe(selecionada.id);
      await carregarLista();
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro.'));
    } finally {
      setSalvandoRegra(false);
    }
  };

  const excluirRegra = async (r: RegraDetalhe) => {
    if (!selecionada) return;
    if (!window.confirm('Remover esta regra?')) return;
    try {
      const { data } = await api.delete<{ sucesso: boolean; erro?: string }>(
        `/api/campanhas-promocionais/${selecionada.id}/regras/${r.id}`
      );
      if (!data.sucesso) throw new Error(data.erro || 'Falha.');
      toast.success('Regra removida.');
      await carregarDetalhe(selecionada.id);
      await carregarLista();
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro.'));
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 bg-[#060816] min-h-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-300 border border-white/10">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Campanhas e promoções</h1>
              <p className="text-sm text-slate-400">
                Motor comercial: kits, volume, leve-pague e descontos — aplicados no PDV em tempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalCampanha(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova campanha
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 font-medium text-white">Campanhas</div>
            {carregandoLista ? (
              <div className="flex justify-center py-16 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : lista.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">Nenhuma campanha.</p>
            ) : (
              <ul className="p-4 space-y-2 max-h-[560px] overflow-y-auto">
                {lista.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => void carregarDetalhe(c.id)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all bg-[#0b1324]/70 border-white/10 hover:bg-white/5 ${
                        selecionada?.id === c.id ? 'ring-2 ring-fuchsia-500/40 border-fuchsia-500/30' : ''
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-white">{c.nome}</span>
                        <span className="text-xs text-slate-400">Prio {c.prioridade}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{fmtData(c.dataInicio)} — {fmtData(c.dataFim)}</span>
                        <span
                          className={
                            c.ativa
                              ? 'px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'text-slate-500'
                          }
                        >
                          {c.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                        {c.exigeIdentificacao && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Exige cliente
                          </span>
                        )}
                        <span>{c._count.regras} regras</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] min-h-[320px] overflow-hidden">
            {!selecionada ? (
              <div className="p-8 text-center text-slate-400 text-sm">Selecione uma campanha.</div>
            ) : carregandoDetalhe ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-white/10 flex flex-wrap justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-white">{selecionada.nome}</h2>
                    <p className="text-xs text-slate-400">{fmtData(selecionada.dataInicio)} → {fmtData(selecionada.dataFim)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCamp((v) => !v)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {editCamp ? 'Fechar' : 'Editar'}
                    </button>
                    <button
                      type="button"
                      onClick={abrirNovaRegra}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.35)] hover:scale-[1.02] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Regra
                    </button>
                    <button
                      type="button"
                      onClick={excluirCampanha}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>

                {editCamp && (
                  <form
                    onSubmit={salvarCampanhaEdicao}
                    className="p-4 border-b border-white/10 space-y-2 bg-[#0b1324]/50"
                  >
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                      value={formCamp.nome}
                      onChange={(e) => setFormCamp((f) => ({ ...f, nome: e.target.value }))}
                    />
                    <textarea
                      className="w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                      rows={2}
                      placeholder="Descrição"
                      value={formCamp.descricao}
                      onChange={(e) => setFormCamp((f) => ({ ...f, descricao: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        className="rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                        value={formCamp.dataInicio}
                        onChange={(e) => setFormCamp((f) => ({ ...f, dataInicio: e.target.value }))}
                      />
                      <input
                        type="date"
                        className="rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1.5 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                        value={formCamp.dataFim}
                        onChange={(e) => setFormCamp((f) => ({ ...f, dataFim: e.target.value }))}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="number"
                        className="w-20 rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                        value={formCamp.prioridade}
                        onChange={(e) =>
                          setFormCamp((f) => ({ ...f, prioridade: parseInt(e.target.value, 10) || 0 }))
                        }
                      />
                      Prioridade (maior = vence conflito)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={formCamp.ativa}
                        onChange={(e) => setFormCamp((f) => ({ ...f, ativa: e.target.checked }))}
                      />
                      Ativa
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={formCamp.exigeIdentificacao}
                        onChange={(e) =>
                          setFormCamp((f) => ({ ...f, exigeIdentificacao: e.target.checked }))
                        }
                      />
                      Exige cliente identificado (CPF/clube)
                    </label>
                    <button
                      type="submit"
                      disabled={salvandoCamp}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {salvandoCamp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar campanha
                    </button>
                  </form>
                )}

                {selecionada.descricao && !editCamp && (
                  <p className="px-4 py-2 text-sm text-slate-300 border-b border-white/10">
                    {selecionada.descricao}
                  </p>
                )}

                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                  {selecionada.regras.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma regra. Use &quot;Regra&quot; para adicionar.</p>
                  ) : (
                    selecionada.regras.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-white/10 bg-[#0b1324]/70 p-3 text-sm space-y-2 hover:bg-white/5 transition-all"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-white">
                            {LABEL_TIPO[r.tipo]}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => abrirEditarRegra(r)}
                              className="p-1 rounded-xl text-violet-400 hover:bg-violet-500/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void excluirRegra(r)}
                              className="p-1 rounded-xl text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <pre className="text-xs bg-[#060816] text-slate-300 border border-white/10 p-2 rounded-xl overflow-x-auto">
                          {JSON.stringify(r.parametros, null, 2)}
                        </pre>
                        <p className="text-xs text-slate-500">
                          Produtos:{' '}
                          {r.produtos.map((p) => `${p.produto.codigo} (${p.produto.nome})`).join(' · ') ||
                            '—'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modalCampanha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] bg-[#08101f]/90 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Nova campanha</h3>
              <button type="button" onClick={() => setModalCampanha(false)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={salvarCampanhaNova} className="space-y-2">
              <input
                required
                className="w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                placeholder="Nome"
                value={formCamp.nome}
                onChange={(e) => setFormCamp((f) => ({ ...f, nome: e.target.value }))}
              />
              <textarea
                className="w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                placeholder="Descrição (opcional)"
                rows={2}
                value={formCamp.descricao}
                onChange={(e) => setFormCamp((f) => ({ ...f, descricao: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="date"
                  className="rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-2 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={formCamp.dataInicio}
                  onChange={(e) => setFormCamp((f) => ({ ...f, dataInicio: e.target.value }))}
                />
                <input
                  required
                  type="date"
                  className="rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-2 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={formCamp.dataFim}
                  onChange={(e) => setFormCamp((f) => ({ ...f, dataFim: e.target.value }))}
                />
              </div>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                placeholder="Prioridade"
                value={formCamp.prioridade}
                onChange={(e) =>
                  setFormCamp((f) => ({ ...f, prioridade: parseInt(e.target.value, 10) || 0 }))
                }
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={formCamp.ativa}
                  onChange={(e) => setFormCamp((f) => ({ ...f, ativa: e.target.checked }))}
                />
                Ativa
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={formCamp.exigeIdentificacao}
                  onChange={(e) =>
                    setFormCamp((f) => ({ ...f, exigeIdentificacao: e.target.checked }))
                  }
                />
                Exige cliente identificado
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalCampanha(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoCamp}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 inline-flex items-center gap-2"
                >
                  {salvandoCamp && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRegra && selecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-[30px] bg-[#08101f]/90 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6 space-y-3 my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{regraEditando ? 'Editar regra' : 'Nova regra'}</h3>
              <button type="button" onClick={() => setModalRegra(false)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={salvarRegra} className="space-y-3">
              <label className="block text-xs font-medium text-slate-400">
                Tipo
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={tipoRegra}
                  onChange={(e) => setTipoRegra(e.target.value as TipoRegraPromocao)}
                  disabled={!!regraEditando}
                >
                  {tiposOrdenados.map((t) => (
                    <option key={t} value={t}>
                      {LABEL_TIPO[t]}
                    </option>
                  ))}
                </select>
              </label>
              <ParametrosEditor tipo={tipoRegra} value={paramRegra} onChange={setParamRegra} />
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Produtos vinculados</p>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#0b1324] text-white text-sm placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                    placeholder="Buscar…"
                    value={buscaProd}
                    onChange={(e) => setBuscaProd(e.target.value)}
                  />
                </div>
                {hitsProd.length > 0 && (
                  <ul className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-white/10 bg-[#060816] text-sm text-white">
                    {hitsProd.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200"
                          onClick={() => {
                            if (!prodIdsRegra.includes(p.id)) {
                              setProdIdsRegra((prev) => [...prev, p.id]);
                            }
                            setBuscaProd('');
                            setHitsProd([]);
                          }}
                        >
                          {p.codigo} — {p.nome}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {prodIdsRegra.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs"
                    >
                      {id.slice(0, 8)}…
                      <button
                        type="button"
                        onClick={() => setProdIdsRegra((prev) => prev.filter((x) => x !== id))}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalRegra(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoRegra}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 inline-flex items-center gap-2"
                >
                  {salvandoRegra && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
