import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import {
  FileText,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Truck,
  Info,
  User,
  Package,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface ICfopResumo {
  id: string;
  codigo: string;
  descricao: string;
}

export interface IItemNotaManual {
  /** UUID, código interno, EAN ou código de barras (obrigatório para NF-e avulsa). */
  produtoId: string;
  nome: string;
  quantidade: number | string;
  valorUnitario: number | string;
  cfop: string;
  cstCsosn: string;
  ncm: string;
  origem: string;
  aliquotaIcms: number | string;
}

export interface IDadosGeraisNota {
  naturezaOperacao: string;
  tipoDocumento: '0' | '1';
  finalidadeEmissao: '1' | '2' | '3' | '4';
  chaveReferenciada: string;
}

export interface IClienteNota {
  id: string;
  nome: string;
  cnpjCpf: string;
}

export interface ITransporteNota {
  modalidadeFrete: '0' | '1' | '2' | '3' | '4' | '9';
  veiculoPlaca: string;
  veiculoUf: string;
}

export interface IPayloadNotaManual {
  origem: 'MANUAL';
  valorTotal: number;
  naturezaOperacao: string;
  tipoDocumento: string;
  finalidadeEmissao: string;
  chaveReferenciada: string;
  pessoaId?: string;
  cliente: IClienteNota;
  transporte: ITransporteNota;
  observacao: string;
  itens: Array<
    Omit<IItemNotaManual, 'quantidade' | 'valorUnitario' | 'aliquotaIcms'> & {
      quantidade: number;
      valorUnitario: number;
      aliquotaIcms: number;
      produtoId: string;
    }
  >;
}

interface IPessoaLista {
  id: string;
  razaoSocial: string;
  /** API `/api/pessoas` expõe como cpfCnpj (espelho de cnpjCpf). */
  cpfCnpj: string;
  logradouro?: string;
  numero?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export function EmissaoNotaManual() {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [cfops, setCfops] = useState<ICfopResumo[]>([]);
  const [listaPessoas, setListaPessoas] = useState<IPessoaLista[]>([]);

  useEffect(() => {
    const carregarCfops = async () => {
      try {
        const response = await api.get<{ sucesso?: boolean; dados?: ICfopResumo[] } | ICfopResumo[]>(
          '/api/cfops',
        );
        const raw = response.data;
        setCfops(Array.isArray(raw) ? raw : raw?.dados ?? []);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.log('Erro ao carregar CFOPs:', error.response?.data || error.message);
      }
    };
    carregarCfops();
  }, []);

  useEffect(() => {
    const carregarClientes = async () => {
      try {
        const response = await api.get<IPessoaLista[]>('/api/cadastros/pessoas', {
          params: { tipo: 'CLIENTE' },
        });
        setListaPessoas(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.log('Erro ao carregar clientes:', error.response?.data || error.message);
      }
    };
    carregarClientes();
  }, []);

  const [dadosGerais, setDadosGerais] = useState<IDadosGeraisNota>({
    naturezaOperacao: 'Venda de Mercadoria',
    tipoDocumento: '1',
    finalidadeEmissao: '1',
    chaveReferenciada: '',
  });

  const [cliente, setCliente] = useState<IClienteNota>({
    id: '',
    nome: '',
    cnpjCpf: '',
  });

  const [transporte, setTransporte] = useState<ITransporteNota>({
    modalidadeFrete: '9',
    veiculoPlaca: '',
    veiculoUf: '',
  });

  const [observacao, setObservacao] = useState<string>('');

  const [itens, setItens] = useState<IItemNotaManual[]>([
    {
      produtoId: '',
      nome: '',
      quantidade: 1,
      valorUnitario: 0,
      cfop: '',
      cstCsosn: '',
      ncm: '',
      origem: '0',
      aliquotaIcms: 0,
    },
  ]);

  const adicionarItem = () =>
    setItens([
      ...itens,
      {
        produtoId: '',
        nome: '',
        quantidade: 1,
        valorUnitario: 0,
        cfop: '',
        cstCsosn: '',
        ncm: '',
        origem: '0',
        aliquotaIcms: 0,
      },
    ]);

  const removerItem = (index: number) => {
    if (itens.length === 1) return alert('A nota precisa ter pelo menos um item.');
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof IItemNotaManual,
    value: string | number
  ) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [field]: value };
    setItens(novosItens);
  };

  const calcularTotal = () =>
    itens.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.valorUnitario),
      0
    );

  const emitirNota = async () => {
    if (!cliente.id?.trim()) {
      return alert(
        'Selecione um cliente cadastrado (com endereço principal completo). A NF-e avulsa não pode ser emitida só com nome/CPF digitados.'
      );
    }

    if (!cliente.nome || !cliente.cnpjCpf) {
      return alert('Cliente sem nome ou CPF/CNPJ. Selecione novamente na lista.');
    }

    if (
      dadosGerais.finalidadeEmissao === '4' &&
      (!dadosGerais.chaveReferenciada || dadosGerais.chaveReferenciada.length < 44)
    ) {
      return alert(
        'Para notas de devolução, você deve informar a Chave de Acesso Referenciada (44 dígitos) da nota original.'
      );
    }

    if (itens.some(i => !String(i.produtoId || '').trim())) {
      return alert('Cada item deve ter o Produto (ID, código, EAN ou código de barras) informado.');
    }

    if (itens.some(i => !i.nome || !i.cfop || !i.cstCsosn || !i.ncm)) {
      return alert(
        'Preencha todos os campos obrigatórios dos itens (Nome, CFOP, CST, NCM).'
      );
    }

    setSalvando(true);
    try {
      const payload: IPayloadNotaManual = {
        origem: 'MANUAL',
        valorTotal: calcularTotal(),
        ...dadosGerais,
        cliente,
        transporte,
        observacao,
        pessoaId: cliente.id,
        itens: itens.map(i => ({
          ...i,
          produtoId: String(i.produtoId).trim(),
          quantidade: Number(i.quantidade),
          valorUnitario: Number(i.valorUnitario),
          aliquotaIcms: Number(i.aliquotaIcms),
        })),
      };

      await api.post<{ message?: string }>('/api/vendas/avulsa', payload);
      alert('✅ Nota Manual gerada e enviada para a fila de transmissão da SEFAZ com sucesso!');
      navigate('/notas');
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(`❌ Erro ao emitir nota: ${error.response?.data?.error || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15';
  const labelClass =
    'mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400';
  const cardClass =
    'rounded-[28px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl';
  const cardTitleClass =
    'mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white';

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)]">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-500/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/notas')}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                title="Voltar para Gestão de Notas"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fiscal Operations
                </div>

                <h1 className="flex items-center gap-3 text-3xl font-black text-white">
                  <FileText className="h-7 w-7 text-violet-300" />
                  Emissão de Nota Avulsa
                </h1>

                <p className="mt-1 font-medium text-slate-400">
                  Gere notas de devolução, remessa, perdas ou ajustes diretamente para a SEFAZ.
                </p>
              </div>
            </div>

            <button
              onClick={emitirNota}
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100"
            >
              {salvando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {salvando ? 'Processando...' : 'Emitir e Transmitir'}
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="space-y-6 lg:col-span-4">
            <div className={cardClass}>
              <h3 className={cardTitleClass}>
                <Info className="h-4 w-4 text-sky-300" />
                Dados Gerais da Nota
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Natureza da Operação</label>
                  <input
                    type="text"
                    value={dadosGerais.naturezaOperacao}
                    onChange={e =>
                      setDadosGerais({ ...dadosGerais, naturezaOperacao: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tipo</label>
                    <select
                      value={dadosGerais.tipoDocumento}
                      onChange={e =>
                        setDadosGerais({
                          ...dadosGerais,
                          tipoDocumento: e.target.value as '0' | '1',
                        })
                      }
                      className={inputClass}
                    >
                      <option value="1">1 - Saída</option>
                      <option value="0">0 - Entrada</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Finalidade</label>
                    <select
                      value={dadosGerais.finalidadeEmissao}
                      onChange={e => {
                        const val = e.target.value as '1' | '2' | '3' | '4';
                        setDadosGerais({ ...dadosGerais, finalidadeEmissao: val });
                        if (val !== '4') {
                          setDadosGerais(prev => ({ ...prev, chaveReferenciada: '' }));
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="1">1 - Normal</option>
                      <option value="4">4 - Devolução</option>
                      <option value="2">2 - Complementar</option>
                      <option value="3">3 - Ajuste</option>
                    </select>
                  </div>
                </div>

                {dadosGerais.finalidadeEmissao === '4' && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <label className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Chave Referenciada (Nota Original)
                    </label>
                    <input
                      type="text"
                      maxLength={44}
                      placeholder="Digite os 44 números..."
                      value={dadosGerais.chaveReferenciada}
                      onChange={e =>
                        setDadosGerais({
                          ...dadosGerais,
                          chaveReferenciada: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="w-full rounded-xl border border-amber-400/20 bg-[#0b1324] px-4 py-3 font-mono text-sm tracking-widest text-amber-200 outline-none focus:border-amber-400/40"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={cardTitleClass}>
                <User className="h-4 w-4 text-emerald-300" />
                Destinatário / Remetente
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Cliente cadastrado (obrigatório)</label>
                  <select
                    value={cliente.id}
                    onChange={e => {
                      const id = e.target.value;
                      if (!id) {
                        setCliente({ id: '', nome: '', cnpjCpf: '' });
                        return;
                      }
                      const p = listaPessoas.find(x => x.id === id);
                      if (p) {
                        setCliente({
                          id: p.id,
                          nome: p.razaoSocial || '',
                          cnpjCpf: p.cpfCnpj || '',
                        });
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="">Selecione um cliente com endereço principal…</option>
                    {listaPessoas.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.razaoSocial} — {p.cpfCnpj}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    A NF-e modelo 55 exige pessoa cadastrada com endereço principal (logradouro, número,
                    cidade, UF, CEP).
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Nome / Razão Social</label>
                  <input
                    type="text"
                    value={cliente.nome}
                    readOnly
                    className={`${inputClass} opacity-80`}
                  />
                </div>

                <div>
                  <label className={labelClass}>CPF / CNPJ</label>
                  <input
                    type="text"
                    value={cliente.cnpjCpf}
                    readOnly
                    className={`${inputClass} font-mono opacity-80`}
                    placeholder="Preenchido pelo cadastro"
                  />
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={cardTitleClass}>
                <Truck className="h-4 w-4 text-amber-300" />
                Transporte e Adicionais
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Modalidade de Frete</label>
                  <select
                    value={transporte.modalidadeFrete}
                    onChange={e =>
                      setTransporte({
                        ...transporte,
                        modalidadeFrete: e.target.value as '0' | '1' | '2' | '3' | '4' | '9',
                      })
                    }
                    className={inputClass}
                  >
                    <option value="9">9 - Sem Frete (Ocorrência)</option>
                    <option value="0">0 - CIF (Emitente)</option>
                    <option value="1">1 - FOB (Destinatário)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Observações</label>
                  <textarea
                    rows={3}
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    className={`${inputClass} resize-none`}
                    placeholder="Informações adicionais de interesse do fisco..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`${cardClass} lg:col-span-8 flex min-h-[600px] flex-col`}>
            <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                  <Package className="h-5 w-5 text-violet-300" />
                  Produtos / Itens da Nota
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Edição inline de alta produtividade para lançamento fiscal rápido.
                </p>
              </div>

              <button
                onClick={adicionarItem}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Adicionar Item
              </button>
            </div>

            <datalist id="lista-cfops">
              {cfops.map((c: ICfopResumo) => (
                <option key={c.id} value={c.codigo}>
                  {c.descricao}
                </option>
              ))}
            </datalist>

            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1324]/70">
              <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-black/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <div className="col-span-2">Produto (ref.)</div>
                <div className="col-span-2">Descrição</div>
                <div className="col-span-1 text-center">Qtd</div>
                <div className="col-span-2 text-right">Vlr Unit</div>
                <div className="col-span-1">CFOP</div>
                <div className="col-span-1">CST</div>
                <div className="col-span-1">NCM</div>
                <div className="col-span-1 text-center">% ICMS</div>
                <div className="col-span-1 text-right">Ações</div>
              </div>

              <div className="custom-scrollbar max-h-[58vh] overflow-y-auto">
                {itens.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5"
                  >
                    <div className="col-span-12 xl:col-span-2">
                      <input
                        type="text"
                        value={item.produtoId}
                        onChange={e => handleItemChange(index, 'produtoId', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                        placeholder="UUID, código, EAN"
                      />
                    </div>
                    <div className="col-span-12 xl:col-span-2">
                      <input
                        type="text"
                        value={item.nome}
                        onChange={e => handleItemChange(index, 'nome', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                        placeholder="Descrição na nota"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3 xl:col-span-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={e => handleItemChange(index, 'quantidade', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 text-center text-sm font-mono text-white outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.valorUnitario}
                        onChange={e => handleItemChange(index, 'valorUnitario', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 text-right text-sm font-mono text-white outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2 xl:col-span-1">
                      <input
                        type="text"
                        list="lista-cfops"
                        placeholder="5202"
                        value={item.cfop}
                        onChange={e => handleItemChange(index, 'cfop', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 text-sm font-mono text-white outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2 xl:col-span-1">
                      <input
                        type="text"
                        placeholder="102"
                        value={item.cstCsosn}
                        onChange={e => handleItemChange(index, 'cstCsosn', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 text-sm font-mono text-white outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2 xl:col-span-1">
                      <input
                        type="text"
                        placeholder="00000000"
                        value={item.ncm}
                        onChange={e => handleItemChange(index, 'ncm', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 text-sm font-mono text-white outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2 xl:col-span-1">
                      <input
                        type="number"
                        value={item.aliquotaIcms}
                        onChange={e => handleItemChange(index, 'aliquotaIcms', e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2.5 text-center text-sm font-mono text-white outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                        placeholder="0"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-1 xl:col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => removerItem(index)}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 p-2.5 text-rose-300 transition-all hover:bg-rose-500/20"
                        title="Remover Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="col-span-12 flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Origem
                      </span>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={item.origem}
                          onChange={e => handleItemChange(index, 'origem', e.target.value)}
                          className="w-20 rounded-lg border border-white/10 bg-[#08101f] px-3 py-2 text-center text-sm font-mono text-white outline-none transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                          placeholder="0"
                        />
                        <span className="text-xs font-medium text-slate-500">
                          Total do item:{' '}
                          <strong className="font-mono text-emerald-300">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(item.quantidade || 0) * Number(item.valorUnitario || 0))}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 mt-6 rounded-[22px] border border-white/10 bg-black/20 p-6 shadow-inner backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                  Total da Nota
                </span>
                <span className="font-mono text-3xl font-black text-emerald-300">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(calcularTotal())}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Landmark className="h-4 w-4 text-violet-300" />
            A emissão manual permite registrar operações fiscais avulsas com rastreabilidade e coerência contábil.
          </div>
        </div>
      </div>
    </Layout>
  );
}