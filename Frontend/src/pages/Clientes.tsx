import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import AppShell, { PageHeading } from '@/components/AppShell';
import { criarCliente, atualizarCliente, excluirCliente, listarClientes, type Cliente } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Clientes() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const carregar = async () => { try { setItems(await listarClientes()); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao carregar clientes.'); } };
  useEffect(() => { void carregar(); }, []);
  const abrir = (item: Cliente | null) => { setEditando(item); setCodigo(item?.codigo ?? ''); setNome(item?.nome ?? ''); setErro(''); setAberto(true); };
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    if (!codigo.trim() || !nome.trim()) { setErro('Informe o código e o nome do cliente.'); return; }
    setSalvando(true);
    try { if (editando) await atualizarCliente(editando.id, codigo.trim(), nome.trim()); else await criarCliente(codigo.trim(), nome.trim()); setAberto(false); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar cliente.'); }
    finally { setSalvando(false); }
  };
  const remover = async (item: Cliente) => {
    if (!window.confirm(`Excluir o cliente ${item.codigo} - ${item.nome}?`)) return;
    try { await excluirCliente(item.id); setErro(''); await carregar(); } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao excluir cliente.'); }
  };
  const filtrados = items.filter(item => `${item.codigo} ${item.nome}`.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')));
  return <AppShell section="clientes">
    <PageHeading eyebrow="Cadastros" title="Clientes" description="Cadastre os clientes disponíveis para a emissão dos laudos." action={<button className="btn-primary" onClick={() => abrir(null)}><Plus size={16}/> Novo cliente</button>}/>
    {!aberto && erro && <p role="alert" className="error-message" style={{marginBottom:18}}>{erro}</p>}
    <section className="panel"><div className="toolbar"><div className="toolbar-title">Clientes cadastrados <span className="count-badge">{items.length}</span></div><div className="search-wrap"><Search size={16}/><input className="search-input" aria-label="Buscar cliente" placeholder="Buscar código ou nome..." value={busca} onChange={e => setBusca(e.target.value)}/></div></div>
      {filtrados.length === 0 ? <div className="empty-state"><Users size={28}/>{items.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</div> : filtrados.map(item => <div className="list-row" key={item.id}><div className="list-row-main"><div className="icon-tile gold"><Users size={18}/></div><div><h3>{item.nome}</h3><p>Código: {item.codigo}</p></div></div><div className="row-actions"><button className="btn-outline" onClick={() => abrir(item)}><Pencil size={14}/> Editar</button><button className="btn-outline" onClick={() => remover(item)}><Trash2 size={14}/> Excluir</button></div></div>)}
    </section>
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="bg-white rounded-xl"><DialogHeader><DialogTitle>{editando ? 'Editar cliente' : 'Novo cliente'}</DialogTitle></DialogHeader><form onSubmit={salvar} className="dialog-form"><div className="form-field"><label htmlFor="codigo">Código</label><input id="codigo" required maxLength={100} value={codigo} onChange={e => setCodigo(e.target.value)}/></div><div className="form-field"><label htmlFor="nome">Nome</label><input id="nome" required maxLength={200} value={nome} onChange={e => setNome(e.target.value)}/></div>{erro && <p role="alert" className="error-message">{erro}</p>}<div className="dialog-actions"><button type="button" className="btn-outline" onClick={() => setAberto(false)}>Cancelar</button><button type="submit" disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar cliente'}</button></div></form></DialogContent></Dialog>
  </AppShell>;
}
