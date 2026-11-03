import json
import sys
from io import BytesIO
from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell

def main():
    dados = json.load(sys.stdin)
    wb = load_workbook(dados['modelo'])
    ws = wb.active
    for posicao, valor in dados['valores'].items():
        cell = ws[posicao]
        if isinstance(cell, MergedCell):
            raise ValueError(f'{posicao} não é a primeira célula da área mesclada')
        cell.value = valor
        if isinstance(valor, str):
            cell.data_type = 's'
    wb.save(dados['saida'])

if __name__ == '__main__':
    main()
