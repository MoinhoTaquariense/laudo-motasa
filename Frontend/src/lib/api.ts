const BASE = '/api';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) { window.location.assign('/login'); throw new Error('Sessão expirada. Faça login novamente.'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Tabelas ──────────────────────────────────────────────────
export const getTabelasSQL        = ()                => req<any[]>('/tabelas');
export const createTabelaSQL      = (nome: string)    => req<any>('/tabelas', { method: 'POST', body: JSON.stringify({ nome }) });
export const updateTabelaSQL      = (id: number, nome: string) => req<any>(`/tabelas/${id}`, { method: 'PUT', body: JSON.stringify({ nome }) });
export const deleteTabelaSQL      = (id: number)      => req<void>(`/tabelas/${id}`, { method: 'DELETE' });


// ── Elementos ────────────────────────────────────────────────
export const getElementsByTabelaSQL = (tabela_id: number) => req<any[]>(`/elementos?tabela_id=${tabela_id}`);
export const createElementoSQL      = (data: { nome: string; posicao: string; tipo: number; tabela_id: number }) =>
  req<any>('/elementos', { method: 'POST', body: JSON.stringify(data) });
export const updateElementoSQL      = (id: number, data: Partial<{ nome: string; posicao: string; tipo: number; tabela_id: number }>) =>
  req<any>(`/elementos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteElementoSQL      = (id: number) => req<void>(`/elementos/${id}`, { method: 'DELETE' });

// ── Intervalos ───────────────────────────────────────────────
export const getIntervalosByElementoSQL = (elemento_id: number) => req<any[]>(`/intervalos?elemento_id=${elemento_id}`);
export const createIntervaloSQL         = (data: { elemento_id: number; farinha: string; valorMin: number; valorMax: number; vmin_str: string; vmax_str: string; passo_meio: boolean }) =>
  req<any>('/intervalos', { method: 'POST', body: JSON.stringify(data) });
export const updateIntervaloSQL         = (id: number, data: any) =>
  req<any>(`/intervalos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteIntervaloSQL         = (id: number) => req<void>(`/intervalos/${id}`, { method: 'DELETE' });

export const getFarinhas = (id: number) => req<string[]>(`/farinhas?tabela_id=${id}`);
export type Cliente = { id:number; codigo:string; nome:string };
export const listarClientes = () => req<Cliente[]>('/clientes');
export const criarCliente = (codigo:string, nome:string) => req<Cliente>('/clientes', { method:'POST', body:JSON.stringify({codigo,nome}) });
export const atualizarCliente = (id:number, codigo:string, nome:string) => req<Cliente>(`/clientes/${id}`, { method:'PUT', body:JSON.stringify({codigo,nome}) });
export const excluirCliente = (id:number) => req<void>(`/clientes/${id}`, { method:'DELETE' });
export type Farinha = { id:number; tabela_id:number; nome:string; produto:string | null };
export type DetalhesFarinha = Farinha & { elementos: { id:number; nome:string; posicao:string; formato:number; intervalos: { id:number; valormin:number | string; valormax:number | string; vmin_str:string | null; vmax_str:string | null; passo_meio:boolean; cliente:string }[] }[] };
export const detalhesFarinha = (id:number) => req<DetalhesFarinha>(`/farinhas-cadastro/${id}/detalhes`);
export const listarFarinhas = (id: number) => req<Farinha[]>(`/farinhas-cadastro?tabela_id=${id}`);
export const criarFarinha = (tabela_id: number, nome: string, produto: string) => req<Farinha>('/farinhas-cadastro', { method:'POST', body:JSON.stringify({tabela_id,nome,produto}) });
export const renomearFarinha = (id:number, nome:string, produto:string) => req<Farinha>(`/farinhas-cadastro/${id}`, { method:'PUT', body:JSON.stringify({nome,produto}) });
export const excluirFarinha = (id:number) => req<void>(`/farinhas-cadastro/${id}`, { method:'DELETE' });
export const saveCelulas = (id: number, celulas: Record<string, string>) => req(`/tabelas/${id}/celulas`, { method: 'PUT', body: JSON.stringify(celulas) });
export const uploadModelo = async (id: number, file: File) => {
  const body = new FormData(); body.append('modelo', file);
  const res = await fetch(`${BASE}/tabelas/${id}/modelo`, { method: 'POST', body });
  if (res.status === 401) { window.location.assign('/login'); throw new Error('Sessão expirada.'); }
  if (!res.ok) throw new Error((await res.json()).error || 'Erro ao enviar modelo.');
};
export const gerarLaudo = async (data: Record<string, string | number>) => {
  const res = await fetch(`${BASE}/laudos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (res.status === 401) { window.location.assign('/login'); throw new Error('Sessão expirada.'); }
  if (!res.ok) throw new Error((await res.json()).error || 'Erro ao gerar laudo.');
  return res.blob();
};
