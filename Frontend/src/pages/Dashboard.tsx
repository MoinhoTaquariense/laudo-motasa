import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ClipboardList, FileSpreadsheet, Sparkles, Settings2 } from 'lucide-react';
import AppShell, { PageHeading } from '@/components/AppShell';
import { getTabelasSQL, listarFarinhas, gerarLaudo, type Farinha } from '@/lib/api';

const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export default function Dashboard() {
  const navigate = useNavigate();
  const [tabelas, setTabelas] = useState<{id:number; nome:string; modelo_nome:string | null}[]>([]);
  const [tabela, setTabela] = useState('');
  const [farinhas, setFarinhas] = useState<Farinha[]>([]);
  const [form, setForm] = useState({ farinha:'', cliente:'', operador:'', lote:'', emissao:hoje(), validade:'' });
  const [opcaoValidade, setOpcaoValidade] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  useEffect(() => { getTabelasSQL().then(setTabelas).catch(e => setErro(e.message)); }, []);
  useEffect(() => {
    let active = true;
    setFarinhas([]); setForm(f => ({ ...f, farinha: '' }));
    if (tabela) listarFarinhas(Number(tabela)).then(data => { if (active) setFarinhas(data); }).catch(e => { if (active) setErro(e.message); });
    return () => { active = false; };
  }, [tabela]);
  const change = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(''); setCarregando(true);
    try {
      const blob = await gerarLaudo({ tabela_id: Number(tabela), ...form });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `laudo-${form.lote}.xlsx`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível gerar o laudo.'); }
    finally { setCarregando(false); }
  };
  return <AppShell>
    <PageHeading eyebrow="Área de qualidade" title="Emitir laudo" description="Preencha as informações abaixo para gerar um laudo a partir de um modelo cadastrado." />
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div className="icon-tile"><ClipboardList size={19}/></div><div><h2>Informações do laudo</h2><p>Selecione a farinha e preencha os dados para a emissão.</p></div></div>
        <form onSubmit={submit}><div className="panel-body">
          <div className="section-label"><span>01</span> Modelo e farinha</div>
          <div className="form-grid">
            <div className="form-field"><label htmlFor="tabela">Tabela / modelo</label><select id="tabela" required value={tabela} onChange={e => setTabela(e.target.value)}><option value="">Selecione uma tabela</option>{tabelas.map(t => <option key={t.id} value={t.id}>{t.nome}{!t.modelo_nome ? ' (sem modelo)' : ''}</option>)}</select></div>
            <div className="form-field"><label htmlFor="farinha">Farinha</label><select id="farinha" required disabled={!tabela} value={form.farinha} onChange={e => change('farinha',e.target.value)}><option value="">{tabela ? 'Selecione uma farinha' : 'Selecione uma tabela primeiro'}</option>{farinhas.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}</select></div>
          </div>
          <div className="form-separator" />
          <div className="section-label"><span>02</span> Dados da emissão</div>
          <div className="form-grid">
            <div className="form-field"><label htmlFor="cliente">Cliente</label><input id="cliente" required placeholder="Nome do cliente" value={form.cliente} onChange={e => change('cliente',e.target.value)} /></div>
            <div className="form-field"><label htmlFor="operador">Operador</label><input id="operador" required maxLength={200} placeholder="Nome do operador" value={form.operador} onChange={e => change('operador',e.target.value)} /></div>
            <div className="form-field"><label htmlFor="lote">Data do lote</label><input id="lote" required type="date" value={form.lote} onChange={e => change('lote',e.target.value)} /></div>
            <div className="form-field"><label htmlFor="emissao">Data de emissão</label><input id="emissao" required type="date" value={form.emissao} onChange={e => change('emissao',e.target.value)} /></div>
            <div className="form-field"><label htmlFor="validade">Validade</label><select id="validade" required value={opcaoValidade} onChange={e => { setOpcaoValidade(e.target.value); change('validade', e.target.value === 'outro' ? '' : e.target.value); }}><option value="">Selecione a validade</option><option value="150 DIAS">150 DIAS</option><option value="180 DIAS">180 DIAS</option><option value="outro">Outro</option></select></div>
            {opcaoValidade === 'outro' && <div className="form-field"><label htmlFor="outra-validade">Informe a validade</label><input id="outra-validade" required placeholder="Digite a validade" value={form.validade} onChange={e => change('validade',e.target.value)} /></div>}
          </div>
          {erro && <p role="alert" className="error-message" style={{marginTop:20}}>{erro}</p>}
        </div><div className="form-footer"><p>Confira os dados antes de gerar o arquivo em Excel.</p><button disabled={carregando} className="btn-primary" type="submit"><ArrowDownToLine size={16}/>{carregando ? 'Gerando laudo...' : 'Gerar laudo'}</button></div></form>
      </section>
      <aside className="dashboard-aside"><div className="panel side-card"><div className="icon-tile gold"><Sparkles size={19}/></div><h3>Como funciona</h3><p>Um processo simples para manter seus laudos organizados.</p><ol className="step-list"><li><span>01</span> Escolha o modelo e a farinha cadastrados.</li><li><span>02</span> Informe os dados do cliente e do lote.</li><li><span>03</span> Gere e baixe o arquivo Excel.</li></ol><button type="button" className="btn-outline" style={{marginTop:22}} onClick={() => navigate('/configurar')}><Settings2 size={15}/> Configurar modelos</button></div>
        <div className="side-tip"><FileSpreadsheet size={19}/><strong>Resultados consistentes</strong>Os valores são sorteados nos intervalos cadastrados e reutilizados para a mesma tabela, farinha e lote.</div></aside>
    </div>
  </AppShell>;
}
