import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Wheat, Pencil, Trash2, Eye } from 'lucide-react';
import AppShell, { BackLink, PageHeading } from '@/components/AppShell';
import { criarFarinha, excluirFarinha, listarFarinhas, renomearFarinha, getTabelasSQL, detalhesFarinha, createIntervaloSQL, updateIntervaloSQL, type Farinha, type DetalhesFarinha } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const tipos:Record<number,string> = {1:'Porcentagem',2:'Inteiro',3:'Decimal',4:'Número + texto',5:'Texto + potência',6:'Texto',7:'Tempo',8:'Joules (J)'};
const valorIntervalo = (texto:string | null, valor:number | string, formato:number) => {
  if (texto != null) return texto.replace('.', ',');
  if (formato === 7) { const segundos = Number(valor); return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`; }
  return String(valor).replace('.', ',');
};

export default function Farinhas() {
  const navigate = useNavigate(); const { tabelaId } = useParams(); const idTabela = Number(tabelaId);
  const [nomeTabela, setNomeTabela] = useState(''); const [items, setItems] = useState<Farinha[]>([]);
  const [busca, setBusca] = useState(''); const [aberto, setAberto] = useState(false); const [editando, setEditando] = useState<Farinha | null>(null);
  const [produto, setProduto] = useState('');
  const [nome, setNome] = useState(''); const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false);
  const [visualizando, setVisualizando] = useState<Farinha | null>(null); const [detalhes, setDetalhes] = useState<DetalhesFarinha | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false); const [erroDetalhes, setErroDetalhes] = useState(''); const pedidoDetalhes = useRef(0);
  const [editandoElemento, setEditandoElemento] = useState<number | null>(null);
  const [intervaloForm, setIntervaloForm] = useState({ min:'', max:'', passo_meio:false });
  const [erroIntervalo, setErroIntervalo] = useState(''); const [salvandoIntervalo, setSalvandoIntervalo] = useState(false);
  const carregar = async () => { try { setItems(await listarFarinhas(idTabela)); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao carregar farinhas.'); } };
  useEffect(() => { carregar(); getTabelasSQL().then(t => setNomeTabela(t.find(x => x.id === idTabela)?.nome ?? '')).catch(() => {}); }, [idTabela]);
  const abrir = (item:Farinha | null) => { setEditando(item); setNome(item?.nome ?? ''); setProduto(item?.produto ?? ''); setErro(''); setAberto(true); };
  const salvar = async (e:React.FormEvent) => { e.preventDefault(); setSalvando(true); setErro(''); try { if (editando) await renomearFarinha(editando.id,nome.trim(),produto.trim()); else await criarFarinha(idTabela,nome.trim(),produto.trim()); setAberto(false); await carregar(); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar farinha.'); } finally { setSalvando(false); } };
  const remover = async (item:Farinha) => { if (!window.confirm(`Excluir a farinha "${item.nome}"?`)) return; setErro(''); try { await excluirFarinha(item.id); await carregar(); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao excluir farinha.'); } };
  const visualizar = async (item:Farinha) => {
    const pedido = ++pedidoDetalhes.current; setVisualizando(item); setDetalhes(null); setErroDetalhes(''); setEditandoElemento(null); setCarregandoDetalhes(true);
    try { const resultado = await detalhesFarinha(item.id); if (pedido === pedidoDetalhes.current) setDetalhes(resultado); }
    catch (e) { if (pedido === pedidoDetalhes.current) setErroDetalhes(e instanceof Error ? e.message : 'Erro ao carregar detalhes.'); }
    finally { if (pedido === pedidoDetalhes.current) setCarregandoDetalhes(false); }
  };
  const editarIntervalo = (el:DetalhesFarinha['elementos'][number]) => {
    const i = el.intervalos[0]; setEditandoElemento(el.id); setErroIntervalo('');
    setIntervaloForm({ min:i ? valorIntervalo(i.vmin_str,i.valormin,el.formato) : '', max:i ? valorIntervalo(i.vmax_str,i.valormax,el.formato) : '', passo_meio:i?.passo_meio ?? false });
  };
  const salvarIntervalo = async (e:React.FormEvent, el:DetalhesFarinha['elementos'][number]) => {
    e.preventDefault(); if (!detalhes || salvandoIntervalo) return;
    const parse = (s:string) => el.formato === 7 ? (/^\d{1,3}:[0-5]\d$/.test(s) ? Number(s.split(':')[0])*60+Number(s.split(':')[1]) : NaN) : Number(s.replace(',', '.'));
    const min = parse(intervaloForm.min), max = parse(intervaloForm.max);
    if (!intervaloForm.min.trim() || !intervaloForm.max.trim() || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) { setErroIntervalo('Informe limites válidos, com o valor final maior que o inicial.'); return; }
    if (intervaloForm.passo_meio && Math.ceil(min * 2 - 1e-8) > Math.floor(max * 2 + 1e-8)) { setErroIntervalo('Não há múltiplos de 0,50 dentro deste intervalo.'); return; }
    const data = { elemento_id:el.id, farinha:detalhes.nome, valorMin:min, valorMax:max, vmin_str:intervaloForm.min.replace(',','.'), vmax_str:intervaloForm.max.replace(',','.'), passo_meio:intervaloForm.passo_meio };
    const pedido = pedidoDetalhes.current; setSalvandoIntervalo(true); setErroIntervalo('');
    try { if (el.intervalos.length) await updateIntervaloSQL(el.intervalos[0].id,data); else await createIntervaloSQL(data); }
    catch (err) { if (pedido === pedidoDetalhes.current) setErroIntervalo(err instanceof Error ? err.message : 'Erro ao salvar intervalo.'); setSalvandoIntervalo(false); return; }
    try { const resultado = await detalhesFarinha(detalhes.id); if (pedido === pedidoDetalhes.current) { setDetalhes(resultado); setEditandoElemento(null); } }
    catch { if (pedido === pedidoDetalhes.current) { setEditandoElemento(null); setErroDetalhes('Intervalo salvo, mas não foi possível atualizar a visualização. Feche e abra novamente.'); } }
    finally { setSalvandoIntervalo(false); }
  };
  const filtered = items.filter(item => item.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));
  return <AppShell section="configuracao"><BackLink onClick={() => navigate('/configurar')}>Voltar para tabelas</BackLink>
    <PageHeading eyebrow={nomeTabela || 'Configurações'} title="Farinhas" description="Cadastre as farinhas que poderão ser usadas nos intervalos e na emissão dos laudos." action={<button className="btn-primary" onClick={() => abrir(null)}><Plus size={16}/> Nova farinha</button>} />
    {!aberto && erro && <p role="alert" className="error-message" style={{marginBottom:18}}>{erro}</p>}
    <section className="panel"><div className="toolbar"><div className="toolbar-title">Farinhas cadastradas <span className="count-badge">{items.length}</span></div><div className="search-wrap"><Search size={16}/><input className="search-input" aria-label="Buscar farinha" placeholder="Buscar farinha..." value={busca} onChange={e => setBusca(e.target.value)}/></div></div>
      {filtered.length === 0 ? <div className="empty-state"><Wheat size={28}/>{items.length === 0 ? 'Nenhuma farinha cadastrada ainda.' : 'Nenhuma farinha encontrada.'}</div> : filtered.map(item => <div className="list-row" key={item.id}><div className="list-row-main"><div className="icon-tile gold"><Wheat size={18}/></div><div><h3>{item.nome}</h3><p>{item.produto || 'Produto não cadastrado'}</p></div></div><div className="row-actions"><button className="btn-outline" aria-label={`Visualizar farinha ${item.nome}`} title="Visualizar detalhes" onClick={() => visualizar(item)}><Eye size={16}/></button><button className="btn-outline" onClick={() => abrir(item)}><Pencil size={14}/> Editar</button><button className="btn-outline" onClick={() => remover(item)}><Trash2 size={14}/> Excluir</button></div></div>)}
    </section>
    <Dialog open={visualizando !== null} onOpenChange={open => { if (!open) { pedidoDetalhes.current++; setVisualizando(null); } }}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>Detalhes da farinha {visualizando?.nome}</DialogTitle></DialogHeader>
      {carregandoDetalhes && <p>Carregando detalhes...</p>}{erroDetalhes && <p role="alert" className="error-message">{erroDetalhes}</p>}
      {detalhes && <div className="space-y-4"><div><p><strong>Tabela:</strong> {nomeTabela || 'Tabela selecionada'}</p><p><strong>Farinha:</strong> {detalhes.nome}</p><p><strong>Produto:</strong> {detalhes.produto || 'Não cadastrado'}</p></div><div><h3 className="font-semibold">Elementos e intervalos</h3>
        {detalhes.elementos.length === 0 ? <p className="text-sm text-muted-foreground mt-2">Nenhum elemento cadastrado nesta tabela.</p> : <div className="space-y-3 mt-3">{detalhes.elementos.map(el => <div key={el.id} className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{el.nome}</p><p className="text-sm text-muted-foreground">Célula {el.posicao} · {tipos[el.formato] || 'Outro'}</p></div>
            {[1,2,3,7,8].includes(el.formato) && <button type="button" className="btn-outline" disabled={salvandoIntervalo || el.intervalos.length > 1} aria-label={`Editar intervalo de ${el.nome}`} title={el.intervalos.length > 1 ? 'Revise os intervalos duplicados na tela de intervalos.' : 'Editar intervalo'} onClick={() => editarIntervalo(el)}><Pencil size={14}/></button>}</div>
          {el.intervalos.length ? el.intervalos.map(i => <div key={i.id} className="text-sm mt-1"><p>Intervalo: {valorIntervalo(i.vmin_str,i.valormin,el.formato)} a {valorIntervalo(i.vmax_str,i.valormax,el.formato)}</p>{i.passo_meio && <p>Valores de 0,50 em 0,50</p>}{i.cliente && <p>Cadastro anterior: {i.cliente}</p>}</div>) : <p className="text-sm mt-1">{[1,2,3,7,8].includes(el.formato) ? 'Intervalo não cadastrado para esta farinha.' : 'Este tipo não utiliza intervalo.'}</p>}
          {el.intervalos.length > 1 && <p className="text-sm text-red-700 mt-1">Há mais de um intervalo para este elemento; revise os cadastros na tela de intervalos.</p>}
          {editandoElemento === el.id && <form onSubmit={e => salvarIntervalo(e,el)} className="dialog-form"><div className="form-grid">{([['min','Valor inicial'],['max','Valor final']] as const).map(([campo,label]) => <div className="form-field" key={campo}><label htmlFor={`detalhe-${el.id}-${campo}`}>{label}</label><input id={`detalhe-${el.id}-${campo}`} required placeholder={el.formato === 7 ? 'MM:SS' : 'Ex.: 13,50'} value={intervaloForm[campo]} onChange={e => setIntervaloForm({...intervaloForm,[campo]:e.target.value})}/></div>)}</div>
            {[1,3,8].includes(el.formato) && <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={intervaloForm.passo_meio} onChange={e => setIntervaloForm({...intervaloForm,passo_meio:e.target.checked})}/> Somente valores de 0,50 em 0,50</label>}
            {erroIntervalo && <p role="alert" className="error-message">{erroIntervalo}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" disabled={salvandoIntervalo} onClick={() => setEditandoElemento(null)}>Cancelar</button><button type="submit" className="btn-primary" disabled={salvandoIntervalo}>{salvandoIntervalo ? 'Salvando...' : 'Salvar intervalo'}</button></div></form>}
        </div>)}</div>}
      </div></div>}
    </DialogContent></Dialog>
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>{editando ? 'Editar farinha' : 'Nova farinha'}</DialogTitle></DialogHeader><form onSubmit={salvar} className="dialog-form"><div className="form-field"><label htmlFor="nome">Nome ou código</label><input id="nome" required maxLength={200} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: 80002"/></div><div className="form-field"><label htmlFor="produto">Nome do produto no laudo</label><input id="produto" required maxLength={200} value={produto} onChange={e => setProduto(e.target.value)} placeholder="Nome do produto"/></div>{erro && <p role="alert" className="error-message">{erro}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" onClick={() => setAberto(false)}>Cancelar</button><button disabled={salvando} type="submit" className="btn-primary">{salvando ? 'Salvando...' : 'Salvar farinha'}</button></div></form></DialogContent></Dialog>
  </AppShell>;
}
