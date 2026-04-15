import { useEffect, useState } from 'react';
// src/hooks/useBalancaWebSocket.ts

export function useBalancaWebSocket(url: string = 'ws://localhost:8080/balanca') {
  const [pesoBruto, setPesoBruto] = useState<number>(0);
  const [conectado, setConectado] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConectado(true);
      setErro(null);
    };

    ws.onmessage = (event) => {
      try {
        const dados = JSON.parse(event.data);
        if (dados.peso !== undefined) {
          setPesoBruto(Number(dados.peso));
        }
      } catch (e) {
        const pesoLido = parseFloat(event.data);
        if (!isNaN(pesoLido)) setPesoBruto(pesoLido);
      }
    };

    ws.onerror = () => {
      setErro("Falha de comunicação com a balança. Verifique o Agente local.");
      setConectado(false);
    };

    ws.onclose = () => {
      setConectado(false);
    };

    return () => ws.close(); 
  }, [url]);

  return { pesoBruto, conectado, erro };
}