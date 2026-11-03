import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Pencil, Trash2 } from 'lucide-react';
import AppShell, { BackLink, PageHeading } from '@/components/AppShell';
import { getIntervalosByElementoSQL, createIntervaloSQL, updateIntervaloSQL, deleteIntervaloSQL, getFarinhas } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Intervalo = { id:number; farinha:string; cliente:string; valormin:string; valormax:string; vmin_str:string | null; vmax_str:string | null; passo_meio:boolean };
export default function Intervalos() {
  const navigate = useNavigate(); const elementoId = Number(localStorage.getItem('elementoId')); const tabelaId = Number(localStorage.getItem('tabelaId'));
  const elementoNome = localStorage.getItem('elementoNome') || 'Elemento'; const formato = localStorage.getItem('elementoFormato'); const isTempo = formato === '7'; const permitePasso = formato === '1' || formato === '3' || formato === '8';
  const [items,setItems] = useState<Intervalo[]>([]); const [farinhas,setFarinhas] = useState<string[]>([]); const [filter,setFilter] = useState('');
  const [open,setOpen] = useState(false); const [id,setId] = useState<number | null>(null); const [form,setForm] = useState({farinha:'', min:'', max:'', passo_meio:false}); const [error,setError] = useState(''); const [salvando,setSalvando] = useState(false);
  const load = () => getIntervalosByElementoSQL(elementoId).then(setItems).catch(e => setError(e.message));
  useEffect(() => { if (elementoId) load(); }, [elementoId]);
  useEffect(() => { if (tabelaId) getFarinhas(tabelaId).then(setFarinhas).catch(e => setError(e.message)); }, [tabelaId]);
  const edit = (item?: Intervalo) => { setId(item?.id ?? null); const nome = item?.farinha?.trim().toLocaleLowerCase('pt-BR'); setForm({farinha:farinhas.find(f => f.trim().toLocaleLowerCase('pt-BR') === nome) ?? '', min:item?.vmin_str ?? item?.valormin ?? '', max:item?.vmax_str ?? item?.valormax ?? '', passo_meio:item?.passo_meio ?? false}); setError(''); setOpen(true); };
  const submit = async (e:React.FormEvent) => {
    e.preventDefault();
    const parse = (s:string) => isTempo ? (/^\d{1,3}:[0-5]\d$/.test(s) ? Number(s.split(':')[0])*60+Number(s.split(':')[1]) : NaN) : Number(s.replace(',', '.'));
    const min = parse(form.min), max = parse(form.max);
    if (!form.farinha.trim() || !form.min.trim() || !form.max.trim() || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) { setError('Informe uma farinha e limites válidos, com o valor final maior que o inicial.'); return; }
    if (form.passo_meio && Math.ceil(min * 2 - 1e-8) > Math.floor(max * 2 + 1e-8)) { setError('Não há múltiplos de 0,50 dentro deste intervalo.'); return; }
    const data = {passo_meio:form.passo_meio, elemento_id:elementoId, farinha:form.farinha.trim(), valorMin:min, valorMax:max, vmin_str:form.min.replace(',','.'), vmax_str:form.max.replace(',','.')}; setSalvando(true);
    try { if (id === null) await createIntervaloSQL(data); else await updateIntervaloSQL(id,data); setOpen(false); setError(''); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar intervalo.'); } finally { setSalvando(false); }
  };
  const remove = async (item:Intervalo) => { if (!window.confirm('Excluir este intervalo?')) return; try { await deleteIntervaloSQL(item.id); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir.'); } };
  const filtered = items.filter(i => (i.farinha || '').toLowerCase().includes(filter.toLowerCase()));
  return <AppShell section="configuracao"><BackLink onClick={() => navigate('/elementos')}>Voltar para elementos</BackLink>
    <PageHeading eyebrow={elementoNome} title="Intervalos por farinha" description="Configure os valores mínimo e máximo deste elemento para cada farinha." action={<button className="btn-primary" disabled={!elementoId} onClick={() => edit()}><Plus size={16}/> Novo intervalo</button>}/>
    {!open && error && <p role="alert" className="error-message" style={{marginBottom:18}}>{error}</p>}
    <section className="panel"><div className="toolbar"><div className="toolbar-title">Intervalos cadastrados <span className="count-badge">{items.length}</span></div><div className="search-wrap"><Search size={16}/><input className="search-input" aria-label="Buscar farinha" placeholder="Buscar farinha..." value={filter} onChange={e => setFilter(e.target.value)}/></div></div>
      {filtered.length === 0 ? <div className="empty-state"><SlidersHorizontal size={28}/>{items.length ? 'Nenhum intervalo encontrado.' : 'Nenhum intervalo cadastrado ainda.'}</div> : filtered.map(item => <div className="list-row" key={item.id}><div className="list-row-main"><div className="icon-tile gold"><SlidersHorizontal size={18}/></div><div><h3>{item.farinha}</h3><p>{item.vmin_str ?? item.valormin} a {item.vmax_str ?? item.valormax}</p>{item.passo_meio && <p>Somente múltiplos de 0,50</p>}{item.cliente && <p style={{color:'#ad8345',marginTop:4}}>Cadastro anterior: {item.cliente}. Revise intervalos repetidos.</p>}</div></div><div className="row-actions"><button className="btn-outline" onClick={() => edit(item)}><Pencil size={14}/> Editar</button><button className="btn-outline" onClick={() => remove(item)}><Trash2 size={14}/> Excluir</button></div></div>)}
    </section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>{id === null ? 'Novo intervalo' : 'Editar intervalo'}</DialogTitle></DialogHeader><form onSubmit={submit} className="dialog-form"><div className="form-field"><label htmlFor="farinha">Farinha</label><select id="farinha" required value={form.farinha} onChange={e => setForm({...form,farinha:e.target.value})}><option value="">Selecione uma farinha</option>{farinhas.map(f => <option key={f} value={f}>{f}</option>)}</select>{farinhas.length === 0 && <p className="text-sm text-muted-foreground">Cadastre uma farinha na tela de tabelas antes de adicionar intervalos.</p>}</div><div className="form-grid">{([['min','Valor inicial'],['max','Valor final']] as const).map(([key,label]) => <div className="form-field" key={key}><label htmlFor={key}>{label}</label><input id={key} required placeholder={isTempo ? 'MM:SS' : 'Ex.: 13,50'} value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}/></div>)}</div>{permitePasso && <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={form.passo_meio} onChange={e => setForm({...form,passo_meio:e.target.checked})}/> Somente valores de 0,50 em 0,50 (ex.: 14,50; 15,00; 15,50)</label>}{error && <p role="alert" className="error-message">{error}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancelar</button><button disabled={salvando} type="submit" className="btn-primary">{salvando ? 'Salvando...' : 'Salvar intervalo'}</button></div></form></DialogContent></Dialog>
  </AppShell>;
}
