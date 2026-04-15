import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { api } from '../../services/api';
import {
  descobrirEstacaoPorIp,
  getEstacaoTrabalhoIdPdv,
} from '../../utils/estacaoWorkstationStorage';

/**
 * Shell full-screen do Totem Food — sem menu lateral do ERP.
 * Aurya Dark Premium: base #060816, glow violet sutil.
 */
export function TotemLayout() {
  useEffect(() => {
    if (getEstacaoTrabalhoIdPdv()) return;
    void descobrirEstacaoPorIp(api).catch(() => undefined);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#060816] text-white antialiased selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.14),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(59,130,246,0.08),transparent_45%)]" />
      <div className="relative z-10 flex h-full w-full min-h-0 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
