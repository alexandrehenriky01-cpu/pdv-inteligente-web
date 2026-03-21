import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api'; 
import { Layout } from '../components/Layout';

interface Produto {
  id: string;
  nome: string;
  precoVenda: number;
  codigoBarras: string;
  ean: string;
  estoque?: { quantidadeAtual: number }; // Adicionado para ler o estoque do backend
}

interface ItemCarrinho extends Produto {
  quantidade: number;
}

export function FrenteCaixa() {
  const [codigoBarras, setCodigoBarras] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ✅ ESTADOS PARA O MODAL DE CONSULTA (F3)
  const [modalConsultaAberto, setModalConsultaAberto] = useState(false);
  const [termoConsulta, setTermoConsulta] = useState('');
  const [produtosConsulta, setProdutosConsulta] = useState<Produto[]>([]);
  const [buscandoConsulta, setBuscandoConsulta] = useState(false);

  // Estados para o Cupom
  const [cupomVisivel, setCupomVisivel] = useState(false);
  const [dadosCupom, setDadosCupom] = useState<{itens: ItemCarrinho[], total: number, data: Date} | null>(null);

  const total = carrinho.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);

  // Foca no input automaticamente ao abrir a tela ou fechar modais
  useEffect(() => {
    if (!modalConsultaAberto && !cupomVisivel) {
      inputRef.current?.focus();
    }
  }, [cupomVisivel, modalConsultaAberto]);

  // ✅ MONITOR DE TECLAS DE ATALHO (F3 para Consulta)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        abrirConsulta();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const buscarProduto = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarras.trim() !== '') {
      try {
        setLoading(true);
        const response = await api.get(`/api/produtos?busca=${encodeURIComponent(codigoBarras)}`);
        
        const produtoExato = response.data.find((p: Produto) => 
          p.codigoBarras === codigoBarras || p.ean === codigoBarras
        );
        
        if (produtoExato) {
          adicionarAoCarrinho(produtoExato);
          setCodigoBarras('');
        } else {
          alert('Produto não encontrado!');
        }
      } catch (error) {
        console.error("Erro ao buscar produto:", error);
        alert('Erro ao comunicar com o servidor.');
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
        return prev.map(item => 
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
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

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;
    
    setLoading(true);
    try {
      const itensVenda = carrinho.map(item => ({
        produtoId: item.id,
        quantidade: item.quantidade,
        precoUnitario: item.precoVenda
      }));

      await api.post('/vendas', {
        itens: itensVenda,
        formaPagamento: 'DINHEIRO'
      });

      setDadosCupom({
        itens: [...carrinho],
        total: total,
        data: new Date()
      });
      
      setCupomVisivel(true);
      
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert("Erro ao finalizar a venda. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  const imprimirCupom = () => window.print();

  const fecharCupom = () => {
    setCupomVisivel(false);
    setDadosCupom(null);
    setCarrinho([]);
    setCodigoBarras('');
  };

  // ✅ FUNÇÕES DA TELA DE CONSULTA
  const abrirConsulta = () => {
    setModalConsultaAberto(true);
    setTermoConsulta('');
    setProdutosConsulta([]);
  };

  const fecharConsulta = () => {
    setModalConsultaAberto(false);
  };

  const realizarConsulta = async (termo: string) => {
    setTermoConsulta(termo);
    if (!termo || termo.length < 2) {
      setProdutosConsulta([]);
      return;
    }

    setBuscandoConsulta(true);
    try {
      const response = await api.get(`/api/produtos?busca=${encodeURIComponent(termo)}`);
      setProdutosConsulta(response.data);
    } catch (error) {
      console.error("Erro na consulta", error);
    } finally {
      setBuscandoConsulta(false);
    }
  };

  const selecionarDaConsulta = (produto: Produto) => {
    adicionarAoCarrinho(produto);
    fecharConsulta();
  };

  return (
    <>
      <Layout>
        <div className="print:hidden h-full flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">Frente de Caixa (PDV)</h1>
              <p className="text-slate-500">Passe o leitor de código de barras ou digite o código.</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* ✅ BOTÃO DE CONSULTA */}
              <button 
                onClick={abrirConsulta}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <span>🔍</span> Consultar Produto (F3)
              </button>

              <div className="text-4xl font-bold text-emerald-600 bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-200 shadow-sm">
                R$ {total.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            
            {/* Coluna Esquerda: Leitor e Lista */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input
                  type="text"
                  ref={inputRef}
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  onKeyDown={buscarProduto}
                  disabled={loading}
                  placeholder="Bipe o código de barras e aperte Enter..."
                  className="w-full px-4 py-4 text-2xl font-mono rounded-lg border-2 border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 outline-none transition-all"
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col h-[500px]">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left relative">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-4 text-xs uppercase tracking-wider text-slate-600 font-bold">Produto</th>
                        <th className="p-4 text-xs uppercase tracking-wider text-slate-600 font-bold text-center">Qtd</th>
                        <th className="p-4 text-xs uppercase tracking-wider text-slate-600 font-bold text-right">Unitário</th>
                        <th className="p-4 text-xs uppercase tracking-wider text-slate-600 font-bold text-right">Subtotal</th>
                        <th className="p-4 text-xs uppercase tracking-wider text-slate-600 font-bold text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {carrinho.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                            🛒 O carrinho está vazio. Bipe um produto para começar.
                          </td>
                        </tr>
                      ) : (
                        carrinho.map((item) => (
                          <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{item.nome}</td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => alterarQuantidade(item.id, -1)} className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700">-</button>
                                <span className="font-bold w-8 text-center">{item.quantidade}</span>
                                <button onClick={() => alterarQuantidade(item.id, 1)} className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700">+</button>
                              </div>
                            </td>
                            <td className="p-4 text-right text-slate-600">R$ {Number(item.precoVenda).toFixed(2)}</td>
                            <td className="p-4 text-right font-bold text-emerald-600 text-lg">
                              R$ {(item.quantidade * item.precoVenda).toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              <button onClick={() => removerDoCarrinho(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors">
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

            {/* Coluna Direita: Resumo e Pagamento */}
            <div className="bg-slate-900 text-white p-8 rounded-xl shadow-xl flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-slate-100 border-b border-slate-700 pb-4">Resumo da Venda</h2>
              
              <div className="flex-1 space-y-4 text-lg">
                <div className="flex justify-between text-slate-300">
                  <span>Qtd de Itens:</span>
                  <span className="font-bold text-white">{carrinho.reduce((acc, item) => acc + item.quantidade, 0)}</span>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-700">
                <div className="flex flex-col mb-8">
                  <span className="text-lg text-slate-400 mb-1">Total a Pagar</span>
                  <span className="text-5xl font-extrabold text-emerald-400">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button
                  onClick={finalizarVenda}
                  disabled={carrinho.length === 0 || loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white py-5 rounded-xl font-extrabold text-2xl transition-colors shadow-lg shadow-emerald-500/30 active:scale-95"
                >
                  {loading ? 'PROCESSANDO...' : 'FINALIZAR VENDA (F4)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>

      {/* ✅ MODAL DE CONSULTA DE PRODUTOS E ESTOQUE */}
      {modalConsultaAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>🔍</span> Consulta de Produtos e Estoque
              </h2>
              <button onClick={fecharConsulta} className="text-slate-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>

            <div className="p-6 flex-1 flex flex-col overflow-hidden gap-4">
              <div className="relative">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Digite o nome ou código de barras..." 
                  value={termoConsulta}
                  onChange={(e) => realizarConsulta(e.target.value)}
                  className="w-full p-4 pl-12 border-2 border-blue-200 rounded-lg focus:border-blue-500 outline-none text-lg"
                />
                <span className="absolute left-4 top-4 text-xl">🔍</span>
                {buscandoConsulta && <span className="absolute right-4 top-4 text-slate-400 animate-pulse">Buscando...</span>}
              </div>

              <div className="flex-1 overflow-y-auto border rounded-lg">
                {produtosConsulta.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {termoConsulta.length > 1 ? 'Nenhum produto encontrado.' : 'Digite pelo menos 2 letras para buscar.'}
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="p-3 text-xs font-bold text-slate-600 uppercase">Produto</th>
                        <th className="p-3 text-xs font-bold text-slate-600 uppercase">Cód. Barras</th>
                        <th className="p-3 text-xs font-bold text-slate-600 uppercase text-right">Preço</th>
                        <th className="p-3 text-xs font-bold text-slate-600 uppercase text-center">Estoque</th>
                        <th className="p-3 text-xs font-bold text-slate-600 uppercase text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {produtosConsulta.map(p => {
                        const qtdEstoque = p.estoque?.quantidadeAtual || 0;
                        const estoqueBaixo = qtdEstoque <= 0;
                        
                        return (
                          <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{p.nome}</td>
                            <td className="p-3 text-sm text-slate-500">{p.ean || p.codigoBarras || '-'}</td>
                            <td className="p-3 text-sm font-bold text-emerald-600 text-right">
                              R$ {Number(p.precoVenda).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${estoqueBaixo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {qtdEstoque} un
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => selecionarDaConsulta(p)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold text-xs transition-colors"
                              >
                                + Adicionar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl text-center text-sm text-slate-500">
              Pressione <kbd className="bg-white border border-slate-300 px-2 py-1 rounded font-mono text-xs">ESC</kbd> para fechar
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO CUPOM */}
      {cupomVisivel && dadosCupom && (
        <div className="print:bg-white print:static print:inset-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm print:w-full print:max-w-none print:p-0 print:shadow-none print:rounded-none">
            <div className="font-mono text-sm text-black mx-auto" style={{ maxWidth: '300px' }}>
              <div className="text-center mb-4">
                <h2 className="font-bold text-xl uppercase">MINHA LOJA INTELIGENTE</h2>
                <p className="text-xs">CNPJ: 00.000.000/0001-00</p>
                <p className="mt-2 font-bold border-y border-dashed border-black py-1">CUPOM NÃO FISCAL</p>
                <p className="text-xs mt-1">{dadosCupom.data.toLocaleDateString('pt-BR')} às {dadosCupom.data.toLocaleTimeString('pt-BR')}</p>
              </div>
              <table className="w-full text-left text-xs mb-4">
                <thead className="border-b border-dashed border-black">
                  <tr>
                    <th className="pb-1">QTD</th>
                    <th className="pb-1">DESCRIÇÃO</th>
                    <th className="pb-1 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {dadosCupom.itens.map((item, index) => (
                    <tr key={index}>
                      <td className="py-1">{item.quantidade}x</td>
                      <td className="py-1 pr-2">{item.nome.substring(0, 18)}</td>
                      <td className="py-1 text-right">{(item.quantidade * item.precoVenda).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-dashed border-black pt-2 mb-6">
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL R$</span>
                  <span>{dadosCupom.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              <div className="text-center text-xs mt-8 mb-4">
                <p>Obrigado pela preferência!</p>
                <p>Volte Sempre</p>
                <p className="mt-4 text-[10px] text-gray-500">Gerado por PDV Inteligente</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3 print:hidden border-t border-slate-200 pt-4">
              <button onClick={fecharCupom} className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-bold transition-colors">Nova Venda</button>
              <button onClick={imprimirCupom} className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-md flex items-center justify-center gap-2"><span>🖨️</span> Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}