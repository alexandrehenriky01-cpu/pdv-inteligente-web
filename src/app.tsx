import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Categorias } from './pages/Categorias'; 
import { Produtos } from './pages/produtos'; 
import { FrenteCaixa } from './pages/FrenteCaixa'; 
import { Estoque } from './pages/Estoque';
import { ConsultorIA } from './pages/ConsultorIA';


function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Nossa nova rota de Categorias */}
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/frente-caixa" element={<FrenteCaixa />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/ConsultorIA" element={<ConsultorIA />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;