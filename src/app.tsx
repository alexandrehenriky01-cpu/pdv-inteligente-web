import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Categorias } from './pages/Categorias'; 
import { Produtos } from './pages/produtos'; 
import { FrenteCaixa } from './pages/FrenteCaixa'; 
import { Estoque } from './pages/Estoque';
import { ConsultorIA } from './pages/ConsultorIA';
import { CadastroPessoa } from './pages/CadastroPessoa';
import { ListaPessoas } from './pages/ListaPessoas';
import { ImportarNfe } from './pages/ImportarNfe';
import { ListarNfe } from './pages/ListarNfe';

// ✅ O Guarda de Segurança: Verifica se o usuário tem o token antes de deixar entrar na tela
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('@PDVToken');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rotas do Sistema */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/frente-caixa" element={<FrenteCaixa />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/ConsultorIA" element={<ConsultorIA />} />
        <Route path="/cadastro-pessoa" element={<CadastroPessoa />} />
        <Route path="/pessoas" element={<ListaPessoas />} />
        <Route path="/pessoas/novo" element={<CadastroPessoa />} />
        <Route path="/estoque/entrada" element={<ImportarNfe />} />
        
        {/* ✅ Rota de Notas Fiscais protegida pelo PrivateRoute */}
        <Route path="/notas-fiscais" element={<PrivateRoute><ListarNfe /></PrivateRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;