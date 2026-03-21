import React, { useState, useEffect } from 'react';
import { api } from '../services/api'; 
import { Layout } from '../components/Layout';

interface Categoria {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  precoCusto: number;
  precoVenda: number;
  categoriaId: string;
  categoria?: { nome: string; };
  codigoBarras: string;
  ean: string;
  unidadeMedida: string;
  ncm: string;
  cest: string;
  cfopPadrao: string;
  origem: number;
  cstCsosn: string;
  aliquotaIcms: number;
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
  cstIpi: string;
  aliquotaIpi: number;
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  
  // Filtro de Busca na Tabela
  const [termoBusca, setTermoBusca] = useState('');

  // Controle do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  // Estados do Formulário (Usando um objeto para ficar mais limpo)
  const estadoInicialForm = {
    nome: '', precoCusto: '', precoVenda: '', categoriaId: '', codigoBarras: '', ean: '',
    unidadeMedida: 'UN', ncm: '', cest: '', cfopPadrao: '', origem: '0', cstCsosn: '',
    aliquotaIcms: '', cstPis: '', aliquotaPis: '', cstCofins: '', aliquotaCofins: '', cstIpi: '', aliquotaIpi: ''
  };
  const [formData, setFormData] = useState<any>(estadoInicialForm);

  const carregarDados = async () => {
    setBuscando(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const url = termoBusca ? `/api/produtos?busca=${encodeURIComponent(termoBusca)}` : '/api/produtos';
      
      const [resProdutos, resCategorias] = await Promise.all([
        api.get(url, { headers }),
        api.get('/categorias', { headers })
      ]);
      
      setProdutos(resProdutos.data);
      setCategorias(resCategorias.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setBuscando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [termoBusca]); // Recarrega se o termo de busca mudar

  const abrirModalNovo = () => {
    setProdutoEditando(null);
    setFormData(estadoInicialForm);
    setModalAberto(true);
  };

  const abrirModalEditar = (produto: Produto) => {
    setProdutoEditando(produto);
    setFormData({
      nome: produto.nome || '',
      precoCusto: produto.precoCusto || '',
      precoVenda: produto.precoVenda || '',
      categoriaId: produto.categoriaId || '',
      codigoBarras: produto.codigoBarras || '',
      ean: produto.ean || '',
      unidadeMedida: produto.unidadeMedida || 'UN',
      ncm: produto.ncm || '',
      cest: produto.cest || '',
      cfopPadrao: produto.cfopPadrao || '',
      origem: produto.origem !== undefined ? String(produto.origem) : '0',
      cstCsosn: produto.cstCsosn || '',
      aliquotaIcms: produto.aliquotaIcms || '',
      cstPis: produto.cstPis || '',
      aliquotaPis: produto.aliquotaPis || '',
      cstCofins: produto.cstCofins || '',
      aliquotaCofins: produto.aliquotaCofins || '',
      cstIpi: produto.cstIpi || '',
      aliquotaIpi: produto.aliquotaIpi || ''
    });
    setModalAberto(true);
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.precoCusto || !formData.precoVenda || !formData.categoriaId) {
      alert("Preencha os campos obrigatórios básicos!");
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const payload = { 
        ...formData,
        precoCusto: parseFloat(formData.precoCusto), 
        precoVenda: parseFloat(formData.precoVenda), 
        origem: parseInt(formData.origem),
        aliquotaIcms: formData.aliquotaIcms ? parseFloat(formData.aliquotaIcms) : 0,
        aliquotaPis: formData.aliquotaPis ? parseFloat(formData.aliquotaPis) : 0,
        aliquotaCofins: formData.aliquotaCofins ? parseFloat(formData.aliquotaCofins) : 0,
        aliquotaIpi: formData.aliquotaIpi ? parseFloat(formData.aliquotaIpi) : 0
      };

      if (produtoEditando) {
        // Rota de Atualização (Precisamos garantir que essa rota exista no backend)
        await api.put(`/produtos/${produtoEditando.id}`, payload, { headers });
        alert("✅ Produto atualizado com sucesso!");
      } else {
        // Rota de Criação
        await api.post('/produtos', payload, { headers });
        alert("✅ Produto cadastrado com sucesso!");
      }
      
      setModalAberto(false);
      carregarDados(); 
    } catch (error: any) {
      console.error("Erro ao salvar produto:", error);
      alert(error.response?.data?.error || "Erro ao salvar produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Gestão de Produtos</h1>
            <p className="text-slate-500 mt-1">Cadastre, edite e gerencie o catálogo e dados fiscais.</p>
          </div>
          <button 
            onClick={abrirModalNovo}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
          >
            <span className="text-xl">+</span> Novo Produto
          </button>
        </div>

        {/* BARRA DE PESQUISA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-3 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por nome ou código de barras..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {buscando && <span className="text-sm text-slate-500 animate-pulse">Buscando...</span>}
        </div>

        {/* TABELA PRINCIPAL */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                  <th className="p-4 font-bold">Produto</th>
                  <th className="p-4 font-bold">Categoria</th>
                  <th className="p-4 font-bold">Cód. Barras</th>
                  <th className="p-4 font-bold text-right">Custo</th>
                  <th className="p-4 font-bold text-right">Venda</th>
                  <th className="p-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr key={produto.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{produto.nome}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded font-medium">
                          {produto.categoria?.nome || 'Sem categoria'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {produto.ean || produto.codigoBarras || '-'}
                      </td>
                      <td className="p-4 text-sm font-bold text-red-600 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.precoCusto)}
                      </td>
                      <td className="p-4 text-sm font-bold text-emerald-600 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.precoVenda)}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => abrirModalEditar(produto)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE CADASTRO/EDIÇÃO */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h2 className="text-xl font-bold text-slate-800">
                  {produtoEditando ? `✏️ Editar: ${produtoEditando.nome}` : '📦 Novo Produto'}
                </h2>
                <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-red-500 font-bold text-2xl">&times;</button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form id="formProduto" onSubmit={handleSalvarProduto} className="space-y-8">
                  
                  {/* DADOS BÁSICOS */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-2">Identificação e Preço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Produto *</label>
                        <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoria *</label>
                        <select value={formData.categoriaId} onChange={e => setFormData({...formData, categoriaId: e.target.value})} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="">Selecione...</option>
                          {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Un. Medida</label>
                        <select value={formData.unidadeMedida} onChange={e => setFormData({...formData, unidadeMedida: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="UN">UN (Unidade)</option>
                          <option value="KG">KG (Quilo)</option>
                          <option value="LT">LT (Litro)</option>
                          <option value="CX">CX (Caixa)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Custo (R$) *</label>
                        <input type="number" step="0.01" value={formData.precoCusto} onChange={e => setFormData({...formData, precoCusto: e.target.value})} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Venda (R$) *</label>
                        <input type="number" step="0.01" value={formData.precoVenda} onChange={e => setFormData({...formData, precoVenda: e.target.value})} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* CÓDIGOS E FISCAL BÁSICO */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b pb-2">Códigos e Fiscal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Cód. Barras (EAN)</label><input type="text" value={formData.ean} onChange={e => setFormData({...formData, ean: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Cód. Interno</label><input type="text" value={formData.codigoBarras} onChange={e => setFormData({...formData, codigoBarras: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">NCM</label><input type="text" value={formData.ncm} onChange={e => setFormData({...formData, ncm: e.target.value})} maxLength={8} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">CEST</label><input type="text" value={formData.cest} onChange={e => setFormData({...formData, cest: e.target.value})} maxLength={7} className="w-full p-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">CFOP Padrão</label><input type="text" value={formData.cfopPadrao} onChange={e => setFormData({...formData, cfopPadrao: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Origem</label>
                        <select value={formData.origem} onChange={e => setFormData({...formData, origem: e.target.value})} className="w-full p-2 border rounded-lg bg-white">
                          <option value="0">0 - Nacional</option>
                          <option value="1">1 - Estrangeira</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* IMPOSTOS ESPECÍFICOS */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase">Tributação Específica</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">CST/CSOSN (ICMS)</label><input type="text" value={formData.cstCsosn} onChange={e => setFormData({...formData, cstCsosn: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                      <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Alíq. ICMS (%)</label><input type="number" step="0.01" value={formData.aliquotaIcms} onChange={e => setFormData({...formData, aliquotaIcms: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                      
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">CST PIS</label><input type="text" value={formData.cstPis} onChange={e => setFormData({...formData, cstPis: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">Alíq. PIS (%)</label><input type="number" step="0.01" value={formData.aliquotaPis} onChange={e => setFormData({...formData, aliquotaPis: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                      
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">CST COFINS</label><input type="text" value={formData.cstCofins} onChange={e => setFormData({...formData, cstCofins: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                      <div><label className="block text-xs font-bold text-slate-600 mb-1">Alíq. COF (%)</label><input type="number" step="0.01" value={formData.aliquotaCofins} onChange={e => setFormData({...formData, aliquotaCofins: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-4">
                <button onClick={() => setModalAberto(false)} className="px-6 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button form="formProduto" type="submit" disabled={loading} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">
                  {loading ? 'Salvando...' : '💾 Salvar Produto'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}