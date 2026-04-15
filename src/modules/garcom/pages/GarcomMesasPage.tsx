import { MesaSalaoGrid } from '../../mesas/MesaSalaoGrid';
import { useMesas } from '../../mesas/useMesas';

export function GarcomMesasPage() {
  const { celulas, carregando, refetch } = useMesas();

  return <MesaSalaoGrid celulas={celulas} carregando={carregando} onRefetch={refetch} />;
}
