import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Monitor, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';

interface IAberturaCaixaProps {
  onCaixaAberto: () => void;
}

export function AberturaCaixa({ onCaixaAberto }: IAberturaCaixaProps) {
  const [saldoAbertura, setSaldoAbertura] = useState<string>('');
  const [terminal, setTerminal] = useState<string>('');
  const [isDefinindoTerminal, setIsDefinindoTerminal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // 🚀 1. Ao carregar a tela, verifica se esta máquina já tem um nome
    const terminalSalvo = localStorage.getItem('@Aurya:Terminal');
    if (terminalSalvo) {
      setTerminal(terminalSalvo);
    } else {
      // Se não tem, força o usuário a definir o nome da máquina
      setIsDefinindoTerminal(true);
    }
  }, []);

  const salvarTerminal = () => {
    if (!terminal.trim()) {
      alert('Digite o nome do terminal (ex: CAIXA-01)');
      return;
    }
    // 🚀 2. Salva o nome da máquina no navegador para sempre
    localStorage.setItem('@Aurya:Terminal', terminal.toUpperCase());
    setTerminal(terminal.toUpperCase());
    setIsDefinindoTerminal(false);
  };

  const handleAbrirCaixa = async () => {
    if (!saldoAbertura) {
      alert('Informe o saldo inicial (fundo de troco).');
      return;
    }

    setLoading(true);
    try {
      // 🚀 3. Envia o saldo e o nome do terminal para o Backend
      await api.post('/api/pdv/caixa/abrir', {
        saldoAbertura: Number(saldoAbertura),
        terminal: terminal, // Ex: "CAIXA-01"
        observacao: 'Abertura padrão'
      });

      alert('✅ Caixa aberto com sucesso!');
      onCaixaAberto(); // Função para liberar a tela de vendas do PDV
    } catch (err) {
      // 🚀 CORREÇÃO AQUI: Padronizado para 'error' conforme o Backend
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao abrir o caixa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#020617]">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#08101f] p-8 shadow-2xl">
        
        {isDefinindoTerminal ? (
          // =========================================================
          // TELA 1: DEFINIR NOME DO COMPUTADOR (Aparece só na 1ª vez)
          // =========================================================
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                <Monitor className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Identificar Terminal</h2>
              <p className="mt-2 text-sm text-slate-400">
                Esta máquina ainda não possui um identificador. Defina um nome para este PDV (ex: CAIXA-01).
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Nome do Terminal</label>
              <input 
                type="text" 
                value={terminal}
                onChange={(e) => setTerminal(e.target.value)}
                placeholder="Ex: CAIXA-01"
                className="w-full rounded-xl border border-white/10 bg-[#0d182d] px-4 py-3 text-white focus:border-violet-500 focus:outline-none uppercase"
              />
            </div>

            <button 
              onClick={salvarTerminal}
              className="w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700 transition-colors"
            >
              Salvar e Continuar
            </button>
          </div>
        ) : (
          // =========================================================
          // TELA 2: ABERTURA DE CAIXA (Rotina diária do operador)
          // =========================================================
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white">Abertura de Caixa</h2>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
                <Monitor className="h-3.5 w-3.5" />
                Terminal: {terminal}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Fundo de Troco (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input 
                  type="number" 
                  value={saldoAbertura}
                  onChange={(e) => setSaldoAbertura(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-white/10 bg-[#0d182d] px-4 py-4 pl-12 text-2xl font-black text-emerald-400 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="flex items-start gap-2 text-sm text-amber-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                Certifique-se de que o valor na gaveta corresponde ao valor informado acima.
              </p>
            </div>

            <button 
              onClick={handleAbrirCaixa}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-4 font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar e Abrir Caixa'}
            </button>

            <button 
              onClick={() => setIsDefinindoTerminal(true)}
              className="w-full text-xs font-bold text-slate-500 hover:text-white"
            >
              Trocar nome deste terminal
            </button>
          </div>
        )}

      </div>
    </div>
  );
}