
import { useEffect, useRef, useState } from 'react';
interface UseBalancaProps {
  workstationId: string; // ID da estação de trabalho atual (Doca, Mesa de Produção, etc.)
  ipAgente?: string;     // IP da máquina onde o Agente C# está rodando (default: localhost)
  porta?: number;        // Porta do WebSocket do Agente C# (default: 8080)
}

export function useBalanca({ workstationId, ipAgente = 'localhost', porta = 8080 }: UseBalancaProps) {
  const [pesoReal, setPesoReal] = useState<number>(0);
  const [estabilizado, setEstabilizado] = useState<boolean>(false);
  const [conectado, setConectado] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Só tenta conectar se tivermos a identificação da máquina
    if (!workstationId) return;

    // Monta a URL do WebSocket apontando para o Agente C#
    const wsUrl = `ws://${ipAgente}:${porta}/balanca/${workstationId}`;
    
    const conectar = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConectado(true);
          setErro(null);
          console.log(`🔌 [WebSocket] Conectado à balança da estação ${workstationId}`);
        };

        ws.onmessage = (event) => {
          try {
            // O Agente C# envia um JSON no formato: { "peso": 1250.500, "estabilizado": true }
            const dados = JSON.parse(event.data);
            
            if (dados.peso !== undefined) {
              setPesoReal(dados.peso);
            }
            if (dados.estabilizado !== undefined) {
              setEstabilizado(dados.estabilizado);
            }
          } catch (e) {
            console.error("Erro ao fazer parse dos dados da balança", e);
          }
        };

        ws.onclose = () => {
          setConectado(false);
          setEstabilizado(false);
          setPesoReal(0);
          console.warn("❌ [WebSocket] Conexão com a balança perdida. Tentando reconectar em 3s...");
          
          // Resiliência: Tenta reconectar automaticamente após 3 segundos
          setTimeout(conectar, 3000);
        };

        ws.onerror = (err) => {
          setErro("Falha na comunicação com o Agente de Hardware.");
          ws.close(); // Força o onclose para disparar a reconexão
        };

      } catch (err) {
        setErro("Erro ao inicializar WebSocket.");
      }
    };

    conectar();

    // Cleanup: fecha a conexão graciosamente quando o componente desmontar
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [workstationId, ipAgente, porta]);

  // Função manual para pedir a tara (zero) para a balança, se o protocolo da balança suportar
  const tararBalanca = () => {
    if (wsRef.current && conectado) {
      wsRef.current.send(JSON.stringify({ comando: 'TARA' }));
    }
  };

  return {
    pesoReal,
    estabilizado,
    conectado,
    erro,
    tararBalanca
  };
}