import random
import openpyxl
from openpyxl import load_workbook, Workbook
import os

# Mapeamento de números para superscript unicode
SUPERSCRIPT = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
}

def numero_para_superscript(numero):
    """
    Converte um número para formato superscript
    Ex: 3 -> ³, 10 -> ¹⁰
    """
    return ''.join(SUPERSCRIPT.get(d, d) for d in str(numero))

def contar_casas_decimais(numero_str):
    """
    Conta o número de casas decimais em uma string de número
    Ex: '13' -> 0, '13.1' -> 1, '13.00' -> 2
    """
    if '.' not in numero_str:
        return 0
    return len(numero_str.split('.')[1])

def ler_todas_configuracoes(arquivo='Intervalos.txt'):
    """
    Lê todas as configurações do arquivo Intervalos.txt
    Formato: campo: min-max, posicao, tipo (P=porcentagem, N=normal), template (opcional), expoente (opcional)
    Template: use {V1} e {V2} para dois valores diferentes. Ex: Máx. {V1} x 10
    Expoente: número do expoente (1, 2, 3, etc) que será convertido para superscript
    Retorna uma lista de dicionários com as configurações
    """
    configuracoes = []
    
    try:
        with open(arquivo, 'r', encoding='utf-8') as f:
            for linha in f:
                linha = linha.strip()
                # Ignora linhas vazias
                if not linha:
                    continue
                
                try:
                    # Formato: campo: min-max, posicao, tipo, template, expoente
                    partes = linha.split(':', 1)  # Limita a 1 split para preservar : no valor
                    if len(partes) < 2:
                        continue
                    
                    campo = partes[0].strip()
                    dados = partes[1].strip().split(',')
                    
                    if len(dados) < 2:
                        print(f"Linha ignorada (menos de 2 campos): {linha}")
                        continue
                    
                    # Posição
                    posicao = dados[1].strip()
                    
                    # Tipo (P=porcentagem, N=normal, T=texto) - padrão é N se não especificado
                    tipo = dados[2].strip().upper() if len(dados) > 2 else 'N'
                    
                    # Se for tipo T (texto), não processa intervalo
                    if tipo == 'T':
                        texto = dados[0].strip()
                        configuracoes.append({
                            'campo': campo,
                            'tipo': 'T',
                            'texto': texto,
                            'posicao': posicao
                        })
                        continue
                    
                    # Para tipos P e N, processa intervalo
                    intervalo = dados[0].strip()
                    valores = intervalo.split('-')
                    
                    if len(valores) != 2:
                        continue
                    
                    # Conta as casas decimais
                    casas_min = contar_casas_decimais(valores[0])
                    casas_max = contar_casas_decimais(valores[1])
                    casas_decimais = max(casas_min, casas_max)
                    
                    # Converte valores
                    if casas_decimais > 0:
                        min_val = float(valores[0])
                        max_val = float(valores[1])
                    else:
                        min_val = int(valores[0])
                        max_val = int(valores[1])
                    
                    usa_porcentagem = (tipo == 'P')
                    
                    # Template (opcional) - texto com {V1} e {V2} para substituir pelos valores
                    template = dados[3].strip() if len(dados) > 3 else None
                    
                    # Expoente (opcional) - pode ser número ou string com {Vn}
                    expoente = None
                    if len(dados) > 4:
                        expoente_str = dados[4].strip()
                        # Pode ser um número direto ou conter {Vn}
                        expoente = expoente_str if expoente_str else None
                    
                    configuracoes.append({
                        'campo': campo,
                        'tipo': tipo,
                        'min': min_val,
                        'max': max_val,
                        'posicao': posicao,
                        'casas_decimais': casas_decimais,
                        'usa_porcentagem': usa_porcentagem,
                        'template': template,
                        'expoente': expoente
                    })
                    
                except Exception as e:
                    print(f"Erro ao processar linha '{linha}': {e}")
                    continue
        
        return configuracoes
        
    except FileNotFoundError:
        print(f"Arquivo {arquivo} não encontrado.")
        return []
    except Exception as e:
        print(f"Erro ao ler arquivo: {e}")
        return []

def ler_intervalo(arquivo='Intervalos.txt', campo='umidade'):
    """
    Lê o intervalo de valores e a posição do arquivo Intervalos.txt
    Formato esperado: umidade: 13-16, G12 (inteiro) ou temperatura: 20.5-25.8, H12 (decimal)
    """
    try:
        with open(arquivo, 'r', encoding='utf-8') as f:
            for linha in f:
                if campo in linha.lower():
                    # Extrai os números do intervalo e a posição
                    partes = linha.split(':')
                    if len(partes) >= 2:
                        dados = partes[1].strip().split(',')
                        # Intervalo
                        intervalo = dados[0].strip()
                        valores = intervalo.split('-')
                        
                        # Conta as casas decimais de cada valor
                        casas_min = contar_casas_decimais(valores[0])
                        casas_max = contar_casas_decimais(valores[1])
                        # Usa o maior número de casas decimais
                        casas_decimais = max(casas_min, casas_max)
                        
                        # Converte para float ou int
                        if casas_decimais > 0:
                            min_val = float(valores[0])
                            max_val = float(valores[1])
                        else:
                            min_val = int(valores[0])
                            max_val = int(valores[1])
                        
                        # Posição (coluna e linha)
                        posicao = dados[1].strip() if len(dados) > 1 else None
                        return min_val, max_val, posicao, casas_decimais
        return None, None, None, 0
    except FileNotFoundError:
        print(f"Arquivo {arquivo} não encontrado.")
        return None, None, None, 0
    except Exception as e:
        print(f"Erro ao ler arquivo: {e}")
        return None, None, None, 0

def sortear_valor(min_val, max_val, casas_decimais=0):
    """
    Sorteia um número dentro do intervalo [min_val, max_val]
    casas_decimais: 0 para inteiro, 1 para uma casa, 2 para duas casas
    Ex: 13-16 com 0 casas -> 13, 14, 15, 16
        13.0-15.0 com 1 casa -> 13.0, 13.1, 13.2, ..., 15.0
        13.00-15.00 com 2 casas -> 13.00, 13.01, 13.02, ..., 15.00
    """
    if casas_decimais == 0:
        # Sorteia inteiro
        return random.randint(int(min_val), int(max_val))
    else:
        # Para decimal, sorteia considerando as casas decimais como incrementos
        # Ex: 13.0 a 15.0 com 1 casa = sorteia entre 130 e 150, depois divide por 10
        multiplicador = 10 ** casas_decimais
        min_int = int(min_val * multiplicador)
        max_int = int(max_val * multiplicador)
        valor_int = random.randint(min_int, max_int)
        valor_decimal = valor_int / multiplicador
        return round(valor_decimal, casas_decimais)

def converter_coluna(coluna_letra):
    """
    Converte letra da coluna para índice numérico (A=1, B=2, etc)
    """
    return ord(coluna_letra.upper()) - ord('A') + 1

def substituir_na_planilha(arquivo_excel, valores, posicao, usa_porcentagem=False, template=None, expoente=None, is_texto=False):
    """
    Substitui o valor sorteado na planilha na posição especificada
    valores: dicionário com {1: valor1, 2: valor2, ...}
    usa_porcentagem: se True, adiciona o símbolo %
    template: se fornecido, substitui {V1}, {V2}, etc pelos valores no template
    expoente: string com {Vn} ou número direto para notação científica
    is_texto: se True, insere texto direto sem formatação
    """
    if not posicao:
        print("Posição não especificada.")
        return False
    
    # Extrai coluna e linha da posição (ex: G12)
    import re
    match = re.match(r'([A-Z]+)([0-9]+)', posicao)
    if not match:
        print(f"Posição inválida: {posicao}")
        return False
    
    coluna_letra = match.group(1)
    linha = int(match.group(2))
    
    try:
        # Verifica se o arquivo existe, senão cria um novo
        if not os.path.exists(arquivo_excel):
            wb = Workbook()
            ws = wb.active
            ws.title = "Dados"
            print(f"Arquivo {arquivo_excel} criado.")
        else:
            wb = load_workbook(arquivo_excel)
            ws = wb.active
        
        # Substitui o valor na célula especificada (mantém a mesclagem)
        celula = f"{coluna_letra}{linha}"
        
        # Se for texto direto, insere sem formatação
        if is_texto:
            valor_formatado = valores.get(1, '')
        # Determina o valor final a inserir
        elif template or expoente:
            # Prepara os valores formatados
            valores_str = {}
            for k, v in valores.items():
                if usa_porcentagem:
                    valores_str[k] = f"{v}%"
                else:
                    valores_str[k] = str(v)
            
            # Começa com o template ou valor direto
            if template:
                valor_formatado = template
            else:
                valor_formatado = valores_str.get(1, '')
            
            # Substitui todos os {Vn} no template
            for k, v_str in valores_str.items():
                valor_formatado = valor_formatado.replace(f'{{V{k}}}', v_str)
            
            # Se tem expoente, processa e adiciona
            if expoente:
                expoente_formatado = expoente
                # Substitui {Vn} no expoente
                for k, v in valores.items():
                    expoente_formatado = expoente_formatado.replace(f'{{V{k}}}', str(int(v)))
                
                # Converte números para superscript
                expoente_super = numero_para_superscript(int(expoente_formatado))
                valor_formatado += expoente_super
        else:
            # Sem template, usa o formato normal
            valor = valores.get(1, 0)
            valor_formatado = f"{valor}%" if usa_porcentagem else valor
        
        # Tenta inserir o valor, tratando células mescladas
        try:
            ws[celula] = valor_formatado
        except AttributeError:
            # Se for célula mesclada, desmescla, insere e remescla
            merged_range = None
            for mr in list(ws.merged_cells.ranges):
                if celula in mr:
                    merged_range = str(mr)
                    ws.unmerge_cells(merged_range)
                    break
            
            ws[celula] = valor_formatado
            
            # Remescla se necessário
            if merged_range:
                ws.merge_cells(merged_range)
        
        # Salva o arquivo
        wb.save(arquivo_excel)
        print(f"Valor {valor_formatado} inserido na célula {celula} com sucesso!")
        return True
        
    except Exception as e:
        print(f"Erro ao manipular planilha: {e}")
        return False

def processar_configuracao(config, arquivo_excel='P1.xlsx'):
    """
    Processa uma configuração individual
    """
    campo = config['campo']
    posicao = config['posicao']
    tipo = config.get('tipo', 'N')
    
    # Se for tipo T (texto), apenas insere o texto
    if tipo == 'T':
        texto = config['texto']
        print(f"=== Processando {campo} ===")
        print(f"Texto: {texto}")
        print(f"Posição: {posicao}")
        print(f"Tipo: Texto fixo")
        
        sucesso = substituir_na_planilha(arquivo_excel, {1: texto}, posicao, False, None, None, is_texto=True)
        
        if sucesso:
            print(f"=== {campo} concluído com sucesso! ===")
        else:
            print(f"=== {campo} concluído com erros ===")
        
        return sucesso
    
    # Para tipos P e N, processa normalmente
    min_val = config['min']
    max_val = config['max']
    casas_decimais = config['casas_decimais']
    usa_porcentagem = config['usa_porcentagem']
    template = config.get('template', None)
    expoente = config.get('expoente', None)
    
    print(f"=== Processando {campo} ===")
    print(f"Intervalo: {min_val} - {max_val}")
    print(f"Posição: {posicao}")
    print(f"Casas decimais: {casas_decimais}")
    print(f"Formato: {'Porcentagem' if usa_porcentagem else 'Normal'}")
    if template:
        print(f"Template: {template}")
    if expoente:
        print(f"Expoente: {expoente}")
    
    # Detecta quantos valores {Vn} existem no template e expoente
    import re
    texto_completo = (template or '') + ' ' + (expoente or '')
    placeholders = re.findall(r'\{V(\d+)\}', texto_completo)
    
    if placeholders:
        # Encontra o maior número de placeholder
        max_placeholder = max([int(n) for n in placeholders])
        
        # Sorteia valores para cada placeholder
        valores_sorteados = {}
        for i in range(1, max_placeholder + 1):
            valores_sorteados[i] = sortear_valor(min_val, max_val, casas_decimais)
        
        print(f"Valores sorteados: {', '.join([f'V{k}={v}' for k, v in valores_sorteados.items()])}")
        
        # Substituir na planilha com todos os valores
        sucesso = substituir_na_planilha(arquivo_excel, valores_sorteados, posicao, usa_porcentagem, template, expoente)
    else:
        # Sem placeholders, sorteia um valor apenas
        valor_sorteado = sortear_valor(min_val, max_val, casas_decimais)
        print(f"Valor sorteado: {valor_sorteado}")
        
        # Substituir na planilha
        sucesso = substituir_na_planilha(arquivo_excel, {1: valor_sorteado}, posicao, usa_porcentagem, template, expoente)
    
    if sucesso:
        print(f"=== {campo} concluído com sucesso! ===")
    else:
        print(f"=== {campo} concluído com erros ===")
    
    return sucesso

def executar_fluxo(arquivo_intervalos='Intervalos.txt', 
                   arquivo_excel='dados.xlsx', 
                   campo_intervalo='umidade'):
    """
    Executa o fluxo completo:
    1. Lê o intervalo e posição do arquivo
    2. Sorteia um valor
    3. Substitui na planilha
    """
    print(f"=== Iniciando processo para {campo_intervalo} ===")
    
    # 1. Ler intervalo e posição
    min_val, max_val, posicao, casas_decimais = ler_intervalo(arquivo_intervalos, campo_intervalo)
    if min_val is None or max_val is None or posicao is None:
        print("Não foi possível ler o intervalo ou posição.")
        return False
    
    print(f"Intervalo lido: {min_val} - {max_val}")
    print(f"Posição: {posicao}")
    print(f"Casas decimais: {casas_decimais}")
    
    # 2. Sortear valor
    valor_sorteado = sortear_valor(min_val, max_val, casas_decimais)
    print(f"Valor sorteado: {valor_sorteado}")
    
    # 3. Substituir na planilha
    sucesso = substituir_na_planilha(arquivo_excel, valor_sorteado, posicao)
    
    if sucesso:
        print("=== Processo concluído com sucesso! ===")
    else:
        print("=== Processo concluído com erros ===")
    
    return sucesso

# Exemplo de uso
if __name__ == "__main__":
    # Lê todas as configurações do arquivo
    configuracoes = ler_todas_configuracoes('Intervalos.txt')
    
    if not configuracoes:
        print("Nenhuma configuração encontrada em Intervalos.txt")
    else:
        print(f"Encontradas {len(configuracoes)} configurações\n")
        
        # Processa cada configuração
        for config in configuracoes:
            processar_configuracao(config, arquivo_excel='P1.xlsx')
            print()  # Linha em branco entre processamentos
