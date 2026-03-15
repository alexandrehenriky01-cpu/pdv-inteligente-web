import { useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';

interface Produto {
  id: string;
  nome: string;
  precoVenda: number;
  codigoBarras: string;
}

interface ItemCarrinho extends Produto {
  quantidade: number;
}

export function FrenteCaixa() {
  const [codigoBarras, setCodigoBarras] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para o Cupom
  const [cupomVisivel, setCupomVisivel] = useState(false);
  const [dadosCupom, setDadosCupom] = useState<{itens: ItemCarrinho[], total: number, data: Date} | null>(null);

  const total = carrinho.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);

  const buscarProduto = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarras.trim() !== '') {
      try {
        const token = localStorage.getItem('@PDVToken');
        const response = await axios.get('http://localhost:3333/produtos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const produto = response.data.find((p: Produto) => p.codigoBarras === codigoBarras);
        
        if (produto) {
          adicionarAoCarrinho(produto);
          setCodigoBarras('');
        } else {
          alert('Produto não encontrado!');
        }
      } catch (error) {
        console.error("Erro ao buscar produto:", error);
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
      return [...prev, { ...produto, quantidade: 1 }];
    });
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(prev => prev.filter(item => item.id !== id));
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      const itensVenda = carrinho.map(item => ({
        produtoId: item.id,
        quantidade: item.quantidade,
        precoUnitario: item.precoVenda
      }));

      await axios.post('http://localhost:3333/vendas', {
        itens: itensVenda,
        formaPagamento: 'DINHEIRO'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Venda Sucesso! Prepara os dados para o Cupom
      setDadosCupom({
        itens: [...carrinho],
        total: total,
        data: new Date()
      });
      
      setCupomVisivel(true); // Abre o modal do cupom
      
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert("Erro ao finalizar a venda.");
    } finally {
      setLoading(false);
    }
  };

  const imprimirCupom = () => {
    window.print();
  };

  const fecharCupom = () => {
    setCupomVisivel(false);
    setDadosCupom(null);
    setCarrinho([]); // 👈 Limpa o carrinho
    setCodigoBarras(''); // 👈 Limpa o input para o próximo cliente
  };

  return (
    <>
      <Layout>
        <div className="print:hidden">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Frente de Caixa (PDV)</h1>
              <p className="text-slate-500">Passe o leitor de código de barras ou digite o código.</p>
            </div>
            <div className="text-4xl font-bold text-emerald-600 bg-emerald-50 px-6 py-2 rounded-xl border border-emerald-200">
              R$ {total.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Esquerda: Leitor e Lista */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">Código de Barras</label>
                <input
                  type="text"
                  autoFocus
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  onKeyDown={buscarProduto}
                  placeholder="Bipe o produto e aperte Enter..."
                  className="w-full px-4 py-4 text-xl rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-[400px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-slate-600 font-semibold">Produto</th>
                      <th className="p-4 text-slate-600 font-semibold text-center">Qtd</th>
                      <th className="p-4 text-slate-600 font-semibold text-right">Unitário</th>
                      <th className="p-4 text-slate-600 font-semibold text-right">Subtotal</th>
                      <th className="p-4 text-slate-600 font-semibold text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrinho.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          O carrinho está vazio. Bipe um produto para começar.
                        </td>
                      </tr>
                    ) : (
                      carrinho.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-800">{item.nome}</td>
                          <td className="p-4 text-center">{item.quantidade}</td>
                          <td className="p-4 text-right">R$ {Number(item.precoVenda).toFixed(2)}</td>
                          <td className="p-4 text-right font-bold text-slate-700">
                            R$ {(item.quantidade * item.precoVenda).toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => removerDoCarrinho(item.id)}
                              className="text-red-500 hover:text-red-700 font-bold p-2"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Coluna Direita: Resumo e Pagamento */}
            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg flex flex-col">
              <h2 className="text-xl font-bold mb-6 text-slate-200 border-b border-slate-700 pb-4">Resumo da Venda</h2>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between text-slate-300">
                  <span>Total de Itens:</span>
                  <span className="font-bold">{carrinho.reduce((acc, item) => acc + item.quantidade, 0)}</span>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-700">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-xl text-slate-300">Total a Pagar</span>
                  <span className="text-4xl font-bold text-emerald-400">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button
                  onClick={finalizarVenda}
                  disabled={carrinho.length === 0 || loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white py-4 rounded-xl font-bold text-xl transition-colors shadow-lg"
                >
                  {loading ? 'Processando...' : 'FINALIZAR VENDA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>

      {/* 
          MODAL DO CUPOM 
      */}
      {cupomVisivel && dadosCupom && (
        <div 
          className="print:bg-white print:static print:inset-auto"
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}
        >
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm print:w-full print:max-w-none print:p-0 print:shadow-none print:rounded-none">
            
            <div className="font-mono text-sm text-black mx-auto" style={{ maxWidth: '300px' }}>
              <div className="text-center mb-4">
                <h2 className="font-bold text-xl uppercase">MINHA LOJA INTELIGENTE</h2>
                <p className="text-xs">CNPJ: 00.000.000/0001-00</p>
                <p className="text-xs">Rua do Comércio, 123 - Centro</p>
                <p className="mt-2 font-bold border-y border-dashed border-black py-1">
                  CUPOM NÃO FISCAL
                </p>
                <p className="text-xs mt-1">
                  {dadosCupom.data.toLocaleDateString('pt-BR')} às {dadosCupom.data.toLocaleTimeString('pt-BR')}
                </p>
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
              <button
                onClick={fecharCupom}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-bold transition-colors"
              >
                Nova Venda
              </button>
              <button
                onClick={imprimirCupom}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>🖨️</span> Imprimir
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}