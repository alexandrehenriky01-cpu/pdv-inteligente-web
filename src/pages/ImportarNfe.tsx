import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router-dom';

export function ImportarNfe() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  const [cfopsDisponiveis, setCfopsDisponiveis] = useState<any[]>([]);
  const [selectedCfopId, setSelectedCfopId] = useState('');

  // ESTADOS PARA O MODAL DE PESQUISA (F2)
  const [produtosPesquisa, setProdutosPesquisa] = useState<any[]>([]);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);
  const [modalPesquisa, setModalPesquisa] = useState<{isOpen: boolean, itemIndex: number | null}>({ isOpen: false, itemIndex: null });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Carrega apenas os CFOPs ao abrir a tela
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        const token = localStorage.getItem('@PDVToken');
        const resCfop = await api.get('/api/cfop', { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        setCfopsDisponiveis(resCfop.data.filter((c: any) => c.tipoOperacao === 'ENTRADA'));
      } catch (error) {
        console.error("Erro ao carregar CFOPs", error);
      }
    };
    carregarDadosIniciais();
  }, []);

  // Monitora a tecla F2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && previewData && !modalPesquisa.isOpen) {
        alert("Clique no botão 🔍 'Buscar (F2)' na linha do produto que deseja vincular.");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData, modalPesquisa.isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const handleProcessarXml = async () => {
    if (!file) return alert("Selecione um XML.");
    const formData = new FormData();
    formData.append('arquivo', file);
    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      const response = await api.post('/api/nfe/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      });
      setPreviewData(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao processar o XML.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarEntrada = async () => {
    if (!previewData) return;
    if (!selectedCfopId) return alert("⚠️ Selecione uma Operação Fiscal (CFOP).");
    
    setSalvando(true);
    try {
      const token = localStorage.getItem('@PDVToken'); 
      const payload = { ...previewData, cfopId: selectedCfopId };

      const response = await api.post('/api/nfe/salvar', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      alert(`✅ ${response.data.message}`);
      navigate('/notas-fiscais');
      
    } catch (error: any) {
      alert("Erro ao salvar: " + (error.response?.data?.error || error.message));
    } finally {
      setSalvando(false);
    }
  };

  // ✅ FUNÇÕES DO MODAL COM BUSCA DIRETO NO BANCO DE DADOS (LIKE)
  const abrirModalPesquisa = (index: number) => {
    setModalPesquisa({ isOpen: true, itemIndex: index });
    const nomeOriginal = previewData.itens[index].descricaoOriginal;
    // Pega as primeiras palavras para sugerir uma busca
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
      const token = localStorage.getItem('@PDVToken');
      // Passa o termo de busca na URL para o Backend fazer o LIKE
      const response = await api.get(`/api/produtos?busca=${encodeURIComponent(termo)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProdutosPesquisa(response.data);
    } catch (error) {
      console.error("Erro ao buscar produtos", error);
    } finally {
      setBuscandoProdutos(false);
    }
  };

  const selecionarProduto = (produto: any | null) => {
    if (modalPesquisa.itemIndex === null) return;
    
    const novosItens = [...previewData.itens];
    novosItens[modalPesquisa.itemIndex].produtoIdSelecionado = produto ? produto.id : null;
    novosItens[modalPesquisa.itemIndex].produtoNomeSelecionado = produto ? produto.nome : '';
    
    setPreviewData({ ...previewData, itens: novosItens });
    setModalPesquisa({ isOpen: false, itemIndex: null });
    setTermoPesquisa('');
    setProdutosPesquisa([]);
  };

  const cfopSelecionado = cfopsDisponiveis.find(c => c.id === selectedCfopId);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 relative">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800">Entrada de Documento Fiscal</h1>
          <p className="text-slate-500 mt-1">Importe o XML, vincule produtos e aplique regras fiscais.</p>
        </div>

        {!previewData && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 bg-blue-50/50 hover:bg-blue-50 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-slate-700">Clique para selecionar o XML</h3>
              <input type="file" accept=".xml" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              {file && <p className="mt-4 text-emerald-600 font-bold">✅ {file.name}</p>}
            </div>

            {file && (
              <div className="mt-6 flex justify-end">
                <button onClick={handleProcessarXml} disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
                  {loading ? 'Lendo XML...' : 'Processar Nota'}
                </button>
              </div>
            )}
          </div>
        )}

        {previewData && (
          <div className="space-y-6">
            
            {/* PARAMETRIZAÇÃO CFOP */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
              <h3 className="text-sm font-bold text-purple-600 uppercase mb-4">⚙️ Parametrização</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Chave de Acesso</label>
                  <input type="text" readOnly value={previewData.documento.chaveAcesso.substring(0, 15) + '...'} className="w-full p-3 border rounded-lg bg-slate-100 text-slate-500 text-sm font-mono outline-none" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Operação (CFOP) *</label>
                  <select value={selectedCfopId} onChange={(e) => setSelectedCfopId(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 font-medium">
                    <option value="">-- Escolha como processar esta nota --</option>
                    {cfopsDisponiveis.map(cfop => (
                      <option key={cfop.id} value={cfop.id}>{cfop.codigo} - {cfop.descricao}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TABELA DE ITENS COM VÍNCULO */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase">📦 Itens da Nota e Vínculo com Estoque</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-xs text-slate-500 uppercase border-b">
                      <th className="p-3">Produto na Nota (XML)</th>
                      <th className="p-3">Produto no Sistema (Estoque)</th>
                      <th className="p-3 text-right">Qtd</th>
                      <th className="p-3 text-right">V. Unit</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.itens.map((item: any, index: number) => {
                      const achouProduto = !!item.produtoIdSelecionado;
                      return (
                        <tr key={index} className={`border-b ${achouProduto ? 'bg-white' : 'bg-yellow-50'}`}>
                          <td className="p-3 text-sm">
                            <div className="font-bold text-slate-700">{item.descricaoOriginal}</div>
                            <div className="text-xs text-slate-500">EAN: {item.ean || 'N/A'}</div>
                          </td>
                          <td className="p-3 text-sm">
                            {achouProduto ? (
                              <div className="font-bold text-emerald-700 flex items-center gap-1">
                                ✅ {item.produtoNomeSelecionado}
                              </div>
                            ) : (
                              <div className="text-yellow-700 font-bold text-xs flex items-center gap-1">
                                ⚠️ Será cadastrado como NOVO
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-sm font-bold text-right">{item.quantidade}</td>
                          <td className="p-3 text-sm text-right">R$ {item.valorUnitario.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => abrirModalPesquisa(index)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200" title="Aperte F2 para buscar">
                              🔍 Buscar (F2)
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6">
              <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={handleConfirmarEntrada} disabled={salvando || !selectedCfopId} className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-md">
                {salvando ? 'Salvando...' : '💾 Confirmar Entrada'}
              </button>
            </div>
          </div>
        )}

        {/* MODAL DE PESQUISA DIRETO NO BANCO */}
        {modalPesquisa.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Vincular Produto Existente</h3>
                <button onClick={() => setModalPesquisa({isOpen: false, itemIndex: null})} className="text-slate-400 hover:text-red-500 font-bold text-xl">X</button>
              </div>
              
              <div className="relative">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Digite o nome ou código de barras..." 
                  value={termoPesquisa}
                  onChange={(e) => buscarProdutos(e.target.value)}
                  className="w-full p-4 border-2 border-blue-200 rounded-lg focus:border-blue-500 outline-none text-lg mb-4"
                />
                {buscandoProdutos && (
                  <span className="absolute right-4 top-4 text-slate-400 text-sm animate-pulse">Buscando...</span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {produtosPesquisa.length === 0 && termoPesquisa.length > 1 && !buscandoProdutos ? (
                  <div className="p-4 text-center text-slate-500">Nenhum produto encontrado.</div>
                ) : (
                  <table className="w-full text-left">
                    <tbody>
                      {produtosPesquisa.map(p => (
                        <tr key={p.id} className="border-b hover:bg-blue-50 cursor-pointer" onClick={() => selecionarProduto(p)}>
                          <td className="p-3 text-sm font-bold text-slate-700">{p.nome}</td>
                          <td className="p-3 text-xs text-slate-500">{p.ean || 'S/ Código'}</td>
                          <td className="p-3 text-right">
                            <button className="text-blue-600 font-bold text-xs bg-blue-100 px-2 py-1 rounded">Vincular</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <button onClick={() => selecionarProduto(null)} className="text-sm font-bold text-red-600 hover:underline">
                  Remover vínculo (Cadastrar Novo)
                </button>
                <p className="text-xs text-slate-400">Pressione ESC para fechar</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}