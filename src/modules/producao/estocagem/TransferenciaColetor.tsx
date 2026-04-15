import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRightLeft, MapPin, Package, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Notificacao {
  tipo: 'sucesso' | 'erro' | null;
  mensagem: string;
}

export default function TransferenciaColetor() {
  // Estados do Formulário
  const [codigoLote, setCodigoLote] = useState<string>('');
  const [codigoEnderecoDestino, setCodigoEnderecoDestino] = useState<string>('');
  
  // Estados de Controle
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notificacao, setNotificacao] = useState<Notificacao>({ tipo: null, mensagem: '' });

  // Refs para controle de foco do leitor de código de barras
  const inputLoteRef = useRef<HTMLInputElement>(null);
  const inputEnderecoRef = useRef<HTMLInputElement>(null);

  // Limpa notificações após 4 segundos para não travar a tela do operador
  useEffect(() => {
    if (notificacao.tipo) {
      const timer = setTimeout(() => setNotificacao({ tipo: null, mensagem: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [notificacao]);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    if (!codigoLote || !codigoEnderecoDestino) {
      setNotificacao({ tipo: 'erro', mensagem: 'Bipe o Lote e o Endereço de Destino.' });
      return;
    }

    setIsLoading(true);
    setNotificacao({ tipo: null, mensagem: '' });

    try {
      const payload = {
        // Garantindo que tudo vá em maiúsculo para o backend
        codigoLote: codigoLote.trim().toUpperCase(),
        codigoEnderecoDestino: codigoEnderecoDestino.trim().toUpperCase()
      };

      // Chamada para a nossa API de Transferência WMS
      const response = await fetch('/api/wms/transferencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // JWT em produção
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao transferir palete.');
      }

      // Sucesso! Feedback visual forte
      setNotificacao({ tipo: 'sucesso', mensagem: data.mensagem || 'Transferência realizada com sucesso!' });
      
      // Limpa os campos e volta o foco para o primeiro input
      setCodigoLote('');
      setCodigoEnderecoDestino('');
      inputLoteRef.current?.focus();

    } catch (error: unknown) {
      if (error instanceof Error) {
        setNotificacao({ tipo: 'erro', mensagem: error.message });
      } else {
        setNotificacao({ tipo: 'erro', mensagem: 'Erro inesperado de rede.' });
      }
      
      // Em caso de erro, seleciona o texto do lote para facilitar a re-leitura
      inputLoteRef.current?.select();
    } finally {
      setIsLoading(false);
    }
  };

  // UX de Coletor: Pula para o próximo campo ao bipar (o leitor envia Enter)
  const handleLoteKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoLote) {
      e.preventDefault();
      inputEnderecoRef.current?.focus();
    }
  };

  // UX de Coletor: Envia o formulário automaticamente ao bipar o endereço
  const handleEnderecoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoLote && codigoEnderecoDestino) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 font-sans">
      {/* Header Mobile-Friendly */}
      <header className="w-full max-w-md bg-amber-600 text-white rounded-t-xl p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Transferência</h1>
          <p className="text-amber-100 text-sm">Armazenagem / Putaway</p>
        </div>
        <ArrowRightLeft className="w-8 h-8 text-amber-100" />
      </header>

      {/* Card Principal */}
      <main className="w-full max-w-md bg-white rounded-b-xl shadow-md p-6">
        
        {/* Alertas de Feedback */}
        {notificacao.tipo === 'erro' && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center rounded-r-md animate-in fade-in">
            <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0" />
            <span className="font-bold text-sm">{notificacao.mensagem}</span>
          </div>
        )}
        
        {notificacao.tipo === 'sucesso' && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 flex items-center rounded-r-md animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 mr-3 flex-shrink-0" />
            <span className="font-bold text-sm">{notificacao.mensagem}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Input: Código do Lote (Origem) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              1. Bipar Lote (Palete)
            </label>
            <div className="relative">
              <input
                ref={inputLoteRef}
                type="text"
                value={codigoLote}
                onChange={(e) => setCodigoLote(e.target.value)}
                onKeyDown={handleLoteKeyDown}
                placeholder="Ex: IN-20231026-..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-300 rounded-lg text-xl font-bold text-slate-800 focus:ring-4 focus:ring-amber-500 focus:border-amber-500 transition-all uppercase"
                disabled={isLoading}
                autoFocus
                autoComplete="off"
              />
              <Package className="absolute left-4 top-4 w-6 h-6 text-slate-400" />
            </div>
          </div>

          {/* Input: Código do Endereço (Destino) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              2. Bipar Endereço Destino
            </label>
            <div className="relative">
              <input
                ref={inputEnderecoRef}
                type="text"
                value={codigoEnderecoDestino}
                onChange={(e) => setCodigoEnderecoDestino(e.target.value)}
                onKeyDown={handleEnderecoKeyDown}
                placeholder="Ex: CF1-P01-N02"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-300 rounded-lg text-xl font-bold text-slate-800 focus:ring-4 focus:ring-amber-500 focus:border-amber-500 transition-all uppercase"
                disabled={isLoading}
                autoComplete="off"
              />
              <MapPin className="absolute left-4 top-4 w-6 h-6 text-slate-400" />
            </div>
          </div>

          {/* Botão de Ação Gigante */}
          <button
            type="submit"
            disabled={isLoading || !codigoLote || !codigoEnderecoDestino}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-xl py-5 rounded-lg shadow-lg flex items-center justify-center transition-all active:scale-95 uppercase tracking-wider"
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              'TRANSFERIR PALETE'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}