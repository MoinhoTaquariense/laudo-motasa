import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, SlidersHorizontal, ListChecks } from 'lucide-react';
import AppShell, { BackLink, PageHeading } from '@/components/AppShell';
import { createElementoSQL, updateElementoSQL, getElementsByTabelaSQL } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Elemento = { id:number; nome:string; posicao:string; formato:number };
const tipos:Record<number,string> = {1:'Porcentagem',2:'Inteiro',3:'Decimal',4:'Num + Texto',5:'Texto + Potência',6:'Texto',7:'Tempo',8:'Joules (J)'};
export default function Elementos() {
  const navigate = useNavigate();
  const tabelaId = Number(localStorage.getItem('tabelaId')) || 0;
  const tabelaNome = localStorage.getItem('tabelaNome') || 'Configurações';
  const [elementos,setElementos] = useState<Elemento[]>([]);
  const [aberto,setAberto] = useState(false);
  const [editando,setEditando] = useState<Elemento | null>(null);
  const [form,setForm] = useState({nome:'', posicao:'', tipo:'1'});
  const [erro,setErro] = useState(''); const [salvando,setSalvando] = useState(false);
  useEffect(() => { if (tabelaId) getElementsByTabelaSQL(tabelaId).then(setElementos).catch(e => setErro(e.message)); }, [tabelaId]);
  const abrir = (el?:Elemento) => { setEditando(el || null); setForm({nome:el?.nome || '',posicao:el?.posicao || '',tipo:String(el?.formato || 1)}); setErro(''); setAberto(true); };
  const salvar = async (e:React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    try {
      if (editando) await updateElementoSQL(editando.id,{nome:form.nome.trim(),posicao:form.posicao.trim().toUpperCase(),tipo:Number(form.tipo),tabela_id:tabelaId});
      else await createElementoSQL({nome:form.nome.trim(),posicao:form.posicao.trim().toUpperCase(),tipo:Number(form.tipo),tabela_id:tabelaId});
      const atualizados = await getElementsByTabelaSQL(tabelaId); setElementos(atualizados); localStorage.setItem('elementosTabela',JSON.stringify(atualizados)); setAberto(false);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar o elemento.'); }
    finally { setSalvando(false); }
  };
  return <AppShell section="configuracao"><BackLink onClick={() => navigate('/configurar')}>Voltar para tabelas</BackLink>
    <PageHeading eyebrow={tabelaNome} title="Elementos" description="Defina os campos do modelo e os intervalos de cada farinha." action={<button className="btn-primary" disabled={!tabelaId} onClick={() => abrir()}><Plus size={16}/> Novo elemento</button>}/>
    {!aberto && erro && <p role="alert" className="error-message" style={{marginBottom:18}}>{erro}</p>}
    <section className="panel"><div className="toolbar"><div className="toolbar-title">Elementos configurados <span className="count-badge">{elementos.length}</span></div><span className="text-xs text-muted-foreground">Cada elemento corresponde a uma célula do Excel</span></div>
      {elementos.length === 0 ? <div className="empty-state"><ListChecks size={28}/>Nenhum elemento cadastrado ainda.</div> : elementos.map(el => { const suporta = [1,2,3,7,8].includes(el.formato); return <div className="list-row" key={el.id}><div className="list-row-main"><div className="icon-tile"><ListChecks size={18}/></div><div><h3>{el.nome}</h3><p>Célula {el.posicao} &nbsp;·&nbsp; {tipos[el.formato] || 'Outro'}</p></div></div><div className="row-actions"><button className="btn-outline" onClick={() => abrir(el)}><Pencil size={14}/> Editar</button><button className="btn-outline" disabled={!suporta} title={suporta ? 'Configurar intervalos' : 'Intervalos não disponíveis para este tipo'} onClick={() => {localStorage.setItem('elementoId',String(el.id));localStorage.setItem('elementoFormato',String(el.formato));localStorage.setItem('elementoNome',el.nome);navigate('/intervalos');}}><SlidersHorizontal size={14}/> Intervalos</button></div></div>; })}
    </section>
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>{editando ? 'Editar elemento' : 'Novo elemento'}</DialogTitle></DialogHeader><form onSubmit={salvar} className="dialog-form"><div className="form-field"><label htmlFor="nome">Nome do elemento</label><input id="nome" required value={form.nome} onChange={e => setForm({...form,nome:e.target.value})} placeholder="Ex.: Umidade"/></div><div className="form-grid"><div className="form-field"><label htmlFor="posicao">Célula no Excel</label><input id="posicao" required value={form.posicao} onChange={e => setForm({...form,posicao:e.target.value.toUpperCase()})} placeholder="Ex.: G12"/></div><div className="form-field"><label htmlFor="tipo">Tipo</label><select id="tipo" disabled={!!editando} value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value})}>{Object.entries(tipos).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></div></div>{erro && <p role="alert" className="error-message">{erro}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" onClick={() => setAberto(false)}>Cancelar</button><button disabled={salvando} type="submit" className="btn-primary">{salvando ? 'Salvando...' : 'Salvar elemento'}</button></div></form></DialogContent></Dialog>
  </AppShell>;
}
