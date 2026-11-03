import sqlite3
import random
from motor import (sortear_valor, substituir_na_planilha, 
                   contar_casas_decimais, processar_configuracao)

def conectar_banco(db_path='configuracoes.db'):
    """
    Conecta ao banco de dados SQLite
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Permite acessar colunas por nome
    return conn

def ler_configuracoes_db(db_path='configuracoes.db'):
    """
    Lê todas as configurações ativas do banco de dados
    Retorna uma lista de dicionários com as configurações
    """
    configuracoes = []
    
    try:
        conn = conectar_banco(db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT campo, tipo, min_valor, max_valor, texto, posicao, template, expoente
            FROM configuracoes
            WHERE ativo = 1
            ORDER BY id
        """)
        
        rows = cursor.fetchall()
        
        for row in rows:
            campo = row['campo']
            tipo = row['tipo']
            posicao = row['posicao']
            
            if tipo == 'T':
                # Tipo texto
                configuracoes.append({
                    'campo': campo,
                    'tipo': 'T',
                    'texto': row['texto'],
                    'posicao': posicao
                })
            else:
                # Tipos P e N
                min_val = row['min_valor']
                max_val = row['max_valor']
                
                # Determina casas decimais
                casas_decimais = 0
                if min_val is not None and max_val is not None:
                    # Verifica se é float
                    if isinstance(min_val, float) or isinstance(max_val, float):
                        # Conta casas decimais baseado nos valores
                        str_min = str(min_val)
                        str_max = str(max_val)
                        casas_min = len(str_min.split('.')[-1]) if '.' in str_min else 0
                        casas_max = len(str_max.split('.')[-1]) if '.' in str_max else 0
                        casas_decimais = max(casas_min, casas_max)
                
                configuracoes.append({
                    'campo': campo,
                    'tipo': tipo,
                    'min': min_val,
                    'max': max_val,
                    'posicao': posicao,
                    'casas_decimais': casas_decimais,
                    'usa_porcentagem': (tipo == 'P'),
                    'template': row['template'],
                    'expoente': row['expoente']
                })
        
        conn.close()
        return configuracoes
        
    except sqlite3.Error as e:
        print(f"Erro ao acessar banco de dados: {e}")
        return []

def executar_fluxo_db(db_path='configuracoes.db', arquivo_excel='P1.xlsx'):
    """
    Executa o fluxo completo lendo do banco de dados
    """
    # Lê todas as configurações do banco
    configuracoes = ler_configuracoes_db(db_path)
    
    if not configuracoes:
        print("Nenhuma configuração encontrada no banco de dados")
        return
    
    print(f"Encontradas {len(configuracoes)} configurações no banco\n")
    
    for config in configuracoes:
        processar_configuracao(config, arquivo_excel=arquivo_excel)
        print()  

# Exemplo de uso
if __name__ == "__main__":
    executar_fluxo_db(
        db_path='configuracoes.db',
        arquivo_excel='P1.xlsx'
    )
