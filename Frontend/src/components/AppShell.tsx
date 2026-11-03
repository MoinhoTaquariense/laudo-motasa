import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FileText, LayoutGrid, LogOut, ArrowRight, Users } from 'lucide-react';

type AppShellProps = { children: ReactNode; section?: 'laudos' | 'configuracao' | 'clientes' };

export default function AppShell({ children, section = 'laudos' }: AppShellProps) {
  const navigate = useNavigate();
  const logout = async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { navigate('/login'); } };
  return <div className="app-layout">
    <aside className="sidebar">
      <div className="brand"><img src="/LogoMot.png" alt="Motasa" /><div className="brand-divider" /><span>GESTÃO DE<br />LAUDOS</span></div>
      <div className="sidebar-label">ÁREA DE TRABALHO</div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        <NavLink to="/dashboard" className={`nav-link ${section === 'laudos' ? 'active' : ''}`}><FileText size={18} /><span>Emitir laudo</span><ArrowRight className="nav-arrow" size={15}/></NavLink>
        <NavLink to="/clientes" className={`nav-link ${section === 'clientes' ? 'active' : ''}`}><Users size={18} /><span>Clientes</span><ArrowRight className="nav-arrow" size={15}/></NavLink>
        <NavLink to="/configurar" className={`nav-link ${section === 'configuracao' ? 'active' : ''}`}><LayoutGrid size={18} /><span>Configurações</span><ArrowRight className="nav-arrow" size={15}/></NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-dot" />Área de qualidade<p>Organização e emissão de laudos em um só lugar.</p></div>
        <button type="button" className="logout-link" onClick={logout}><LogOut size={17}/> Sair do sistema</button>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar"><div><span className="topbar-overline">MOTASA</span><span className="topbar-separator">/</span><span>{section === 'laudos' ? 'Emissão de laudos' : section === 'clientes' ? 'Clientes' : 'Configurações'}</span></div><span className="topbar-badge"><span className="note-dot" /> Área de qualidade</span><button type="button" className="mobile-logout" onClick={() => navigate('/login')}><LogOut size={16}/> Sair</button></header>
      <main className="content-area">{children}</main>
    </div>
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow"><span />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className="back-link" onClick={onClick}><span aria-hidden>←</span>{children}</button>;
}
