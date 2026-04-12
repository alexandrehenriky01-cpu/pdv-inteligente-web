import { useCallback, useEffect, useState } from 'react';
import { getHardwareAgent, HARDWARE_AGENT_WS_URL } from '../services/hardwareAgent';

/**
 * Mantém WebSocket com o agente C# e expõe estado de conexão + send.
 */
export function useHardwareAgent() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const agent = getHardwareAgent();
    agent.connect();
    const off = agent.onConnectionChange(setConnected);
    return () => {
      off();
    };
  }, []);

  const send = useCallback((payload: object) => getHardwareAgent().send(payload), []);

  return {
    connected,
    send,
    wsUrl: HARDWARE_AGENT_WS_URL,
  };
}
