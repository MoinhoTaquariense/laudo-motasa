import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Elementos from "./pages/Elementos";
import Intervalos from "./pages/Intervalos";
import Farinhas from "./pages/Farinhas";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Configurar from "./pages/Configurar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PrivateRoutes() {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');
  useEffect(() => { fetch('/api/auth/session').then(r => setStatus(r.ok ? 'authenticated' : 'anonymous')).catch(() => setStatus('anonymous')); }, []);
  if (status === 'loading') return <p>Verificando acesso...</p>;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/configurar" element={<Configurar />} />
          <Route path="/elementos" element={<Elementos />} />
          <Route path="/intervalos" element={<Intervalos />} />
          <Route path="/tabelas/:tabelaId/farinhas" element={<Farinhas />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
