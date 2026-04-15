import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import { useNavigate } from 'react-router-dom';
import {
  FileCode2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Search,
  Settings,
  Database,
  PackageCheck,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AxiosError } from 'axios';

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface ICfop {
  id: string;
  codigo: string;
  descricao: string;
  /** Aliases do motor fiscal (NaturezaOperacao) */
  codigoCfop?: string;
  descricaoInterna?: string;
  tipoOperacao: string;
  movimentaEstoque: boolean;
}

export interface IItemXmlPreview {
  numeroItem?: number;
  /** cProd do XML */
  codigo?: string;
  descricaoOriginal: string;
  ean: string;
  ncm?: string;
  /** CFOP constante no XML (operação do emitente) */
  cfopNota?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal?: number;
  unidadeMedida?: string;
  produtoIdSelecionado: string | null;
  produtoNomeSelecionado: string;
  produtoCodigoSelecionado?: string;
}

export interface INfeDuplicataPreview {
  numero?: string;
  dataVencimento?: string;
  valor?: number;
}

export interface INfeCobrancaPreview {
  fatura?: {
    numero?: string;
    valorOriginal?: number;
    valorDesconto?: number;
    valorLiquido?: number;
  };
  duplicatas?: INfeDuplicataPreview[];
}

export interface ITotaisFiscaisNfePreview {
  baseCalculoIcms?: number;
  valorIcms?: number;
  baseCalculoIcmsSt?: number;
  valorIcmsSt?: number;
  valorIpi?: number;
  valorPis?: number;
  valorCofins?: number;
  valorTotalProdutos?: number;
  valorTotalNota?: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorDesconto?: number;
  valorOutrasDespesas?: number;
}

export interface IPreviewXml {
  documento: {
    numero: string;
    serie: string;
    dataEmissao: string;
    valorTotalDocumento: number;
    valorTotalProdutos?: number;
    chaveAcesso: string;
    naturezaOperacao?: string;
    modelo?: string;
  };
  fornecedor: {
    razaoSocial: string;
    cnpjCpf: string;
    nomeFantasia?: string;
    inscricaoEstadual?: string;
    indicadorIE?: 'CONTRIBUINTE' | 'NAO_CONTRIBUINTE' | 'ISENTO';
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
  itens: IItemXmlPreview[];
  /** Enriquecido pelo backend a partir do XML (ICMSTot, cobr, infAdic) */
  totaisFiscais?: ITotaisFiscaisNfePreview;
  cobranca?: INfeCobrancaPreview;
  infComplementar?: string;
  /** CFOPs constantes nos itens da nota (operação do emitente) */
  cfopsNota?: string[];
}

/** Resposta de GET /api/compras/recebimento-mercadorias/pedidos-elegiveis */
export interface IPedidoElegivelNfe {
  id: string;
  status: string;
  dataPedido: string;
  fornecedor: { id: string; razaoSocial: string; nomeFantasia?: string; cnpjCpf: string };
  itens: Array<{
    id: string;
    produtoId: string;
    quantidadePedida: string;
    quantidadeRecebida: string;
    produto: { id: string; nome: string; codigo: string };
  }>;
}

export interface IProdutoBusca {
  id: string;
  nome: string;
  ean?: string;
}

export interface IPayloadEntradaXml extends IPreviewXml {
  pedidoCompraId: string;
  cfopId: string;
  movimentaEstoque: boolean;
}

export function ImportarNfe() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [previewData, setPreviewData] = useState<IPreviewXml | null>(null);

  const [cfopsDisponiveis, setCfopsDisponiveis] = useState<ICfop[]>([]);
  const [selectedCfopId, setSelectedCfopId] = useState('');
  const [movimentaEstoque, setMovimentaEstoque] = useState(false);
  const [pedidosP2p, setPedidosP2p] = useState<IPedidoElegivelNfe[]>([]);
  const [carregandoPedidosP2p, setCarregandoPedidosP2p] = useState(false);
  const [pedidoCompraId, setPedidoCompraId] = useState('');

  const [produtosPesquisa, setProdutosPesquisa] = useState<IProdutoBusca[]>([]);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);
  const [modalPesquisa, setModalPesquisa] = useState<{ isOpen: boolean; itemIndex: number | null }>({
    isOpen: false,
    itemIndex: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        const resCfop = await api.get<{ sucesso?: boolean; dados?: ICfop[] } | ICfop[]>('/api/cfops');
        const raw = resCfop.data;
        const lista: ICfop[] = Array.isArray(raw) ? raw : raw?.dados ?? [];
        setCfopsDisponiveis(lista.filter((c) => c.tipoOperacao === 'ENTRADA'));
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao carregar CFOPs', error.response?.data || error.message);
      }
    };
    carregarDadosIniciais();
  }, []);

  const apenasDigitosDoc = (v: string) => String(v || '').replace(/\D/g, '');

  useEffect(() => {
    if (!previewData) {
      setPedidosP2p([]);
      setPedidoCompraId('');
      return;
    }

    const carregarPedidos = async () => {
      setCarregandoPedidosP2p(true);
      try {
        const res = await api.get<{ sucesso: boolean; dados?: IPedidoElegivelNfe[] }>(
          '/api/compras/recebimento-mercadorias/pedidos-elegiveis',
        );
        const lista = res.data.sucesso && res.data.dados ? res.data.dados : [];
        const alvo = apenasDigitosDoc(previewData.fornecedor.cnpjCpf);
        const filtrados = lista.filter((p) => apenasDigitosDoc(p.fornecedor.cnpjCpf) === alvo);
        setPedidosP2p(filtrados);
        setPedidoCompraId('');
      } catch (err) {
        const error = err as AxiosError<{ erro?: string }>;
        console.error('Erro ao carregar pedidos P2P', error.response?.data || error.message);
        setPedidosP2p([]);
      } finally {
        setCarregandoPedidosP2p(false);
      }
    };

    void carregarPedidos();
  }, [previewData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && previewData && !modalPesquisa.isOpen) {
        alert("Clique no botão 🔍 'Buscar (F2)' na linha do produto que deseja vincular.");
      }
      if (e.key === 'Escape' && modalPesquisa.isOpen) {
        setModalPesquisa({ isOpen: false, itemIndex: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData, modalPesquisa.isOpen]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const handleProcessarXml = async () => {
    if (!file) return alert('Selecione um XML.');
    const formData = new FormData();
    formData.append('arquivo', file);

    setLoading(true);
    try {
      const response = await api.post<IPreviewXml>('/api/nfe/entradas/processar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao processar o XML.');
    } finally {
      setLoading(false);
    }
  };

  const handleCfopChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedCfopId(id);

    const cfop = cfopsDisponiveis.find((c) => c.id === id);
    if (cfop) {
      setMovimentaEstoque(cfop.movimentaEstoque);
    } else {
      setMovimentaEstoque(false);
    }
  };

  const handleConfirmarEntrada = async () => {
    if (!previewData) return;
    if (!selectedCfopId) return alert('⚠️ SELECIONE UMA OPERAÇÃO FISCAL (CFOP).');
    if (!pedidoCompraId) return alert('⚠️ SELECIONE O PEDIDO DE COMPRA (P2P) DO EMITENTE.');
    if (!movimentaEstoque) {
      return alert('⚠️ CONFIRME A MOVIMENTAÇÃO DE ESTOQUE PARA INTEGRAR AO RECEBIMENTO P2P.');
    }
    const semVinculo = previewData.itens.some((it) => !it.produtoIdSelecionado);
    if (semVinculo) {
      return alert(
        '⚠️ VINCULE CADA ITEM DA NOTA A UM PRODUTO DO ESTOQUE QUE EXISTA NO PEDIDO DE COMPRA (SEM CADASTRO AVULSO NESTE FLUXO).',
      );
    }

    const pedidoSel = pedidosP2p.find((p) => p.id === pedidoCompraId);
    if (pedidoSel) {
      const idsNoPedido = new Set(pedidoSel.itens.map((i) => i.produtoId));
      const fora = previewData.itens.filter((it) => it.produtoIdSelecionado && !idsNoPedido.has(it.produtoIdSelecionado));
      if (fora.length > 0) {
        return alert(
          '⚠️ EXISTEM PRODUTOS VINCULADOS QUE NÃO CONSTAM NO PEDIDO SELECIONADO. AJUSTE O PEDIDO OU O VÍNCULO.',
        );
      }
    }

    setSalvando(true);
    try {
      const payload: IPayloadEntradaXml = {
        ...previewData,
        pedidoCompraId,
        cfopId: selectedCfopId,
        movimentaEstoque,
        itens: previewData.itens.map((it, idx) => ({
          numeroItem: it.numeroItem ?? idx + 1,
          descricaoOriginal: it.descricaoOriginal,
          ean: it.ean,
          quantidade: it.quantidade,
          valorUnitario: it.valorUnitario,
          valorTotal: it.valorTotal ?? it.quantidade * it.valorUnitario,
          unidadeMedida: it.unidadeMedida || 'UN',
          produtoIdSelecionado: it.produtoIdSelecionado,
          produtoNomeSelecionado: it.produtoNomeSelecionado ?? '',
        })),
      };

      const response = await api.post<{ message?: string }>('/api/nfe/entradas/salvar', payload);

      alert(`✅ ${response.data.message || 'Nota integrada com sucesso!'}`);
      navigate('/ListarNfe');
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert('Erro ao salvar: ' + (error.response?.data?.error || error.message));
    } finally {
      setSalvando(false);
    }
  };

  const abrirModalPesquisa = (index: number) => {
    if (!previewData) return;
    setModalPesquisa({ isOpen: true, itemIndex: index });
    const nomeOriginal = previewData.itens[index].descricaoOriginal;
    const termoInicial = nomeOriginal.split(' ').slice(0, 2).join(' ');
    setTermoPesquisa(termoInicial);
    buscarProdutos(termoInicial);
  };

  const buscarProdutos = async (termo: string) => {
    setTermoPesquisa(termo);
    if (!termo || termo.length < 2) {
      setProdutosPesquisa([]);
      return;
    }

    setBuscandoProdutos(true);
    try {
      const response = await api.get<IProdutoBusca[]>(`/api/cadastros/produtos?busca=${encodeURIComponent(termo)}`);
      setProdutosPesquisa(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao buscar produtos', error.response?.data || error.message);
    } finally {
      setBuscandoProdutos(false);
    }
  };

  const selecionarProduto = (produto: IProdutoBusca | null) => {
    if (modalPesquisa.itemIndex === null || !previewData) return;

    const novosItens = [...previewData.itens];
    novosItens[modalPesquisa.itemIndex].produtoIdSelecionado = produto ? produto.id : null;
    novosItens[modalPesquisa.itemIndex].produtoNomeSelecionado = produto ? produto.nome : '';

    setPreviewData({ ...previewData, itens: novosItens });
    setModalPesquisa({ isOpen: false, itemIndex: null });
    setTermoPesquisa('');
    setProdutosPesquisa([]);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarCnpj = (cnpj: string) => {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Inbound Fiscal
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <FileCode2 className="h-8 w-8 text-violet-300" />
                </div>
                Importar XML (Entrada)
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Importe o XML, vincule cada linha a produtos que existam no pedido de compra (P2P), escolha o
                CFOP de entrada e confirme: o sistema grava a NF fiscal, cria o DocumentoEntrada, atualiza
                estoque e gera o título a pagar na mesma transação.
              </p>
            </div>
          </div>
        </div>

        {!previewData && (
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.08),_transparent_30%)]" />

            <div
              className="relative z-10 mx-auto max-w-3xl cursor-pointer rounded-[30px] border-2 border-dashed border-violet-400/20 bg-[#0b1324]/40 p-16 text-center transition-all hover:border-violet-400/35 hover:bg-[#0b1324]/60"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10 transition-transform duration-300 group-hover:scale-110">
                <UploadCloud className="h-12 w-12 text-violet-300" />
              </div>

              <h3 className="mb-2 text-2xl font-black text-white">
                Clique para selecionar o XML
              </h3>
              <p className="font-medium text-slate-400">
                Apenas arquivos .xml são aceitos.
              </p>

              <input
                type="file"
                accept=".xml"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {file && (
                <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 font-bold text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  {file.name}
                </div>
              )}
            </div>

            {file && (
              <div className="relative z-10 mt-10 flex justify-center">
                <button
                  onClick={handleProcessarXml}
                  disabled={loading}
                  className="inline-flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-4 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Settings className="h-6 w-6" />
                  )}
                  {loading ? 'Lendo e Validando XML...' : 'Processar Documento'}
                </button>
              </div>
            )}
          </div>
        )}

        {previewData && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="border-b border-white/10 bg-black/10 p-6">
                <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-violet-300">
                  <FileCode2 className="h-5 w-5" />
                  Resumo do Documento Fiscal
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Fornecedor (Emitente)
                  </p>
                  <p
                    className="truncate text-lg font-bold text-white"
                    title={previewData.fornecedor.razaoSocial}
                  >
                    {previewData.fornecedor.razaoSocial}
                  </p>
                  <p className="mt-1 text-sm font-mono text-slate-400">
                    {formatarCnpj(previewData.fornecedor.cnpjCpf)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Número / Série
                  </p>
                  <p className="text-2xl font-black text-white">
                    {previewData.documento.numero}{' '}
                    <span className="text-sm font-bold text-slate-500">
                      / {previewData.documento.serie}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Emissão
                  </p>
                  <p className="text-xl font-bold text-white">
                    {new Date(previewData.documento.dataEmissao).toLocaleDateString('pt-BR', {
                      timeZone: 'UTC',
                    })}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1324] p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Valor Total
                  </p>
                  <p className="text-3xl font-black text-emerald-300">
                    {formatarMoeda(previewData.documento.valorTotalDocumento)}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="border-b border-white/10 bg-black/10 p-6">
                <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-violet-300">
                  <Settings className="h-5 w-5" />
                  Parametrização Fiscal e Contábil
                </h3>
              </div>

              <div className="grid grid-cols-1 items-end gap-6 p-6 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className={labelClass}>Chave de Acesso</label>
                  <input
                    type="text"
                    readOnly
                    title={previewData.documento.chaveAcesso}
                    value={previewData.documento.chaveAcesso}
                    className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-[#0b1324] px-4 py-3.5 text-xs font-mono text-slate-500 outline-none"
                  />
                </div>

                <div className="md:col-span-5">
                  <label className={labelClass}>Operação (CFOP) *</label>
                  <select
                    value={selectedCfopId}
                    onChange={handleCfopChange}
                    className={`${inputClass} font-bold text-violet-300`}
                  >
                    <option value="">-- Escolha como processar esta nota --</option>
                    {cfopsDisponiveis.map((cfop) => (
                      <option key={cfop.id} value={cfop.id}>
                        {cfop.codigo} - {cfop.descricao}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex h-full items-center pb-[2px] md:col-span-3">
                  <label
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl border p-3.5 transition-all ${
                      movimentaEstoque
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-white/10 bg-[#0b1324]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={movimentaEstoque}
                      onChange={(e) => setMovimentaEstoque(e.target.checked)}
                    />
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                        movimentaEstoque
                          ? 'border-emerald-400 bg-emerald-500'
                          : 'border-slate-500'
                      }`}
                    >
                      {movimentaEstoque && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-black uppercase tracking-wider ${
                          movimentaEstoque ? 'text-emerald-300' : 'text-slate-400'
                        }`}
                      >
                        Alimenta Estoque
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Pode ser alterado
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {selectedCfopId && (
                <div className="mx-6 mb-6 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-5 shadow-inner">
                  <div className="flex items-start gap-4">
                    <Database className="mt-0.5 h-8 w-8 shrink-0 text-violet-300" />
                    <div>
                      <h4 className="mb-1.5 text-sm font-black uppercase tracking-[0.16em] text-violet-300">
                        Motor Contábil Ativado
                      </h4>
                      <p className="text-sm font-medium leading-relaxed text-slate-300">
                        Ao confirmar, o sistema gerará automaticamente um{' '}
                        <strong>
                          Título a Pagar de{' '}
                          {formatarMoeda(previewData.documento.valorTotalDocumento)}
                        </strong>{' '}
                        e realizará os <strong>Lançamentos de Partidas Dobradas</strong> no
                        Livro Razão utilizando as contas analíticas vinculadas ao
                        Fornecedor e aos Produtos.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="border-b border-white/10 bg-black/10 p-6">
                <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
                  <Database className="h-5 w-5" />
                  Recebimento P2P (Compras)
                </h3>
              </div>

              <div className="space-y-5 p-6">
                <div className="md:max-w-2xl">
                  <label className={labelClass}>Pedido de compra (mesmo CNPJ do emitente) *</label>
                  <select
                    value={pedidoCompraId}
                    onChange={(e) => setPedidoCompraId(e.target.value)}
                    disabled={carregandoPedidosP2p}
                    className={`${inputClass} font-bold uppercase tracking-wide text-cyan-200`}
                  >
                    <option value="">
                      {carregandoPedidosP2p
                        ? 'CARREGANDO PEDIDOS ELEGÍVEIS...'
                        : '-- SELECIONE O PEDIDO VINCULADO A ESTA NF --'}
                    </option>
                    {pedidosP2p.map((p) => (
                      <option key={p.id} value={p.id}>
                        {`#${p.id.slice(0, 8).toUpperCase()} · ${p.status.replace(/_/g, ' ')} · ${new Date(p.dataPedido).toLocaleDateString('pt-BR')}`}
                      </option>
                    ))}
                  </select>
                </div>

                {!carregandoPedidosP2p && previewData && pedidosP2p.length === 0 && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-bold uppercase tracking-wide text-amber-200">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>
                      NENHUM PEDIDO ELEGÍVEL PARA ESTE FORNECEDOR. APROVE / ENVIE UM PEDIDO NO MÓDULO DE
                      COMPRAS OU AGUARDE STATUS COMPATÍVEL (APROVADO, ENVIADO OU RECEBIDO PARCIAL).
                    </span>
                  </div>
                )}

                {pedidoCompraId && previewData && (
                  <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#0b1324] p-5 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Valor total (XML)
                      </p>
                      <p className="text-xl font-black uppercase text-white">
                        {formatarMoeda(previewData.documento.valorTotalDocumento)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Provisão financeira / estoque (P2P)
                      </p>
                      <p className="text-sm font-bold uppercase leading-relaxed text-slate-300">
                        ESTOQUE E TÍTULO A PAGAR USAM PREÇO E QUANTIDADE DO PEDIDO (NÃO O VALOR DO XML).
                        QUANTIDADES DA NF DEVEM CABER NO SALDO EM ABERTO DE CADA LINHA.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="border-b border-white/10 bg-black/10 p-6">
                <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-white">
                  <PackageCheck className="h-5 w-5 text-emerald-300" />
                  Itens da Nota e Vínculo com Estoque
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left">
                  <thead className="border-b border-white/10 bg-[#0b1324]">
                    <tr>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Produto na Nota (XML)
                      </th>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Produto no Sistema (Estoque)
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Qtd
                      </th>
                      <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        V. Unit
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Ação
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {previewData.itens.map((item, index) => {
                      const achouProduto = !!item.produtoIdSelecionado;

                      return (
                        <tr
                          key={index}
                          className={`transition-colors ${
                            achouProduto ? 'hover:bg-white/5' : 'bg-amber-950/20 hover:bg-amber-900/20'
                          }`}
                        >
                          <td className="p-5">
                            <div className="text-sm font-bold text-white">
                              {item.descricaoOriginal}
                            </div>
                            <div className="mt-1 text-xs font-mono text-slate-500">
                              EAN: {item.ean || 'N/A'}
                            </div>
                          </td>

                          <td className="p-5">
                            {achouProduto ? (
                              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />
                                {item.produtoNomeSelecionado}
                              </div>
                            ) : (
                              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
                                <AlertTriangle className="h-4 w-4" />
                                Será cadastrado como novo
                              </div>
                            )}
                          </td>

                          <td className="p-5 text-center text-lg font-black text-slate-300">
                            {item.quantidade}
                          </td>

                          <td className="p-5 text-right font-mono font-bold text-slate-400">
                            {formatarMoeda(item.valorUnitario)}
                          </td>

                          <td className="p-5 text-center">
                            <button
                              onClick={() => abrirModalPesquisa(index)}
                              className="mx-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
                              title="Aperte F2 para buscar"
                            >
                              <Search className="h-3.5 w-3.5" />
                              Buscar (F2)
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-4 pt-2 sm:flex-row">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Cancelar Operação
              </button>

              <button
                onClick={handleConfirmarEntrada}
                disabled={salvando || !selectedCfopId || !pedidoCompraId || !movimentaEstoque}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-600 to-emerald-500 px-10 py-4 font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(16,185,129,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
              >
                {salvando ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Database className="h-6 w-6" />
                )}
                {salvando ? 'Contabilizando...' : 'Confirmar Entrada e Integrar'}
              </button>
            </div>
          </div>
        )}

        {modalPesquisa.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative flex w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />

              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-6 py-6">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">
                    Vincular Produto Existente
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Busque no seu estoque para não duplicar o cadastro.
                  </p>
                </div>

                <button
                  onClick={() => setModalPesquisa({ isOpen: false, itemIndex: null })}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Digite o nome ou código de barras..."
                    value={termoPesquisa}
                    onChange={(e) => buscarProdutos(e.target.value)}
                    className={`${inputClass} pl-12 text-lg font-bold`}
                  />
                  {buscandoProdutos && (
                    <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-violet-300" />
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1324]/50 shadow-inner">
                  {produtosPesquisa.length === 0 && termoPesquisa.length > 1 && !buscandoProdutos ? (
                    <div className="p-10 text-center font-medium text-slate-500">
                      Nenhum produto encontrado.
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-white/5">
                        {produtosPesquisa.map((p) => (
                          <tr
                            key={p.id}
                            className="cursor-pointer transition-colors hover:bg-white/5"
                            onClick={() => selecionarProduto(p)}
                          >
                            <td className="p-4 text-sm font-bold text-white">{p.nome}</td>
                            <td className="p-4 text-xs font-mono text-slate-400">
                              {p.ean || 'S/ Código'}
                            </td>
                            <td className="p-4 text-right">
                              <button className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-violet-300 transition-colors hover:bg-violet-600 hover:text-white">
                                Vincular
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                  <button
                    onClick={() => selecionarProduto(null)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black text-amber-300 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Cadastrar como Novo Produto
                  </button>

                  <p className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    ESC para fechar
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}