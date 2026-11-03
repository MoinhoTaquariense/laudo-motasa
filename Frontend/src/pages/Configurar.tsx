import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Plus, Upload, Pencil, Grid2X2, Wheat, ListChecks } from 'lucide-react';
import AppShell, { PageHeading } from '@/components/AppShell';
import { getTabelasSQL, createTabelaSQL, updateTabelaSQL, getElementsByTabelaSQL, uploadModelo, saveCelulas } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Tabela = {id:number; nome:string; modelo_nome:string | null; celulas:Record<string,string>};
const defaultCells = {cliente:'C5', produto:'C6', lote:'C8', validade:'C9', emissao:'G9', operador:''};
const labels:Record<string,string> = {cliente:'Cliente', produto:'Produto', lote:'Lote', validade:'Validade', emissao:'Emissão', operador:'Operador'};
export default function Configurar() {
  const navigate = useNavigate(); const fileRef = useRef<HTMLInputElement>(null); const uploadId = useRef<number | null>(null);
  const [tabelas,setTabelas] = useState<Tabela[]>([]); const [selecionada,setSelecionada] = useState<Tabela | null>(null);
  const [nome,setNome] = useState(''); const [nameOpen,setNameOpen] = useState(false); const [cellOpen,setCellOpen] = useState(false);
  const [cells,setCells] = useState<Record<string,string>>(defaultCells); const [error,setError] = useState('');
  const load = () => getTabelasSQL().then(setTabelas).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const saveName = async (e:React.FormEvent) => { e.preventDefault(); try { if (selecionada) await updateTabelaSQL(selecionada.id,nome.trim()); else await createTabelaSQL(nome.trim()); setNameOpen(false); setError(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar.'); } };
  const send = async (file?:File) => { if (!file || uploadId.current === null) return; try { await uploadModelo(uploadId.current,file); setError(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Erro no envio.'); } finally { if (fileRef.current) fileRef.current.value=''; } };
  const saveCells = async (e:React.FormEvent) => { e.preventDefault(); if (!selecionada) return; try { await saveCelulas(selecionada.id,cells); setCellOpen(false); setError(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar células.'); } };
  return <AppShell section="configuracao"><PageHeading eyebrow="Configurações" title="Tabelas e modelos" description="Organize seus modelos de planilha, farinhas e elementos em um só lugar." action={<button className="btn-primary" onClick={() => {setSelecionada(null);setNome('');setError('');setNameOpen(true);}}><Plus size={16}/> Nova tabela</button>} />
    <div className="section-label"><span>{String(tabelas.length).padStart(2,'0')}</span> Tabelas cadastradas</div>
    {!nameOpen && !cellOpen && error && <p role="alert" className="error-message" style={{marginBottom:18}}>{error}</p>}
    {tabelas.length === 0 ? <div className="panel empty-state"><FileSpreadsheet size={30}/><strong>Nenhuma tabela cadastrada</strong><p style={{marginTop:7}}>Crie uma tabela para começar a configurar seus laudos.</p></div> : <div className="table-card-grid">{tabelas.map(t => <article key={t.id} className="panel table-card">
      <div className="table-card-top"><div className="icon-tile"><FileSpreadsheet size={19}/></div><div className="table-card-heading"><h3>{t.nome}</h3><p>{t.modelo_nome || 'Adicione uma planilha modelo'}</p></div><button type="button" className="btn-outline" aria-label={`Renomear ${t.nome}`} onClick={() => {setSelecionada(t);setNome(t.nome);setError('');setNameOpen(true);}}><Pencil size={14}/></button></div>
      <div className={`status-pill ${t.modelo_nome ? 'ready' : ''}`}>{t.modelo_nome ? 'Modelo adicionado' : 'Modelo pendente'}</div>
      <div className="table-card-actions">
        <button className="btn-outline" onClick={() => {uploadId.current=t.id;fileRef.current?.click();}}><Upload size={14}/> {t.modelo_nome ? 'Trocar Excel' : 'Enviar Excel'}</button>
        <button className="btn-outline" onClick={() => {setSelecionada(t);setCells({...defaultCells,...t.celulas});setError('');setCellOpen(true);}}><Grid2X2 size={14}/> Células</button>
        <button className="btn-outline" onClick={() => navigate(`/tabelas/${t.id}/farinhas`)}><Wheat size={14}/> Farinhas</button>
        <button className="btn-outline" onClick={async () => {try {const data = await getElementsByTabelaSQL(t.id);localStorage.setItem('tabelaId',String(t.id));localStorage.setItem('elementosTabela',JSON.stringify(data));localStorage.setItem('tabelaNome',t.nome);navigate('/elementos');} catch (e) {setError(e instanceof Error ? e.message : 'Erro ao carregar elementos.');}}}><ListChecks size={14}/> Elementos</button>
      </div></article>)}</div>}
    <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={e => send(e.target.files?.[0])}/>
    <Dialog open={nameOpen} onOpenChange={setNameOpen}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>{selecionada ? 'Renomear tabela' : 'Nova tabela'}</DialogTitle></DialogHeader><form onSubmit={saveName} className="dialog-form"><div className="form-field"><label htmlFor="nome">Nome da tabela</label><input id="nome" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Base ouro"/></div>{error && <p className="error-message" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" onClick={() => setNameOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar tabela</button></div></form></DialogContent></Dialog>
    <Dialog open={cellOpen} onOpenChange={setCellOpen}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>Células dos dados</DialogTitle></DialogHeader><form onSubmit={saveCells} className="dialog-form"><p className="text-sm text-muted-foreground">Informe a primeira célula de cada área no modelo Excel.</p><div className="form-grid">{Object.keys(labels).map(k => <div className="form-field" key={k}><label htmlFor={k}>{labels[k]}</label><input id={k} required value={cells[k] || ''} onChange={e => setCells({...cells,[k]:e.target.value.toUpperCase()})}/></div>)}</div>{error && <p role="alert" className="error-message">{error}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" onClick={() => setCellOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar células</button></div></form></DialogContent></Dialog>
  </AppShell>;
}
