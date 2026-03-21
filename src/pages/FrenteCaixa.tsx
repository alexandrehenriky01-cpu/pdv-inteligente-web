import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api'; 
import { Layout } from '../components/Layout';

interface Produto {
  id: string;
  nome: string;
  precoVenda: number;
  codigoBarras: string;
  ean: string;
  estoque?: { quantidadeAtual: number };
}

interface ItemCarrinho extends Produto {
  quantidade: number;
}

interface Pagamento {
  tipo: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'CREDIARIO';
  valor: number;
  troco: number;
}

export function FrenteCaixa() {
  const [codigoBarras, setCodigoBarras] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Estados para Consulta (F3)
  const [modalConsultaAberto, setModalConsultaAberto] = useState(false);
  const [termoConsulta, setTermoConsulta] = useState('');
  const [produtosConsulta, setProdutosConsulta] = useState<Produto[]>([]);
  const [buscandoConsulta, setBuscandoConsulta] = useState(false);

  // ✅ ESTADOS DO MODAL DE PAGAMENTO
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [tipoPagamentoAtual, setTipoPagamentoAtual] = useState<Pagamento['tipo']>('DINHEIRO');
  const [valorPagamentoAtual, setValorPagamentoAtual] = useState('');
  
  // Dados Fiscais do Cliente (Opcional)
  const [cpfCnpjCliente, setCpfCnpjCliente] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');

  // Estados para o Cupom
  const [cupomVisivel, setCupomVisivel] = useState(false);
  const [dadosCupom, setDadosCupom] = useState<{itens: ItemCarrinho[], pagamentos: Pagamento[], total: number, data: Date} | null>(null);

  const totalVenda = carrinho.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const faltaPagar = Math.max(0, totalVenda - totalPago);
  const trocoTotal = pagamentos.reduce((acc, p) => acc + p.troco, 0);

  // Foca no input automaticamente
  useEffect(() => {
    if (!modalConsultaAberto && !cupomVisivel && !modalPagamentoAberto) {
      inputRef.current?.focus();
    }
  }, [cupomVisivel, modalConsultaAberto, modalPagamentoAberto]);

  // Monitor de Teclas (F3 Consulta, F4 Pagamento)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); abrirConsulta(); }
      if (e.key === 'F4' && carrinho.length > 0 && !modalPagamentoAberto) { e.preventDefault(); abrirModalPagamento(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho, modalPagamentoAberto]);

  const buscarProduto = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarras.trim() !== '') {
      try {
        setLoading(true);
        const response = await api.get(`/api/produtos?busca=${encodeURIComponent(codigoBarras)}`);
        const produtoExato = response.data.find((p: Produto) => p.codigoBarras === codigoBarras || p.ean === codigoBarras);
        
        if (produtoExato) {
          adicionarAoCarrinho(produtoExato);
          setCodigoBarras('');
        } else {
          alert('Produto não encontrado!');
        }
      } catch (error) {
        console.error("Erro ao buscar produto:", error);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    }
  };

  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho(prev => {
      const existe = prev.find(item => item.id === produto.id);
      if (existe) {
        return prev.map(item => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item);
      }
      return [{ ...produto, quantidade: 1 }, ...prev];
    });
  };

  const alterarQuantidade = (id: string, delta: number) => {
    setCarrinho(prev => prev.map(item => {
      if (item.id === id) {
        const novaQtd = item.quantidade + delta;
        return novaQtd > 0 ? { ...item, quantidade: novaQtd } : item;
      }
      return item;
    }));
    inputRef.current?.focus();
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(prev => prev.filter(item => item.id !== id));
    inputRef.current?.focus();
  };

  // ✅ FUNÇÕES DE PAGAMENTO
  const abrirModalPagamento = () => {
    setModalPagamentoAberto(true);
    setPagamentos([]);
    setValorPagamentoAtual(totalVenda.toFixed(2));
  };

  const adicionarPagamento = () => {
    const valorDigitado = parseFloat(valorPagamentoAtual.replace(',', '.'));
    if (isNaN(valorDigitado) || valorDigitado <= 0) return;

    let troco = 0;
    let valorConsiderado = valorDigitado;

    // Se for dinheiro e pagou a mais, calcula o troco
    if (tipoPagamentoAtual === 'DINHEIRO' && valorDigitado > faltaPagar) {
      troco = valorDigitado - faltaPagar;
      valorConsiderado = faltaPagar; // Para o banco, o valor pago na venda é apenas o que faltava
    } else if (valorDigitado > faltaPagar) {
      alert("Cartão e PIX não podem ter valor maior que o restante da venda.");
      return;
    }

    setPagamentos([...pagamentos, { tipo: tipoPagamentoAtual, valor: valorConsiderado, troco: troco }]);
    
    // Atualiza o valor restante para o próximo pagamento (se houver)
    const novoFaltaPagar = faltaPagar - valorConsiderado;
    setValorPagamentoAtual(novoFaltaPagar > 0 ? novoFaltaPagar.toFixed(2) : '');
  };

  const removerPagamento = (index: number) => {
    const novosPagamentos = [...pagamentos];
    novosPagamentos.splice(index, 1);
    setPagamentos(novosPagamentos);
  };

  const confirmarVenda = async () => {
    if (faltaPagar > 0.01) { // Tolerância de centavos
      alert("Ainda falta receber uma parte do valor!");
      return;
    }

    setLoading(true);
    try {
      const itensVenda = carrinho.map(item => ({
        produtoId: item.id, quantidade: item.quantidade, precoUnitario: item.precoVenda
      }));

      await api.post('/vendas', {
        itens: itensVenda,
        pagamentos: pagamentos,
        cpfCnpjCliente: cpfCnpjCliente || null,
        nomeCliente: nomeCliente || null
      });

      setDadosCupom({ itens: [...carrinho], pagamentos: [...pagamentos], total: totalVenda, data: new Date() });
      setModalPagamentoAberto(false);
      setCupomVisivel(true);
      
    } catch (error: any) {
      console.error("Erro ao finalizar venda:", error);
      alert(error.response?.data?.erro || "Erro ao finalizar a venda.");
    } finally {
      setLoading(false);
    }
  };

  const fecharCupom = () => {
    setCupomVisivel(false);
    setDadosCupom(null);
    setCarrinho([]);
    setPagamentos([]);
    setCpfCnpjCliente('');
    setNomeCliente('');
    setCodigoBarras('');
  };

  // Funções de Consulta
  const abrirConsulta = () => { setModalConsultaAberto(true); setTermoConsulta(''); setProdutosConsulta([]); };
  const realizarConsulta = async (termo: string) => {
    setTermoConsulta(termo);
    if (!termo || termo.length < 2) { setProdutosConsulta([]); return; }
    setBuscandoConsulta(true);
    try {
      const response = await api.get(`/api/produtos?busca=${encodeURIComponent(termo)}`);
      setProdutosConsulta(response.data);
    } finally { setBuscandoConsulta(false); }
  };

  return (
    <>
      <Layout>
        <div className="print:hidden h-full flex flex-col">
          {/* Cabeçalho */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">Frente de Caixa (PDV)</h1>
              <p className="text-slate-500">Passe o leitor de código de barras ou digite o código.</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={abrirConsulta} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-3 rounded-xl font-bold flex items-center gap-2">
                <span>🔍</span> Consultar Produto (F3)
              </button>
              <div className="text-4xl font-bold text-emerald-600 bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-200">
                R$ {totalVenda.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {/* Coluna Esquerda: Leitor e Lista */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input type="text" ref={inputRef} value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} onKeyDown={buscarProduto} disabled={loading} placeholder="Bipe o código de barras e aperte Enter..." className="w-full px-4 py-4 text-2xl font-mono rounded-lg border-2 border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 outline-none transition-all" />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col h-[500px]">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left relative">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-4 text-xs uppercase text-slate-600 font-bold">Produto</th>
                        <th className="p-4 text-xs uppercase text-slate-600 font-bold text-center">Qtd</th>
                        <th className="p-4 text-xs uppercase text-slate-600 font-bold text-right">Unitário</th>
                        <th className="p-4 text-xs uppercase text-slate-600 font-bold text-right">Subtotal</th>
                        <th className="p-4 text-xs uppercase text-slate-600 font-bold text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {carrinho.map((item) => (
                        <tr key={item.id} className="hover:bg-blue-50">
                          <td className="p-4 font-bold text-slate-800">{item.nome}</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => alterarQuantidade(item.id, -1)} className="w-8 h-8 rounded bg-slate-200 font-bold">-</button>
                              <span className="font-bold w-8">{item.quantidade}</span>
                              <button onClick={() => alterarQuantidade(item.id, 1)} className="w-8 h-8 rounded bg-slate-200 font-bold">+</button>
                            </div>
                          </td>
                          <td className="p-4 text-right text-slate-600">R$ {Number(item.precoVenda).toFixed(2)}</td>
                          <td className="p-4 text-right font-bold text-emerald-600 text-lg">R$ {(item.quantidade * item.precoVenda).toFixed(2)}</td>
                          <td className="p-4 text-center"><button onClick={() => removerDoCarrinho(item.id)} className="text-red-500 font-bold text-xl">&times;</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Resumo */}
            <div className="bg-slate-900 text-white p-8 rounded-xl shadow-xl flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-slate-100 border-b border-slate-700 pb-4">Resumo da Venda</h2>
              <div className="flex-1 space-y-4 text-lg">
                <div className="flex justify-between text-slate-300">
                  <span>Qtd de Itens:</span><span className="font-bold text-white">{carrinho.reduce((acc, item) => acc + item.quantidade, 0)}</span>
                </div>
              </div>
              <div className="mt-auto pt-6 border-t border-slate-700">
                <div className="flex flex-col mb-8">
                  <span className="text-lg text-slate-400 mb-1">Total a Pagar</span>
                  <span className="text-5xl font-extrabold text-emerald-400">R$ {totalVenda.toFixed(2).replace('.', ',')}</span>
                </div>
                <button onClick={abrirModalPagamento} disabled={carrinho.length === 0} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white py-5 rounded-xl font-extrabold text-2xl transition-colors">
                  PAGAR (F4)
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>

      {/* ✅ MODAL DE PAGAMENTO (NOVO) */}
      {modalPagamentoAberto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex overflow-hidden">
            
            {/* Lado Esquerdo do Pagamento (Formulário) */}
            <div className="w-1/2 p-8 bg-slate-50 border-r border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Formas de Pagamento</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Selecione o Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX'].map(tipo => (
                      <button 
                        key={tipo}
                        onClick={() => setTipoPagamentoAtual(tipo as any)}
                        className={`p-3 rounded-lg font-bold text-sm transition-all border-2 ${tipoPagamentoAtual === tipo ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                      >
                        {tipo.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Valor Recebido (R$)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      step="0.01"
                      value={valorPagamentoAtual} 
                      onChange={e => setValorPagamentoAtual(e.target.value)}
                      className="w-full p-4 text-2xl font-bold rounded-lg border-2 border-slate-300 focus:border-blue-600 outline-none"
                    />
                    <button onClick={adicionarPagamento} className="bg-blue-600 text-white px-6 rounded-lg font-bold hover:bg-blue-700">
                      + ADD
                    </button>
                  </div>
                </div>
              </div>

              {/* Informações Fiscais Opcionais */}
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Dados para Nota (Opcional)</h3>
                <input type="text" placeholder="CPF / CNPJ" value={cpfCnpjCliente} onChange={e => setCpfCnpjCliente(e.target.value)} className="w-full p-3 mb-2 border rounded-lg outline-none focus:border-blue-500" />
                <input type="text" placeholder="Nome do Cliente" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:border-blue-500" />
              </div>
            </div>

            {/* Lado Direito do Pagamento (Resumo) */}
            <div className="w-1/2 p-8 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg text-slate-500 font-bold">Total da Venda</span>
                <span className="text-3xl font-extrabold text-slate-800">R$ {totalVenda.toFixed(2)}</span>
              </div>

              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-y-auto mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Pagamentos Adicionados</h3>
                {pagamentos.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center mt-4">Nenhum pagamento registrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {pagamentos.map((p, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white p-3 rounded border shadow-sm">
                        <div>
                          <span className="font-bold text-slate-700 text-sm">{p.tipo.replace('_', ' ')}</span>
                          {p.troco > 0 && <span className="block text-xs text-orange-500">Troco: R$ {p.troco.toFixed(2)}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600">R$ {p.valor.toFixed(2)}</span>
                          <button onClick={() => removerPagamento(idx)} className="text-red-400 hover:text-red-600">✖</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-slate-500 font-bold">Falta Pagar</span>
                  <span className={`text-2xl font-extrabold ${faltaPagar > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    R$ {faltaPagar.toFixed(2)}
                  </span>
                </div>
                
                {trocoTotal > 0 && (
                  <div className="flex justify-between items-center bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <span className="text-lg text-orange-700 font-bold">Troco ao Cliente</span>
                    <span className="text-3xl font-extrabold text-orange-600">R$ {trocoTotal.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button onClick={() => setModalPagamentoAberto(false)} className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 flex-1">
                    Voltar
                  </button>
                  <button 
                    onClick={confirmarVenda} 
                    disabled={faltaPagar > 0.01 || loading}
                    className="px-6 py-4 rounded-xl font-extrabold text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 flex-[2] transition-colors shadow-lg"
                  >
                    {loading ? 'SALVANDO...' : '✔️ CONCLUIR VENDA'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Consulta F3 (Mantido igual) */}
      {modalConsultaAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">🔍 Consulta de Produtos</h2>
              <button onClick={() => setModalConsultaAberto(false)} className="text-red-500 font-bold text-2xl">&times;</button>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
              <input type="text" autoFocus placeholder="Digite o nome..." value={termoConsulta} onChange={e => realizarConsulta(e.target.value)} className="w-full p-4 border-2 rounded-lg focus:border-blue-500 outline-none text-lg" />
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr><th className="p-3 text-xs font-bold text-slate-600">Produto</th><th className="p-3 text-xs font-bold text-right">Preço</th><th className="p-3 text-xs font-bold text-center">Estoque</th><th className="p-3 text-xs font-bold text-center">Ação</th></tr>
                  </thead>
                  <tbody>
                    {produtosConsulta.map(p => (
                      <tr key={p.id} className="hover:bg-blue-50 border-b">
                        <td className="p-3 font-bold text-slate-800">{p.nome}</td>
                        <td className="p-3 font-bold text-emerald-600 text-right">R$ {Number(p.precoVenda).toFixed(2)}</td>
                        <td className="p-3 text-center font-bold">{p.estoque?.quantidadeAtual || 0}</td>
                        <td className="p-3 text-center"><button onClick={() => { adicionarAoCarrinho(p); setModalConsultaAberto(false); }} className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-xs">+ ADD</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cupom (Mantido igual) */}
      {cupomVisivel && dadosCupom && (
        <div className="print:bg-white print:static print:inset-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm print:w-full print:max-w-none print:p-0 print:shadow-none print:rounded-none">
            <div className="font-mono text-sm text-black mx-auto" style={{ maxWidth: '300px' }}>
              <div className="text-center mb-4">
                <h2 className="font-bold text-xl uppercase">MINHA LOJA INTELIGENTE</h2>
                <p className="mt-2 font-bold border-y border-dashed border-black py-1">CUPOM NÃO FISCAL</p>
                <p className="text-xs mt-1">{dadosCupom.data.toLocaleDateString('pt-BR')} às {dadosCupom.data.toLocaleTimeString('pt-BR')}</p>
              </div>
              <table className="w-full text-left text-xs mb-2">
                <thead className="border-b border-dashed border-black">
                  <tr><th className="pb-1">QTD</th><th className="pb-1">DESCRIÇÃO</th><th className="pb-1 text-right">TOTAL</th></tr>
                </thead>
                <tbody>
                  {dadosCupom.itens.map((item, i) => (
                    <tr key={i}><td className="py-1">{item.quantidade}x</td><td className="py-1 pr-2">{item.nome.substring(0, 15)}</td><td className="py-1 text-right">{(item.quantidade * item.precoVenda).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-dashed border-black pt-2 mb-2">
                <div className="flex justify-between font-bold text-base"><span>TOTAL R$</span><span>{dadosCupom.total.toFixed(2)}</span></div>
              </div>
              <div className="border-t border-dashed border-black pt-2 mb-6">
                <p className="font-bold text-xs mb-1">PAGAMENTOS:</p>
                {dadosCupom.pagamentos.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs"><span>{p.tipo.replace('_', ' ')}</span><span>R$ {p.valor.toFixed(2)}</span></div>
                ))}
              </div>
              <div className="text-center text-xs mt-4 mb-4"><p>Obrigado pela preferência!</p></div>
            </div>
            <div className="mt-6 flex gap-3 print:hidden border-t border-slate-200 pt-4">
              <button onClick={fecharCupom} className="flex-1 py-3 border rounded-lg font-bold">Nova Venda</button>
              <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">🖨️ Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}