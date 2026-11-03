import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({senha}) });
      if (!response.ok) { const data = await response.json(); setError(data.error || 'Não foi possível entrar.'); return; }
      navigate('/dashboard');
    } catch { setError('Não foi possível conectar ao servidor.'); }
  };
  return <main className="login-page">
    <section className="login-brand-panel"><div className="login-logo"><img src="/LogoMot.png" alt="Motasa"/><span>GESTÃO DE<br/>LAUDOS</span></div><div><div className="eyebrow"><span/>QUALIDADE EM CADA DETALHE</div><h1>Mais cuidado em cada laudo.</h1><p>Um espaço para organizar informações e preparar os laudos da Motasa com praticidade.</p></div><div className="login-bottom">MOTASA · ÁREA DE QUALIDADE</div></section>
    <section className="login-main"><div className="login-card"><div className="eyebrow"><span/>BEM-VINDO</div><h2>Vamos começar?</h2><p>Acesse a área de laudos para continuar.</p>
      <form onSubmit={handleLogin}><div className="form-field"><label htmlFor="senha">Senha de acesso</label><div className="login-password"><input id="senha" type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" value={senha} onChange={e => {setSenha(e.target.value);setError('');}} autoComplete="current-password" autoFocus /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
      {error && <p role="alert" className="error-message" style={{marginTop:14}}>{error}</p>}
      <button type="submit" className="btn-primary login-submit">Acessar sistema <ArrowRight size={16}/></button></form><div className="login-caption">Área de acesso restrito · Motasa</div>
    </div></section>
  </main>;
}
