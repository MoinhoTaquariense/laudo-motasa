# Configuração e uso dos laudos

## Primeira execução

1. Configure o acesso PostgreSQL e `APP_PASSWORD` (mínimo 12 caracteres) em `Backend/.env`, conforme `Backend/.env.example`. Para um banco novo, execute antes o arquivo `Backend/init.sql`.
2. Na pasta `Backend`, instale as dependências com `npm install` e execute `npm run migrate`. A atualização acrescenta os campos necessários e copia o produto dos intervalos antigos para o campo farinha, mantendo os registros originais.
3. Instale Python 3 com as dependências de `Backend/requirements.txt` usando `python -m pip install -r requirements.txt`. Se o executável não estiver no PATH, indique seu caminho em `PYTHON_PATH` no arquivo `.env`. Neste computador, também é aceito o Python disponibilizado pelo Codex.
4. Depois de instalar as dependências do frontend com `npm install`, dê dois cliques em `Iniciar Laudos.vbs` (ou em `Iniciar Laudos.bat`). O sistema abre no navegador e continua funcionando em segundo plano. Para encerrá-lo, dê dois cliques em `Encerrar Laudos.vbs`. O PostgreSQL precisa estar ativo.

## Configurar e emitir

Em **Configurar dados**, cadastre a tabela, envie seu modelo `.xlsx` com a logo e configure as células de cliente, produto, lote, validade e emissão. As posições sugeridas correspondem ao modelo `P1.xlsx`; confira-as em cada modelo. Para células mescladas, use a célula superior esquerda.

Em **Farinhas**, cadastre o nome ou código de cada farinha e o nome do produto que aparecerá no laudo. Para farinhas já cadastradas, use Editar para informar o produto. Os nomes existentes nos intervalos antigos são incluídos automaticamente nessa lista pela atualização do banco. É possível renomear uma farinha; seus intervalos e laudos anteriores acompanham o novo nome. Farinhas com intervalos ou laudos não podem ser excluídas.

Em **Elementos**, informe o nome, a célula e o tipo. Em cada elemento numérico, cadastre um intervalo e selecione a farinha cadastrada. Os tipos de intervalo disponíveis são porcentagem, inteiro, decimal e tempo. Elementos de outros tipos permanecem como estão no modelo.

No painel, selecione a tabela e a farinha, informe os dados solicitados e gere o arquivo. Os resultados são sorteados dentro dos intervalos cadastrados e guardados por tabela, farinha e data de lote. Em emissões posteriores para a mesma combinação, são reutilizados mesmo que o intervalo tenha sido alterado. Alterar o cliente não altera os resultados.

Se cadastros antigos tiverem mais de um intervalo para a mesma farinha e elemento, revise e exclua ou altere os duplicados antes de gerar. Se faltar um intervalo para algum elemento numérico, o sistema avisa qual elemento precisa de configuração.

O processamento usa a primeira aba do modelo e preserva imagens compatíveis com openpyxl. Confira o primeiro arquivo gerado de cada modelo, especialmente se ele tiver recursos avançados do Excel.
