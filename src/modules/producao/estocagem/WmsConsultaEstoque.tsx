import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import { 
  Search, Map, Package, Layers, MapPin, 
  Loader2, Filter, Download, ArrowRightLeft 
} from 'lucide-react';

// Tipagens baseadas no nosso Backend
interface EstoqueWMS {
  id: number;
  quantidadePecas: number;
  pesoAtual: number;
  dataEntrada: string;
  produto: {
    codigo: string;
    nome: string;
  };
  lote: {
    codigoLote: string;
    dataProducao: string;
    validade: string;
  };
  endereco: {
    codigo: string;
    rua: string;
    posicao: string;
    nivel: string;
    area: {
      nome: string;
    };
  };
}

export function WmsConsultaEstoque() {
  const [estoque, setEstoque] = useState<EstoqueWMS[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [filtroLote, setFiltroLote] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroEndereco, setFiltroEndereco] = useState('');

  // Carregar dados iniciais (opcional, pode vir vazio e exigir busca)
  useEffect(() => {
    buscarEstoque();
  }, []);

  const buscarEstoque = async () => {
    setLoading(true);
    try {
      // Monta a query string com os filtros preenchidos
      const params = new URLSearchParams();
      if (filtroLote) params.append('lote', filtroLote);
      if (filtroProduto) params.append('produto', filtroProduto);
      if (filtroEndereco) params.append('endereco', filtroEndereco);

      const response = await api.get(`/api/wms/estoque?${params.toString()}`);
      setEstoque(response.data);
    } catch (error) {
      toast.error("Erro ao buscar estoque do WMS.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    buscarEstoque();
  };

  const limparFiltros = () => {
    setFiltroLote('');
    setFiltroProduto('');
    setFiltroEndereco('');
    // buscarEstoque() é chamado no useEffect se você quiser recarregar tudo ao limpar
  };

  // Cálculos de Totais
  const totalPeso = estoque.reduce((acc, item) => acc + Number(item.pesoAtual), 0);
  const totalPaletes = estoque.reduce((acc, item) => acc + item.quantidadePecas, 0);

  const inputClass = 'w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600';

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">
        
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-6 rounded-[30px] border border-white/10 bg-[#08101f] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:flex-row sm:items-center sm:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300 mb-3">
              <Map className="h-3.5 w-3.5" /> Mapa de Estoque
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Consulta WMS</h1>
            <p className="text-slate-400 mt-2 font-medium">Rastreabilidade total de lotes e localizações no armazém.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#0b1324] border border-white/10 rounded-2xl p-4 text-center min-w-[120px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Paletes/Peças</span>
              <span className="text-2xl font-black text-white font-mono">{totalPaletes}</span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-center min-w-[140px]">
              <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Peso Total (KG)</span>
              <span className="text-2xl font-black text-white font-mono">{totalPeso.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[24px] border border-white/10 p-6 shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
          <form onSubmit={handleBuscar} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Código do Lote</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" value={filtroLote} onChange={e => setFiltroLote(e.target.value)} className={`${inputClass} pl-10`} placeholder="Ex: IN-2026..." />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Produto (Nome ou Cód)</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} className={`${inputClass} pl-10`} placeholder="Buscar produto..." />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Endereço / Posição</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" value={filtroEndereco} onChange={e => setFiltroEndereco(e.target.value)} className={`${inputClass} pl-10 uppercase`} placeholder="Ex: CF1-RA-P01" />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={limparFiltros} className="p-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="Limpar Filtros">
                <Filter className="w-5 h-5" />
              </button>
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* TABELA DE RESULTADOS */}
        <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Endereço WMS</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Produto</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Lote / Validade</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Qtd/Peso</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                      Buscando informações no armazém...
                    </td>
                  </tr>
                ) : estoque.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      Nenhum registro encontrado com estes filtros.
                    </td>
                  </tr>
                ) : (
                  estoque.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-white font-black font-mono text-lg">{item.endereco.codigo}</span>
                          <span className="text-xs text-slate-500 font-bold">{item.endereco.area.nome}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-slate-300 font-bold">{item.produto.nome}</span>
                          <span className="text-xs text-slate-500 font-mono">Cód: {item.produto.codigo}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded w-fit border border-emerald-500/20">
                            {item.lote.codigoLote}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">Val: {new Date(item.lote.validade).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-white font-black font-mono text-lg">{Number(item.pesoAtual).toFixed(3)} <span className="text-sm text-slate-500">KG</span></span>
                          <span className="text-xs text-slate-400 bg-[#0b1324] px-2 py-0.5 rounded border border-white/5 mt-1">{item.quantidadePecas} {item.quantidadePecas === 1 ? 'Palete' : 'Peças'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button className="p-2 bg-white/5 hover:bg-blue-600 hover:text-white text-slate-400 rounded-lg transition-colors" title="Transferir Endereço">
                          <ArrowRightLeft  className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* FOOTER DA TABELA */}
          {!loading && estoque.length > 0 && (
            <div className="bg-[#0b1324] border-t border-white/10 p-4 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">Mostrando {estoque.length} registros</span>
              <button className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                <Download className="w-4 h-4" /> Exportar Relatório
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}