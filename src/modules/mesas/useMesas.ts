import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { api, resolveApiBaseUrl } from '../../services/api';
import { buildKdsSocketAuth } from '../../services/socket/kdsSocketAuth';
import { TOTAL_MESAS } from './constants';
import type { MesaApi } from './types';

export interface UseMesasOptions {
  /** Quando false, não dispara GET /api/mesas. */
  enabled?: boolean;
  /** Exibir toast em falha de rede/servidor. */
  toastOnError?: boolean;
}

export function useMesas(options: UseMesasOptions = {}) {
  const { enabled = true, toastOnError = true } = options;
  const [mesas, setMesas] = useState<MesaApi[]>([]);
  const [carregando, setCarregando] = useState(() => enabled);

  const carregar = useCallback(async () => {
    if (!enabled) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await api.get<MesaApi[]>('/api/pdv/mesas', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setMesas(Array.isArray(data) ? data : []);
    } catch {
      if (toastOnError) {
        toast.error('Não foi possível carregar as mesas.');
      }
      setMesas([]);
    } finally {
      setCarregando(false);
    }
  }, [enabled, toastOnError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!enabled) return;
    const auth = buildKdsSocketAuth();
    if (!auth?.token) return;

    const socket: Socket = io(resolveApiBaseUrl(), {
      auth,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
    });

    const onMesaLiberada = (payload: unknown) => {
      const rec =
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
      const numMesa = rec?.numeroMesa != null ? Number(rec.numeroMesa) : NaN;
      if (!Number.isFinite(numMesa)) return;

      setMesas((prev) => {
        if (!prev.some((m) => m.numero === numMesa)) {
          void carregar();
          return prev;
        }
        return prev.map((m) =>
          m.numero === numMesa
            ? {
                ...m,
                status: 'LIVRE',
                itens: [],
                pendenciaFechamento: null,
              }
            : m
        );
      });
    };

    socket.on('mesa-liberada', onMesaLiberada);
    return () => {
      socket.off('mesa-liberada', onMesaLiberada);
      socket.disconnect();
    };
  }, [enabled, carregar]);

  const mapa = useMemo(() => new Map(mesas.map((m) => [m.numero, m])), [mesas]);

  const celulas = useMemo(() => {
    return Array.from({ length: TOTAL_MESAS }, (_, i) => {
      const n = i + 1;
      const m = mapa.get(n);
      if (m) return m;
      return {
        id: `virtual-${n}`,
        numero: n,
        status: 'LIVRE',
        itens: [],
      } as MesaApi;
    });
  }, [mapa]);

  return { mesas, celulas, carregando, refetch: carregar, mapa };
}
