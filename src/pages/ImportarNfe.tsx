import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router-dom';

export function ImportarNfe() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  // ✅ ESTADOS PARA A NOVA LÓGICA DE CFOP
  const [cfopsDisponiveis, setCfopsDisponiveis] = useState<any[]>([]);
  const [selectedCfopId, setSelectedCfopId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Carrega os CFOPs assim que a tela abre
  useEffect(() => {
    const carregarCfops = async () => {
      try {
        const token = localStorage.getItem('@PDVToken');
        const response = await api.get('/api/cfop', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        // Filtra apenas operações de ENTRADA
        const cfopsEntrada = response.data.filter((c: any) => c.tipoOperacao === 'ENTRADA');
        setCfopsDisponiveis(cfopsEntrada);
      } catch (error) {
        console.error("Erro ao carregar CFOPs", error);
      }
    };
    carregarCfops();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcessarXml = async () => {
    if (!file) return alert("Por favor, selecione um arquivo XML.");

    const formData = new FormData();
    formData.append('arquivo', file);

    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      const response = await api.post('/api/nfe/importar', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        }
      });
          
      setPreviewData(response.data);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || "Erro ao processar o arquivo XML.");
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    setFile(null);
    setPreviewData(null);
    setSelectedCfopId(''); // Limpa o CFOP selecionado
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmarEntrada = async () => {
    if (!previewData) return;
    if (!selectedCfopId) {
      alert("⚠️ Você precisa selecionar uma Operação Fiscal (CFOP) antes de confirmar a entrada.");
      return;
    }
    
    setSalvando(true);
    try {
      const token = localStorage.getItem('@PDVToken'); 

      // ✅ ENVIANDO APENAS O ID DO CFOP. O BACKEND FAZ O RESTO!
      const payload = {
        ...previewData,
        cfopId: selectedCfopId
      };

      const response = await api.post('/api/nfe/salvar', payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      alert(`✅ ${response.data.message}`);
      handleLimpar(); 
      
    } catch (error: any) {
      console.error(error);
      alert("Erro ao salvar a Nota Fiscal: " + (error.response?.data?.error || error.message));
    } finally {
      setSalvando(false);
    }
  };

  // Encontra o objeto do CFOP selecionado para mostrar as "tags" visuais
  const cfopSelecionado = cfopsDisponiveis.find(c => c.id === selectedCfopId);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800">Entrada de Documento Fiscal</h1>
          <p className="text-slate-500 mt-1">Importe o XML da Nota Fiscal e aplique as regras fiscais automaticamente.</p>
        </div>

        {/* ÁREA DE UPLOAD */}
        {!previewData && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 bg-blue-50/50 hover:bg-blue-50 transition-colors">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Arraste o arquivo XML aqui</h3>
              <p className="text-slate-500 mb-6">ou clique no botão abaixo para buscar no seu computador</p>
              
              <input 
                type="file" 
                accept=".xml" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md"
              >
                Selecionar XML
              </button>
              
              {file && (
                <div className="mt-6 p-4 bg-white rounded-lg border border-emerald-200 inline-block">
                  <p className="text-emerald-700 font-medium flex items-center gap-2">
                    ✅ Arquivo selecionado: <strong>{file.name}</strong>
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleProcessarXml}
                  disabled={loading}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md text-lg w-full md:w-auto"
                >
                  {loading ? 'Processando XML...' : 'Ler Dados da Nota 🚀'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ÁREA DE PREVIEW E CONFIRMAÇÃO */}
        {previewData && (
          <div className="space-y-6 animate-fade-in">
            
            {/* ✅ NOVO CARD: SELEÇÃO INTELIGENTE DE CFOP */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
              <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4">⚙️ Parametrização da Entrada</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Chave de Acesso */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Chave de Acesso</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={previewData.documento.chaveAcesso.substring(0, 15) + '...'} 
                    title={previewData.documento.chaveAcesso}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 text-sm font-mono outline-none"
                  />
                </div>

                {/* Seleção do CFOP */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Selecione a Operação (CFOP) *</label>
                  <select 
                    value={selectedCfopId}
                    onChange={(e) => setSelectedCfopId(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all cursor-pointer font-medium text-slate-700"
                  >
                    <option value="">-- Clique aqui para escolher como processar esta nota --</option>
                    {cfopsDisponiveis.map(cfop => (
                      <option key={cfop.id} value={cfop.id}>
                        {cfop.codigo} - {cfop.descricao} ({cfop.aplicacao?.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                  
                  {/* Feedback Visual das Regras (Mágica do UX) */}
                  {cfopSelecionado && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${cfopSelecionado.movimentaEstoque ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                        📦 {cfopSelecionado.movimentaEstoque ? 'Soma no Estoque' : 'Não soma no Estoque'}
                      </span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${cfopSelecionado.geraFinanceiro ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                        💰 {cfopSelecionado.geraFinanceiro ? 'Gera Contas a Pagar' : 'Não gera Financeiro'}
                      </span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${cfopSelecionado.calculaTributos ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                        ⚖️ {cfopSelecionado.calculaTributos ? 'Calcula Tributos' : 'Sem Tributos'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD DO FORNECEDOR E NOTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">🏢 Dados do Fornecedor</h3>
                <p className="font-bold text-lg text-slate-800">{previewData.fornecedor.razaoSocial}</p>
                <p className="text-slate-600">CNPJ: {previewData.fornecedor.cnpjCpf}</p>
                <p className="text-slate-600">IE: {previewData.fornecedor.inscricaoEstadual}</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4">📄 Resumo da Nota</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">NÚMERO / SÉRIE</p>
                    <p className="font-bold text-slate-800">{previewData.documento.numero} / {previewData.documento.serie}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">EMISSÃO</p>
                    <p className="font-bold text-slate-800">{new Date(previewData.documento.dataEmissao).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-semibold">VALOR TOTAL</p>
                    <p className="font-bold text-2xl text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewData.documento.valorTotalDocumento)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* TABELA DE PRODUTOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">📦 Itens da Nota ({previewData.itens.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-xs text-slate-500 border-b">
                      <th className="p-3">Cód. Forn.</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">EAN / NCM</th>
                      <th className="p-3 text-right">Qtd</th>
                      <th className="p-3 text-right">V. Unit</th>
                      <th className="p-3 text-right">V. Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.itens.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 text-sm font-medium">{item.codigoFornecedor}</td>
                        <td className="p-3 text-sm">{item.descricaoOriginal}</td>
                        <td className="p-3 text-xs text-slate-500">
                          {item.ean || 'S/ EAN'}<br/>NCM: {item.ncm}
                        </td>
                        <td className="p-3 text-sm font-bold text-right">{item.quantidade} {item.unidadeMedida}</td>
                        <td className="p-3 text-sm text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                        </td>
                        <td className="p-3 text-sm font-bold text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-200">
              <button 
                onClick={handleLimpar}
                disabled={salvando}
                className="px-6 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmarEntrada}
                disabled={salvando || !selectedCfopId}
                className={`px-8 py-3 rounded-lg font-bold transition-colors shadow-md text-lg flex items-center gap-2 ${
                  !selectedCfopId 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {salvando ? '⏳ Processando Regras...' : '💾 Confirmar Entrada'}
              </button>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}