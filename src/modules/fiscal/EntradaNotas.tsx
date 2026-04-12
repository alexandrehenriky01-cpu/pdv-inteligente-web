import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import {
  FileText,
  Upload,
  RefreshCcw,
  Download,
  Database,
  Loader2,
  FileX,
  PackageCheck,
  AlertCircle,
  Sparkles,
  Landmark,
  Link2,
  ScanBarcode,
  Minus,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import type { IPreviewXml, ICfop } from './ImportarNfe';

type RespostaEdicaoNfe = {
  sucesso?: boolean;
  dados: {
    preview: IPreviewXml;
    naturezaOperacaoPorLinha: string[];
    documentoFiscalEntradaId: string;
    pedidoCompraId: string | null;
    /** Plano de contas vinculado ao fato gerador contábil (se houver). */
    contaContabilId?: string | null;
  };
};

function criarNaturezaVaziaPorItens(itens: IPreviewXml['itens']): Record<number, string> {
  const r: Record<number, string> = {};
  itens.forEach((_, i) => {
    r[i] = '';
  });
  return r;
}
import { EntradaNotasRevisao, type IContaPlanoResumoNfe, type RevisaoAbaId } from './EntradaNotasRevisao';

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface IFornecedorNota {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpjCpf?: string;
}

export interface IPedidoCompraVinculoMonitor {
  id: string;
  status: string;
  dataPedido: string;
}

export interface IDocumentoEntradaMercadoriaMonitor {
  id: string;
  numero: string;
  tipoDocumento: string;
}

export interface INotaEntrada {
  id: string;
  dataEmissao: string;
  numero: string;
  serie: string;
  valorTotalDocumento: number;
  chaveAcesso: string;
  fornecedor?: IFornecedorNota;
  pedidoCompra?: IPedidoCompraVinculoMonitor | null;
  documentoEntradaMercadoria?: IDocumentoEntradaMercadoriaMonitor | null;
  statusEstoque?: boolean;
  statusContabil?: boolean;
  /** Persistido no documento fiscal após confirmar XML; define o chip de integração de estoque. */
  statusIntegracaoEstoque?: 'PENDENTE' | 'PROCESSADO' | 'NAO_APLICA';
}

function formatarIdCurto(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function formatarChaveVisual(chave: string): string {
  const d = String(chave ?? '').replace(/\D/g, '');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function parseDataEmissaoXml(valor: string | undefined): Date | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Suporta resposta direta ou envelope `{ dados }` (evolução da API). */
function extrairPreviewXml(data: unknown): IPreviewXml {
  if (data && typeof data === 'object' && 'dados' in data) {
    const d = (data as { dados: unknown }).dados;
    if (d && typeof d === 'object') return d as IPreviewXml;
  }
  return data as IPreviewXml;
}

export function EntradaNotas() {
  const navigate = useNavigate();
  const location = useLocation();
  const carregouEdicaoRef = useRef<string | null>(null);
  const [notas, setNotas] = useState<INotaEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dadosNota, setDadosNota] = useState<IPreviewXml | null>(null);
  const [naturezasEntrada, setNaturezasEntrada] = useState<ICfop[]>([]);
  /** Índice da linha → id da natureza de operação (motor fiscal) */
  const [naturezaOperacaoPorLinha, setNaturezaOperacaoPorLinha] = useState<Record<number, string>>({});
  const [isConfirmando, setIsConfirmando] = useState(false);
  const [chaveConsultaDigitos, setChaveConsultaDigitos] = useState('');
  const [consultandoChave, setConsultandoChave] = useState(false);
  const [revisaoAba, setRevisaoAba] = useState<RevisaoAbaId>('estoque');
  const [arrastandoXml, setArrastandoXml] = useState(false);
  const [documentoEdicaoId, setDocumentoEdicaoId] = useState<string | null>(null);
  const [pedidoCompraIdEdicao, setPedidoCompraIdEdicao] = useState<string | null>(null);
  const [contaContabilId, setContaContabilId] = useState('');
  const [contasAnaliticasPlano, setContasAnaliticasPlano] = useState<IContaPlanoResumoNfe[]>([]);
  const [carregandoContasPlano, setCarregandoContasPlano] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarNotas();
  }, []);

  useEffect(() => {
    const st = location.state as { editarDocumentoId?: string } | undefined;
    const id = st?.editarDocumentoId;
    if (!id || typeof id !== 'string') return;
    if (carregouEdicaoRef.current === id) return;
    carregouEdicaoRef.current = id;
    navigate(location.pathname, { replace: true, state: {} });

    void (async () => {
      try {
        setLoading(true);
        const res = await api.get<RespostaEdicaoNfe>(`/api/nfe/entradas/${id}`);

        const dados = res.data.dados;
        if (!dados?.preview) {
          toast.error('Não foi possível carregar a nota para edição.');
          return;
        }
        setDadosNota(dados.preview);
        const rec: Record<number, string> = {};
        (dados.naturezaOperacaoPorLinha ?? []).forEach((natId, idx) => {
          if (natId) rec[idx] = natId;
        });
        setNaturezaOperacaoPorLinha(rec);
        setDocumentoEdicaoId(dados.documentoFiscalEntradaId);
        setPedidoCompraIdEdicao(dados.pedidoCompraId);
        setContaContabilId(dados.contaContabilId?.trim() ? dados.contaContabilId : '');
        setRevisaoAba('estoque');
        toast.success('Nota carregada para revisão.');
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        toast.error(error.response?.data?.error ?? 'Falha ao carregar nota.');
      } finally {
        setLoading(false);
      }
    })();
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const carregarCfops = async () => {
      try {
        const res = await api.get<{ sucesso?: boolean; dados?: ICfop[] } | ICfop[]>('/api/cfops');
        const raw = res.data;
        const lista: ICfop[] = Array.isArray(raw) ? raw : raw?.dados ?? [];
        setNaturezasEntrada(lista.filter((c) => c.tipoOperacao === 'ENTRADA'));
      } catch {
        setNaturezasEntrada([]);
      }
    };
    void carregarCfops();
  }, []);

  useEffect(() => {
    if (dadosNota) setRevisaoAba('estoque');
  }, [dadosNota]);

  useEffect(() => {
    if (!dadosNota) {
      setContasAnaliticasPlano([]);
      return;
    }
    let cancelado = false;
    void (async () => {
      setCarregandoContasPlano(true);
      try {
        const res = await api.get<IContaPlanoResumoNfe[]>('/api/contas-contabeis', {
          params: { tipoConta: 'ANALITICA', limit: 2000 },
        });
        if (!cancelado) setContasAnaliticasPlano(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelado) setContasAnaliticasPlano([]);
      } finally {
        if (!cancelado) setCarregandoContasPlano(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [dadosNota]);

  const carregarNotas = async () => {
    try {
      setLoading(true);
      const response = await api.get<INotaEntrada[]>('/api/nfe/entradas');
      setNotas(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao carregar notas de entrada', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const sincronizarSefaz = async () => {
    try {
      setSincronizando(true);
      const response = await api.post<{ mensagem?: string }>('/api/nfe/entradas/sincronizar', {});
      alert(`✅ ${response.data.mensagem || 'Sincronização concluída!'}`);
      await carregarNotas();
    } catch (err) {
      const error = err as AxiosError<{
        erro?: string;
        error?: string;
        detalhes?: string;
        details?: string;
        statusFocus?: number;
      }>;
      const d = error.response?.data;
      const titulo = d?.erro || d?.error || 'Erro ao sincronizar com a SEFAZ.';
      const extra = d?.detalhes || d?.details;
      console.error('[EntradaNotas] sincronizar SEFAZ', error.response?.status, d);
      alert(
        `${titulo}${extra ? `\n\nDetalhes (debug):\n${extra}` : ''}${d?.statusFocus != null ? `\n(HTTP Focus: ${d.statusFocus})` : ''}`,
      );
    } finally {
      setSincronizando(false);
    }
  };

  const processarArquivoXml = async (file: File) => {
    const formData = new FormData();
    formData.append('arquivo', file);

    try {
      setUploading(true);
      const response = await api.post<unknown>('/api/nfe/entradas/processar', formData);
      const preview = extrairPreviewXml(response.data);
      setDadosNota(preview);
      setNaturezaOperacaoPorLinha(criarNaturezaVaziaPorItens(preview.itens));
      setContaContabilId('');
      toast.success('XML lido com sucesso. Revise os dados nas abas abaixo.');
    } catch (err) {
      const error = err as AxiosError<{ error?: string; erro?: string }>;
      toast.error(
        error.response?.data?.error || error.response?.data?.erro || 'Erro ao processar o arquivo XML.',
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadXml = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void processarArquivoXml(file);
  };

  const handleDropXml = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastandoXml(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const okNome = /\.xml$/i.test(file.name);
    const okTipo =
      file.type === 'text/xml' || file.type === 'application/xml' || file.type === 'application/octet-stream';
    if (!okNome && !okTipo) {
      toast.warning('Solte um arquivo XML de NF-e (.xml).');
      return;
    }
    void processarArquivoXml(file);
  };

  const handleConsultarChave = async () => {
    const chave = chaveConsultaDigitos.replace(/\D/g, '');
    if (chave.length !== 44) {
      toast.warning('A chave de acesso deve ter exatamente 44 dígitos.');
      return;
    }
    try {
      setConsultandoChave(true);
      const response = await api.post<unknown>('/api/nfe/entradas/consultar-chave', {
        chave,
      });
      const preview = extrairPreviewXml(response.data);
      setDadosNota(preview);
      setNaturezaOperacaoPorLinha(criarNaturezaVaziaPorItens(preview.itens));
      setContaContabilId('');
      toast.success('NF-e obtida na SEFAZ/Focus. Revise os dados nas abas abaixo.');
    } catch (err) {
      const error = err as AxiosError<{ error?: string; erro?: string }>;
      const msg =
        error.response?.data?.error ??
        error.response?.data?.erro ??
        error.message ??
        'Não foi possível consultar a NF-e pela chave.';
      toast.error(msg);
    } finally {
      setConsultandoChave(false);
    }
  };

  const handleCancelarRevisao = () => {
    setDadosNota(null);
    setNaturezaOperacaoPorLinha({});
    setChaveConsultaDigitos('');
    setDocumentoEdicaoId(null);
    setPedidoCompraIdEdicao(null);
    setContaContabilId('');
    carregouEdicaoRef.current = null;
  };

  const handleConfirmarEntrada = async () => {
    if (!dadosNota) return;
    const linhasSemNatureza = dadosNota.itens.filter((_, idx) => !naturezaOperacaoPorLinha[idx]?.trim());
    if (linhasSemNatureza.length > 0) {
      toast.warning('Defina a natureza da operação em todas as linhas antes de confirmar.');
      return;
    }

    const payload = {
      fornecedor: dadosNota.fornecedor,
      documento: dadosNota.documento,
      totaisFiscais: dadosNota.totaisFiscais,
      cobranca: dadosNota.cobranca,
      ...(pedidoCompraIdEdicao ? { pedidoCompraId: pedidoCompraIdEdicao } : {}),
      ...(contaContabilId.trim() ? { contaContabilId: contaContabilId.trim() } : {}),
      itens: dadosNota.itens.map((it, idx) => ({
        numeroItem: it.numeroItem ?? idx + 1,
        descricaoOriginal: it.descricaoOriginal,
        ean: it.ean ?? '',
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        valorTotal: it.valorTotal ?? it.quantidade * it.valorUnitario,
        unidadeMedida: it.unidadeMedida,
        produtoIdSelecionado: it.produtoIdSelecionado ?? null,
        codigo: it.codigo,
        ncm: it.ncm,
        cfopNota: it.cfopNota,
        naturezaOperacaoId: naturezaOperacaoPorLinha[idx],
      })),
    };

    try {
      setIsConfirmando(true);
      const response = documentoEdicaoId
        ? await api.put<{ message?: string }>(`/api/nfe/entradas/${documentoEdicaoId}`, payload)
        : await api.post<{ message?: string }>('/api/nfe/entradas/confirmar', payload);
      toast.success(
        response.data.message ?? 'Nota Fiscal e Estoque atualizados com sucesso!',
      );
      handleCancelarRevisao();
      await carregarNotas();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      const msg =
        error.response?.data?.error ??
        error.message ??
        'Não foi possível confirmar a entrada da NF-e.';
      toast.error(msg);
    } finally {
      setIsConfirmando(false);
    }
  };

  const baixarDocumento = async (chave: string, tipo: 'pdf' | 'xml') => {
    if (!chave) return;

    try {
      const response = await api.get(`/api/nfe/entradas/${chave}/download/${tipo}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NFe_${chave}.${tipo}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const error = err as AxiosError<{ erro?: string }>;
      console.error('Erro no download:', error);

      if (error.response && error.response.data instanceof Blob) {
        const erroTexto = await error.response.data.text();
        try {
          const erroJson = JSON.parse(erroTexto) as { erro?: string };
          alert(`❌ ${erroJson.erro || 'Erro interno no arquivo.'}`);
          return;
        } catch {
          console.error('Não foi possível ler o erro do backend.');
        }
      }

      alert(
        `⚠️ A SEFAZ ainda está processando o ${tipo.toUpperCase()} desta nota. Aguarde alguns minutos e tente novamente.`
      );
    }
  };

  const formatarMoeda = (valor: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));
  };

  const formatarCnpj = (cnpj?: string) => {
    if (!cnpj) return '-';
    const d = cnpj.replace(/\D/g, '');
    if (d.length === 11) {
      return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        {dadosNota ? (
          <EntradaNotasRevisao
            dadosNota={dadosNota}
            revisaoAba={revisaoAba}
            onAbaChange={setRevisaoAba}
            naturezaOperacaoPorLinha={naturezaOperacaoPorLinha}
            onNaturezaLinhaChange={(idx, v) =>
              setNaturezaOperacaoPorLinha((prev) => ({ ...prev, [idx]: v }))
            }
            naturezasEntrada={naturezasEntrada}
            contasAnaliticasPlano={contasAnaliticasPlano}
            carregandoContasPlano={carregandoContasPlano}
            contaContabilId={contaContabilId}
            onContaContabilIdChange={setContaContabilId}
            isConfirmando={isConfirmando}
            onCancelar={handleCancelarRevisao}
            onConfirmar={() => void handleConfirmarEntrada()}
            rotuloConfirmar={
              documentoEdicaoId
                ? 'Salvar alterações (reconstruir movimentos)'
                : undefined
            }
            formatarMoeda={formatarMoeda}
            formatarCnpj={formatarCnpj}
            formatarChaveVisual={formatarChaveVisual}
            parseDataEmissaoXml={parseDataEmissaoXml}
          />
        ) : (
          <>
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />
          <input
            type="file"
            accept=".xml"
            ref={fileInputRef}
            onChange={handleUploadXml}
            className="hidden"
          />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <Database className="h-8 w-8 text-violet-300" />
                </div>
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Inbound — Recebimento
                  </div>
                  <h1 className="text-3xl font-black text-white">Entrada de Notas</h1>
                  <p className="mt-1 max-w-xl font-medium text-slate-400">
                    Duas entradas independentes: consulta SEFAZ pela chave (44 dígitos) ou upload manual do XML (arquivo
                    ou arrastar e soltar).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={sincronizarSefaz}
                disabled={sincronizando || loading}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-200 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                {sincronizando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-5 w-5" />
                )}
                {sincronizando ? 'Sincronizando...' : 'Sincronizar lista SEFAZ'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Opção A — Chave SEFAZ */}
              <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 to-transparent p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black text-cyan-200">
                    A
                  </span>
                  <ScanBarcode className="h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/90">
                      Chave de acesso (44 dígitos)
                    </p>
                    <p className="text-xs text-slate-500">Leitor de barras na doca ou digitação.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="chave-nfe-acesso"
                      className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500"
                    >
                      Chave NF-e
                    </label>
                    <input
                      id="chave-nfe-acesso"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Somente números"
                      value={chaveConsultaDigitos}
                      onChange={(e) => setChaveConsultaDigitos(e.target.value.replace(/\D/g, '').slice(0, 44))}
                      disabled={consultandoChave || uploading || loading}
                      className="h-12 w-full rounded-xl border border-white/15 bg-[#050913]/90 px-4 font-mono text-sm tracking-wide text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
                    />
                    <p className="mt-1.5 text-[11px] text-slate-600">{chaveConsultaDigitos.length}/44 dígitos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleConsultarChave()}
                    disabled={
                      consultandoChave ||
                      uploading ||
                      loading ||
                      chaveConsultaDigitos.replace(/\D/g, '').length !== 44
                    }
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-gradient-to-r from-cyan-600 to-teal-600 px-6 font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 sm:min-w-[180px]"
                  >
                    {consultandoChave ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Consultando...
                      </>
                    ) : (
                      <>
                        <ScanBarcode className="h-4 w-4" />
                        Consultar SEFAZ
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Opção B — Upload manual XML */}
              <div
                role="button"
                tabIndex={0}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setArrastandoXml(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setArrastandoXml(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setArrastandoXml(false);
                }}
                onDrop={handleDropXml}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex flex-col rounded-2xl border-2 border-dashed p-5 transition-all sm:p-6 ${
                  arrastandoXml
                    ? 'border-violet-400/60 bg-violet-500/15 shadow-[0_0_28px_rgba(139,92,246,0.2)]'
                    : 'border-violet-400/25 bg-black/20 hover:border-violet-400/40'
                }`}
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-lg border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-black text-violet-200">
                    B
                  </span>
                  <Upload className="h-5 w-5 text-violet-300" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/90">
                      Upload manual de XML
                    </p>
                    <p className="text-xs text-slate-500">Arraste o arquivo para esta área ou use o botão.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
                  <FileText className={`h-12 w-12 ${arrastandoXml ? 'text-violet-200' : 'text-slate-600'}`} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || loading || consultandoChave}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/35 bg-gradient-to-r from-violet-600 to-fuchsia-700 px-8 py-3.5 font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Lendo XML...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Selecionar arquivo XML
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
              <FileText className="h-4 w-4 text-violet-300" />
              Notas de entrada
            </h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
              {notas.length} Registros
            </span>
          </div>

          <div className="max-h-[72vh] overflow-y-auto">
            {loading ? (
              <div className="p-16 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-violet-300" />
                <p className="font-bold text-slate-300">
                  Carregando notas de entrada...
                </p>
              </div>
            ) : notas.length === 0 ? (
              <div className="bg-black/10 p-16 text-center">
                <FileX className="mx-auto mb-4 h-12 w-12 text-slate-500" />
                <p className="text-lg font-black text-white">
                  Nenhuma nota encontrada no sistema.
                </p>
                <p className="mt-1 font-medium text-slate-500">
                  Importe um XML manualmente ou busque na SEFAZ.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notas.map((nota) => {
                  const integ = nota.statusIntegracaoEstoque;
                  const estoqueNaoAplica = integ === 'NAO_APLICA';
                  const estoqueProcessado =
                    !estoqueNaoAplica &&
                    (integ === 'PROCESSADO' || nota.statusEstoque === true);
                  return (
                  <div
                    key={nota.id}
                    className="group p-5 transition-colors hover:bg-white/5"
                  >
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[140px_minmax(0,1.3fr)_minmax(0,1fr)_140px_190px_170px] xl:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-300">
                          {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}
                        </p>
                        <span className="mt-2 inline-flex rounded-md border border-white/10 bg-[#0b1324] px-2.5 py-1 text-[10px] font-black tracking-widest text-slate-400">
                          Nº {nota.numero} / {nota.serie}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {nota.fornecedor?.razaoSocial ||
                            nota.fornecedor?.nomeFantasia ||
                            'Desconhecido'}
                        </p>
                        <p className="mt-1 truncate text-xs font-mono text-slate-400">
                          {formatarCnpj(nota.fornecedor?.cnpjCpf)}
                        </p>
                        <code className="mt-2 block max-w-[320px] truncate rounded-md border border-white/10 bg-[#0b1324] px-2 py-1 text-[10px] font-mono text-slate-400">
                          {nota.chaveAcesso}
                        </code>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/80">
                          Vínculo P2P
                        </p>
                        {nota.pedidoCompra?.id ? (
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              title="Ver pedido de compra"
                              onClick={() =>
                                navigate('/compras/pedidos', {
                                  state: { highlightPedidoId: nota.pedidoCompra!.id },
                                })
                              }
                              className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-200 transition-all hover:border-cyan-300/50 hover:bg-cyan-500/25"
                            >
                              <Link2 className="h-3 w-3 shrink-0" />
                              Pedido #{formatarIdCurto(nota.pedidoCompra.id)}
                            </button>
                            {nota.documentoEntradaMercadoria?.id ? (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                                Doc. #{formatarIdCurto(nota.documentoEntradaMercadoria.id)}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase text-slate-600">—</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            Sem vínculo
                          </span>
                        )}
                      </div>

                      <div className="text-left xl:text-right">
                        <p className="font-mono text-lg font-black text-violet-300">
                          {formatarMoeda(nota.valorTotalDocumento)}
                        </p>
                      </div>

                      <div className="xl:justify-self-center">
                        <div className="flex flex-col items-start gap-2 xl:items-center">
                          <span
                            className={`inline-flex w-[150px] items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                              estoqueNaoAplica
                                ? 'border-white/10 bg-white/5 text-slate-400'
                                : estoqueProcessado
                                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                  : 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {estoqueNaoAplica ? (
                              <Minus className="h-3.5 w-3.5" />
                            ) : estoqueProcessado ? (
                              <PackageCheck className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {estoqueNaoAplica
                              ? 'Sem integração estoque'
                              : estoqueProcessado
                                ? 'Estoque atualizado'
                                : 'Estoque pendente'}
                          </span>

                          <span
                            className={`inline-flex w-[150px] items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                              nota.statusContabil
                                ? 'border-violet-400/20 bg-violet-500/10 text-violet-300'
                                : 'border-white/10 bg-white/5 text-slate-500'
                            }`}
                          >
                            {nota.statusContabil ? (
                              <Database className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {nota.statusContabil ? 'Contabilizado' : 'Não Contab.'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <button
                          onClick={() => baixarDocumento(nota.chaveAcesso, 'pdf')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-violet-300"
                          title="Baixar DANFE (PDF)"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          DANFE
                        </button>

                        <button
                          onClick={() => baixarDocumento(nota.chaveAcesso, 'xml')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-all hover:border-emerald-400/20 hover:bg-emerald-500/10 hover:text-emerald-300"
                          title="Baixar XML Original"
                        >
                          <Download className="h-3.5 w-3.5" />
                          XML
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/10 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Landmark className="h-4 w-4 text-violet-300" />
              O painel de entrada de notas centraliza importação fiscal, integração de estoque e reflexo contábil.
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </Layout>
  );
}