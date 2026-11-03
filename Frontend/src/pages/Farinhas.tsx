import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Wheat, Pencil, Trash2 } from 'lucide-react';
import AppShell, { BackLink, PageHeading } from '@/components/AppShell';
import { criarFarinha, excluirFarinha, listarFarinhas, renomearFarinha, getTabelasSQL, type Farinha } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Farinhas() {
  const navigate = useNavigate(); const { tabelaId } = useParams(); const idTabela = Number(tabelaId);
  const [nomeTabela, setNomeTabela] = useState(''); const [items, setItems] = useState<Farinha[]>([]);
  const [busca, setBusca] = useState(''); const [aberto, setAberto] = useState(false); const [editando, setEditando] = useState<Farinha | null>(null);
  const [produto, setProduto] = useState('');
  const [nome, setNome] = useState(''); const [erro, setErro] = useState(''); const [salvando, setSalvando] = useState(false);
  const carregar = async () => { try { setItems(await listarFarinhas(idTabela)); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao carregar farinhas.'); } };
  useEffect(() => { carregar(); getTabelasSQL().then(t => setNomeTabela(t.find(x => x.id === idTabela)?.nome ?? '')).catch(() => {}); }, [idTabela]);
  const abrir = (item:Farinha | null) => { setEditando(item); setNome(item?.nome ?? ''); setProduto(item?.produto ?? ''); setErro(''); setAberto(true); };
  const salvar = async (e:React.FormEvent) => { e.preventDefault(); setSalvando(true); setErro(''); try { if (editando) await renomearFarinha(editando.id,nome.trim(),produto.trim()); else await criarFarinha(idTabela,nome.trim(),produto.trim()); setAberto(false); await carregar(); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar farinha.'); } finally { setSalvando(false); } };
  const remover = async (item:Farinha) => { if (!window.confirm(`Excluir a farinha "${item.nome}"?`)) return; setErro(''); try { await excluirFarinha(item.id); await carregar(); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao excluir farinha.'); } };
  const filtered = items.filter(item => item.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));
  return <AppShell section="configuracao"><BackLink onClick={() => navigate('/configurar')}>Voltar para tabelas</BackLink>
    <PageHeading eyebrow={nomeTabela || 'Configurações'} title="Farinhas" description="Cadastre as farinhas que poderão ser usadas nos intervalos e na emissão dos laudos." action={<button className="btn-primary" onClick={() => abrir(null)}><Plus size={16}/> Nova farinha</button>} />
    {!aberto && erro && <p role="alert" className="error-message" style={{marginBottom:18}}>{erro}</p>}
    <section className="panel"><div className="toolbar"><div className="toolbar-title">Farinhas cadastradas <span className="count-badge">{items.length}</span></div><div className="search-wrap"><Search size={16}/><input className="search-input" aria-label="Buscar farinha" placeholder="Buscar farinha..." value={busca} onChange={e => setBusca(e.target.value)}/></div></div>
      {filtered.length === 0 ? <div className="empty-state"><Wheat size={28}/>{items.length === 0 ? 'Nenhuma farinha cadastrada ainda.' : 'Nenhuma farinha encontrada.'}</div> : filtered.map(item => <div className="list-row" key={item.id}><div className="list-row-main"><div className="icon-tile gold"><Wheat size={18}/></div><div><h3>{item.nome}</h3><p>{item.produto || 'Produto não cadastrado'}</p></div></div><div className="row-actions"><button className="btn-outline" onClick={() => abrir(item)}><Pencil size={14}/> Editar</button><button className="btn-outline" onClick={() => remover(item)}><Trash2 size={14}/> Excluir</button></div></div>)}
    </section>
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>{editando ? 'Editar farinha' : 'Nova farinha'}</DialogTitle></DialogHeader><form onSubmit={salvar} className="dialog-form"><div className="form-field"><label htmlFor="nome">Nome ou código</label><input id="nome" required maxLength={200} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: 80002"/></div><div className="form-field"><label htmlFor="produto">Nome do produto no laudo</label><input id="produto" required maxLength={200} value={produto} onChange={e => setProduto(e.target.value)} placeholder="Nome do produto"/></div>{erro && <p role="alert" className="error-message">{erro}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" onClick={() => setAberto(false)}>Cancelar</button><button disabled={salvando} type="submit" className="btn-primary">{salvando ? 'Salvando...' : 'Salvar farinha'}</button></div></form></DialogContent></Dialog>
  </AppShell>;
}
