import { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  // Pega os dados do usuário que o login salvou
  const usuario = JSON.parse(localStorage.getItem('@PDVUsuario') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('@PDVToken');
    localStorage.removeItem('@PDVUsuario');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Menu Lateral (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-800 flex items-center gap-2">
          <span>🛒 PDV Inteligente</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard" className="block p-3 rounded-lg bg-blue-600 text-white font-medium transition">
            📊 Visão Geral
          </Link>
          <Link to="/produtos" className="block p-3 rounded-lg hover:bg-slate-800 text-slate-300 transition">
            📦 Produtos
          </Link>
          <Link to="/categorias" className="block p-3 rounded-lg hover:bg-slate-800 text-slate-300 transition">
            🏷️ Categorias
          </Link>

           <Link to="/frente-caixa" className="block p-3 rounded-lg hover:bg-slate-800 text-slate-300 transition">
            🛒 Frente de Caixa (FrenteCaixa)
          </Link>

          <Link to="/estoque" className="block p-3 rounded-lg hover:bg-slate-800 text-slate-300 transition">
            📋 Gestão de Estoque
          </Link>

          <Link to="/ConsultorIA " className="block p-3 rounded-lg hover:bg-slate-800 text-slate-300 transition">
            🧠 Consultor IA
          </Link>
          <Link to="/cadastro-pessoa" className="block p-3 rounded-lg hover:bg-slate-800 text-slate-300 transition">
            📄 Cadastro de Pessoa
          </Link>


        </nav>

        {/* Rodapé do Menu com dados do Usuário */}
        <div className="p-4 border-t border-slate-800">
          <div className="mb-4">
            <p className="text-sm font-medium text-white">{usuario.nome}</p>
            <p className="text-xs text-slate-400">{usuario.loja?.nome}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full p-2 bg-slate-800 hover:bg-red-600 rounded-lg text-sm font-semibold transition-colors"
          >
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Área Principal (Onde o conteúdo das telas vai aparecer) */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}