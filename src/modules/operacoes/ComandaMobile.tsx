import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { 
  UtensilsCrossed, Search, Plus, Minus, ShoppingCart, 
  ArrowLeft, Check, Coffee, Pizza, Loader2, MessageSquareText, X
} from 'lucide-react';
import { AxiosError } from 'axios';

interface IProduto {
  id: string;
  nome: string;
  codigo?: string; // 🚀 ADICIONADO: Novo Código Curto
  precoVenda: number;
  categoria: { nome: string };
}

interface IItemComanda extends IProduto {
  cartId: string; // Identificador único no carrinho (para permitir o mesmo produto com obs diferentes)
  quantidade: number;
  subtotal: number;
  observacao?: string;
}

export function ComandaMobile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Estados da Comanda
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null);
  const [produtos, setProdutos] = useState<IProduto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<IItemComanda[]>([]);

  // Estados do Modal de Observação
  const [produtoParaObs, setProdutoParaObs] = useState<IProduto | null>(null);
  const [textoObs, setTextoObs] = useState('');

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/produtos');
      setProdutos(response.data);
      const cats = Array.from(new Set(response.data.map((p: any) => p.categoria?.nome || 'Geral'))) as string[];
      setCategorias(['Todas', ...cats]);
    } catch (error) {
      console.error("Erro ao carregar produtos", error);
    } finally {
      setLoading(false);
    }
  };

  // Abre o modal de observação em vez de adicionar direto
  const abrirModalObs = (produto: IProduto) => {
    setProdutoParaObs(produto);
    setTextoObs('');
  };

  // Adiciona o item ao carrinho (com ou sem observação)
  const confirmarAdicao = () => {
    if (!produtoParaObs) return;

    setCarrinho(prev => {
      // Se tiver observação, tratamos como um item separado no carrinho
      const cartId = textoObs.trim() ? `${produtoParaObs.id}-${Date.now()}` : produtoParaObs.id;
      
      const index = prev.findIndex(item => item.cartId === cartId);
      if (index >= 0) {
        const novaLista = [...prev];
        novaLista[index].quantidade += 1;
        novaLista[index].subtotal = novaLista[index].quantidade * novaLista[index].precoVenda;
        return novaLista;
      }
      return [...prev, { 
        ...produtoParaObs, 
        cartId, 
        quantidade: 1, 
        subtotal: Number(produtoParaObs.precoVenda),
        observacao: textoObs.trim() || undefined
      }];
    });

    setProdutoParaObs(null);
    setTextoObs('');
  };

  // Adição rápida (sem observação)
  const adicaoRapida = (produto: IProduto) => {
    setProdutoParaObs(produto);
    setTextoObs('');
    setTimeout(confirmarAdicao, 0); // Força a execução no próximo ciclo com obs vazia
  };

  const alterarQuantidade = (cartId: string, delta: number) => {
    setCarrinho(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const novaQtd = Math.max(0, item.quantidade + delta);
        return { ...item, quantidade: novaQtd, subtotal: novaQtd * item.precoVenda };
      }
      return item;
    }).filter(item => item.quantidade > 0));
  };

  const totalComanda = carrinho.reduce((acc, item) => acc + item.subtotal, 0);

  const enviarPedidoCozinha = async () => {
    if (!mesaSelecionada || carrinho.length === 0) return;
    setSalvando(true);

    try {
      const response = await api.post(`/api/mesas/${mesaSelecionada}/adicionar`, { itens: carrinho });
      
      alert(`✅ Pedido enviado para a Mesa ${mesaSelecionada}!`);
      
      // 🚀 MÁGICA DA IMPRESSÃO INVISÍVEL
      if (response.data.ticketHtml) {
        // Cria um iframe invisível na tela
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        // Escreve o HTML do ticket dentro do iframe
        iframe.contentWindow?.document.open();
        iframe.contentWindow?.document.write(response.data.ticketHtml);
        iframe.contentWindow?.document.close();
        
        // Manda o comando de imprimir pro navegador/celular
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Remove o iframe depois de imprimir
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }

      setCarrinho([]);
      setMesaSelecionada(null);
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(`❌ Erro ao enviar: ${error.response?.data?.error || 'Tente novamente.'}`);
    } finally {
      setSalvando(false);
    }
  };

  // 🚀 ATUALIZADO: Agora filtra também pelo código curto
  const produtosFiltrados = produtos.filter(p => {
    const matchCategoria = categoriaAtiva === 'Todas' || (p.categoria?.nome || 'Geral') === categoriaAtiva;
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || 
                       p.codigo?.includes(busca); // Permite buscar pelo código curto
    return matchCategoria && matchBusca;
  });

  if (!mesaSelecionada) {
    return (
      <div className="min-h-screen bg-[#060816] text-slate-100 p-4 pb-20">
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-full text-slate-300 border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Comanda Digital</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Selecione a Mesa</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setMesaSelecionada(num)}
              className="aspect-square bg-[#08101f] border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform hover:bg-white/5"
            >
              <UtensilsCrossed className="w-6 h-6 text-violet-300 mb-1" />
              <span className="text-2xl font-black text-white">{num}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060816] text-slate-100 flex flex-col">
      {/* Header Fixo */}
      <div className="bg-[#0b1324]/95 border-b border-white/10 p-4 sticky top-0 z-10 flex items-center justify-between shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setMesaSelecionada(null)} className="p-2 bg-slate-800 rounded-full text-slate-400 active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">Comanda Intelligence</div>
            <h1 className="text-lg font-black text-white leading-tight">Mesa {mesaSelecionada}</h1>
            <p className="text-[10px] text-violet-300 font-bold uppercase tracking-[0.18em]">Lançando Pedido</p>
          </div>
        </div>
        <div className="bg-violet-500/10 text-violet-300 px-3 py-1 rounded-full font-black text-sm border border-violet-500/20">
          R$ {totalComanda.toFixed(2)}
        </div>
      </div>

      {/* Busca e Categorias */}
      <div className="p-4 space-y-3 bg-[#08101f]/70 shrink-0 border-b border-white/10">
        <div className="relative">
          <Search className="w-4 h-4 text-violet-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou código..." // 🚀 ATUALIZADO
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#0b1324] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                categoriaAtiva === cat 
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' 
                  : 'bg-[#0b1324] text-slate-400 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Produtos Misturada com Itens do Carrinho */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-violet-300" /></div>
        ) : (
          produtosFiltrados.map(produto => {
            // Pega todas as instâncias desse produto no carrinho (pode ter várias com obs diferentes)
            const itensNoCarrinho = carrinho.filter(i => i.id === produto.id);
            const qtdTotal = itensNoCarrinho.reduce((acc, item) => acc + item.quantidade, 0);

            return (
              <div key={produto.id} className="bg-[#08101f] border border-white/10 rounded-2xl p-3 flex flex-col gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#0b1324] rounded-xl flex items-center justify-center shrink-0 border border-white/10">
                    {produto.categoria?.nome?.toLowerCase().includes('bebida') ? <Coffee className="w-5 h-5 text-violet-300" /> : <Pizza className="w-5 h-5 text-amber-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {/* 🚀 EXIBE O CÓDIGO CURTO AO LADO DO NOME */}
                      {produto.codigo ? <span className="text-violet-400 font-mono mr-1">[{produto.codigo}]</span> : ''}
                      {produto.nome}
                    </h3>
                    <p className="text-xs font-black text-emerald-300">R$ {Number(produto.precoVenda).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Botão de Observação */}
                    <button 
                      onClick={() => abrirModalObs(produto)}
                      className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-300 border border-white/10 active:scale-95"
                    >
                      <MessageSquareText className="w-4 h-4" />
                    </button>
                    
                    {/* Adição Rápida */}
                    <button 
                      onClick={() => adicaoRapida(produto)}
                      className="w-10 h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white active:scale-95 shadow-lg shadow-violet-500/30"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Exibe as variações do produto que estão no carrinho logo abaixo dele */}
                {itensNoCarrinho.map(itemCart => (
                  <div key={itemCart.cartId} className="ml-15 mt-2 bg-[#0b1324]/70 border border-white/10 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs text-slate-300 italic truncate">
                        {itemCart.observacao ? `📝 ${itemCart.observacao}` : 'Sem observações'}
                      </p>
                    </div>
                    <div className="flex items-center bg-[#08101f] rounded-full border border-violet-500/20 overflow-hidden shrink-0">
                      <button onClick={() => alterarQuantidade(itemCart.cartId, -1)} className="w-8 h-8 flex items-center justify-center text-slate-300 active:bg-white/5"><Minus className="w-3 h-3" /></button>
                      <span className="w-6 text-center text-xs font-bold text-white">{itemCart.quantidade}</span>
                      <button onClick={() => alterarQuantidade(itemCart.cartId, 1)} className="w-8 h-8 flex items-center justify-center text-violet-300 active:bg-white/5"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE OBSERVAÇÃO */}
      {produtoParaObs && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020617]/80 backdrop-blur-sm sm:items-center p-4">
          <div className="bg-[#08101f] border border-white/10 w-full max-w-md rounded-[30px] p-5 animate-in slide-in-from-bottom-10 sm:zoom-in-95 shadow-[0_25px_80px_rgba(0,0,0,0.60)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-white">Adicionais e Observações</h2>
              <button onClick={() => setProdutoParaObs(null)} className="p-2 text-slate-300 hover:text-white bg-white/5 border border-white/10 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <p className="text-sm text-violet-300 font-bold mb-3">{produtoParaObs.nome}</p>
            
            <textarea 
              rows={3}
              placeholder="Ex: Sem cebola, Ponto da carne bem passado..."
              value={textoObs}
              onChange={e => setTextoObs(e.target.value)}
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none resize-none mb-4"
              autoFocus
            />

            <button 
              onClick={confirmarAdicao}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-black shadow-[0_0_20px_rgba(139,92,246,0.30)] active:scale-95 transition-transform"
            >
              CONFIRMAR E ADICIONAR
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar: Botão de Enviar Pedido */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0b1324]/95 backdrop-blur-xl border-t border-white/10 animate-in slide-in-from-bottom-5">
          <button 
            onClick={enviarPedidoCozinha}
            disabled={salvando}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.30)] active:scale-95 transition-transform disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
            {salvando ? 'ENVIANDO...' : `ENVIAR PEDIDO (R$ ${totalComanda.toFixed(2)})`}
          </button>
        </div>
      )}
    </div>
  );
}