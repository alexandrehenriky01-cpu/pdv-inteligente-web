import { type FC } from 'react';
import { Bike } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { RegioesEntregaTab } from './RegioesEntregaTab';

const RegioesEntregaPage: FC = () => {
  return (
    <Layout>
      <div className="p-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Bike className="h-6 w-6 text-violet-400" />
            Regiões de Entrega
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure zonas de entrega com taxa diferenciada, pedido mínimo e tempo estimado por bairro.
            Lojas sem regiões cadastradas continuam usando a taxa de entrega padrão.
          </p>
        </header>
        <RegioesEntregaTab />
      </div>
    </Layout>
  );
};

export default RegioesEntregaPage;
