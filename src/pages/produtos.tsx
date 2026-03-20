import { useState, useEffect } from 'react';
// ✅ 1. Importamos a nossa 'api' configurada em vez do axios puro
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
  categoria: { nome: string; };
  codigoBarras: string;
  ean: string;
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  // --- Estados: Dados Básicos ---
  const [nome, setNome] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  
  // --- Estados: Dados Fiscais ---
  const [ean, setEan] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('UN');
  const [ncm, setNcm] = useState('');
  const [cest, setCest] = useState('');
  const [cfopPadrao, setCfopPadrao] = useState('');
  const [origem, setOrigem] = useState('0');
  
  // Impostos
  const [cstCsosn, setCstCsosn] = useState('');
  const [aliquotaIcms, setAliquotaIcms] = useState('');
  const [cstPis, setCstPis] = useState('');
  const [aliquotaPis, setAliquotaPis] = useState('');
  const [cstCofins, setCstCofins] = useState('');
  const [aliquotaCofins, setAliquotaCofins] = useState('');
  const [cstIpi, setCstIpi] = useState('');
  const [aliquotaIpi, setAliquotaIpi] = useState('');

  const [loading, setLoading] = useState(false);

  const carregarDados = async () => {
    try {
      // ✅ 2. Olha como fica limpo! Sem precisar passar URL inteira nem headers
      const [resProdutos, resCategorias] = await Promise.all([
        api.get('/produtos'),
        api.get('/categorias')
      ]);
      
      setProdutos(resProdutos.data);
      setCategorias(resCategorias.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !precoCusto || !precoVenda || !categoriaId) {
      alert("Preencha os campos obrigatórios básicos!");
      return;
    }
    
    setLoading(true);
    try {
      // ✅ 3. Usamos o api.post apenas com o caminho relativo
      await api.post('/produtos', { 
        nome, 
        precoCusto: parseFloat(precoCusto), 
        precoVenda: parseFloat(precoVenda), 
        categoriaId,
        codigoBarras,
        ean,
        unidadeMedida,
        ncm,
        cest,
        cfopPadrao,
        origem: parseInt(origem),
        cstCsosn,
        aliquotaIcms: aliquotaIcms ? parseFloat(aliquotaIcms) : 0,
        cstPis,
        aliquotaPis: aliquotaPis ? parseFloat(aliquotaPis) : 0,
        cstCofins,
        aliquotaCofins: aliquotaCofins ? parseFloat(aliquotaCofins) : 0,
        cstIpi,
        aliquotaIpi: aliquotaIpi ? parseFloat(aliquotaIpi) : 0
      });
      
      // Limpando o formulário
      setNome(''); setPrecoCusto(''); setPrecoVenda(''); setCategoriaId('');
      setCodigoBarras(''); setEan(''); setNcm(''); setCest(''); setCfopPadrao('');
      setCstCsosn(''); setAliquotaIcms(''); setUnidadeMedida('UN'); setOrigem('0');
      setCstPis(''); setAliquotaPis(''); setCstCofins(''); setAliquotaCofins('');
      setCstIpi(''); setAliquotaIpi('');
      
      carregarDados(); 
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      alert("Erro ao criar produto. Verifique se o backend está rodando corretamente.");
    } finally {
      setLoading(false);
    }
  };

 
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Produtos</h1>
        <p className="text-slate-500 mt-1">Cadastre e gerencie o estoque e dados fiscais da sua loja.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LADO ESQUERDO: FORMULÁRIO */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full max-h-[80vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Novo Produto</h2>
            
            <form onSubmit={handleCriarProduto} className="space-y-6">
              
              {/* SESSÃO 1: DADOS BÁSICOS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-2">📦 Dados Básicos</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto *</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Coca-Cola 2L" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Custo (R$) *</label>
                    <input type="number" step="0.01" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} required
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="5.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Venda (R$) *</label>
                    <input type="number" step="0.01" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} required
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="8.50" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
                  <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Selecione...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cód. Interno (Balança/Loja)</label>
                  <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 20001" />
                </div>
              </div>

              {/* SESSÃO 2: DADOS FISCAIS */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b pb-2">🧾 Dados Fiscais (NF-e)</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">EAN (Cód. Barras Oficial)</label>
                  <input type="text" value={ean} onChange={(e) => setEan(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ex: 7891234567890" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">NCM</label>
                    <input type="text" value={ncm} onChange={(e) => setNcm(e.target.value)} maxLength={8}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="8 dígitos" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CEST</label>
                    <input type="text" value={cest} onChange={(e) => setCest(e.target.value)} maxLength={7}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="7 dígitos" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Un. Medida</label>
                    <select value={unidadeMedida} onChange={(e) => setUnidadeMedida(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                      <option value="UN">UN (Unidade)</option>
                      <option value="KG">KG (Quilo)</option>
                      <option value="LT">LT (Litro)</option>
                      <option value="CX">CX (Caixa)</option>
                      <option value="PCT">PCT (Pacote)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Origem</label>
                    <select value={origem} onChange={(e) => setOrigem(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                      <option value="0">0 - Nacional</option>
                      <option value="1">1 - Estrangeira</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CFOP Padrão</label>
                    <input type="text" value={cfopPadrao} onChange={(e) => setCfopPadrao(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: 5102" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CST/CSOSN (ICMS)</label>
                    <input type="text" value={cstCsosn} onChange={(e) => setCstCsosn(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: 102" />
                  </div>
                </div>

                {/* SESSÃO 3: TRIBUTAÇÃO ESPECÍFICA (PIS, COFINS, IPI) - AQUI ESTÁ O QUE FALTAVA! */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 mt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <span>📊 Tributação Específica</span>
                  </h4>
                  
                  {/* ICMS Alíquota */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Alíquota ICMS (%)</label>
                    <input type="number" step="0.01" value={aliquotaIcms} onChange={(e) => setAliquotaIcms(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: 18.00" />
                  </div>

                  {/* PIS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CST PIS</label>
                      <input type="text" value={cstPis} onChange={(e) => setCstPis(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: 01" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Alíq. PIS (%)</label>
                      <input type="number" step="0.01" value={aliquotaPis} onChange={(e) => setAliquotaPis(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="1.65" />
                    </div>
                  </div>

                  {/* COFINS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CST COFINS</label>
                      <input type="text" value={cstCofins} onChange={(e) => setCstCofins(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: 01" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Alíq. COFINS (%)</label>
                      <input type="number" step="0.01" value={aliquotaCofins} onChange={(e) => setAliquotaCofins(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="7.60" />
                    </div>
                  </div>

                  {/* IPI */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CST IPI</label>
                      <input type="text" value={cstIpi} onChange={(e) => setCstIpi(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: 50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Alíq. IPI (%)</label>
                      <input type="number" step="0.01" value={aliquotaIpi} onChange={(e) => setAliquotaIpi(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="5.00" />
                    </div>
                  </div>
                </div>

              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-slate-400 mt-6"
              >
                {loading ? 'Salvando...' : 'Cadastrar Produto Completo'}
              </button>
            </form>
          </div>
        </div>

        {/* LADO DIREITO: TABELA */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Produto</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Categoria</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Custo</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Venda</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">EAN / Cód</th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Nenhum produto cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr key={produto.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-slate-800 font-medium">{produto.nome}</td>
                      <td className="p-4 text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                          {produto.categoria?.nome || 'Sem categoria'}
                        </span>
                      </td>
                      <td className="p-4 text-red-600 font-medium">
                        R$ {Number(produto.precoCusto).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4 text-emerald-600 font-semibold">
                        R$ {Number(produto.precoVenda).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {produto.ean || produto.codigoBarras || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}