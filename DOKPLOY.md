# Publicação no Dokploy

A aplicação usa um frontend Nginx, uma API Node com Python para gerar planilhas e PostgreSQL. O arquivo `compose.yaml` cria os três serviços; somente o frontend deve receber um domínio público. Não publique portas do banco ou da API.

## Antes de publicar

- Faça commit apenas dos arquivos necessários. `.env`, dependências, planilhas locais, compactados e a pasta antiga `PR PYTHON` são ignorados. Confira o conteúdo antes do commit. Não coloque senhas, laudos ou dados de clientes no repositório.
- Crie duas senhas diferentes e longas: uma para `DB_PASSWORD` e outra para `APP_PASSWORD` (no mínimo 12 caracteres, preferencialmente mais). Para facilitar a configuração no Compose, use caracteres alfanuméricos gerados aleatoriamente.
- Para uso interno por HTTP, configure `COOKIE_SECURE=false` no Dokploy. Em acesso por HTTPS, mantenha `COOKIE_SECURE=true`. Em HTTP, a senha e a sessão trafegam sem criptografia na rede.

## Criar a aplicação

1. Envie o projeto para um repositório Git privado e crie no Dokploy um serviço **Docker Compose** apontando para ele, com caminho `compose.yaml` na raiz.
2. Na seção Environment do serviço, defina `DB_PASSWORD` e `APP_PASSWORD`. Para HTTP interno, defina também `COOKIE_SECURE=false`. Essas variáveis são referenciadas explicitamente pelo Compose. Não use os valores de exemplo.
3. Na aba Domains, adicione o domínio apontando para o serviço `frontend`, porta interna `80`. Para HTTPS, habilite o certificado. Consulte a documentação de domínios do Dokploy: https://docs.dokploy.com/docs/core/docker-compose/domains
4. Execute o deploy. O PostgreSQL cria um banco vazio na primeira execução; a API aplica a atualização de esquema ao iniciar. Aguarde os serviços subirem e confira os logs.
5. Acesse pelo endereço configurado, entre com `APP_PASSWORD`, cadastre uma tabela, seu modelo Excel, farinhas, produtos, elementos e intervalos, e teste a geração e abertura de um laudo.

As sessões ficam na memória da API por até oito horas: reiniciar a API encerra os acessos. Use uma única instância da API com essa configuração. A senha de acesso é compartilhada; para usuários individuais e permissões por pessoa, é necessária uma implementação adicional.

## Dados e recuperação

O volume `laudos_db` contém todo o banco, inclusive os modelos Excel enviados e os resultados salvos. Preserve-o em atualizações e configure cópias de segurança externas e regulares; teste a restauração. A documentação do Dokploy informa que o serviço Compose mantém volumes: https://docs.dokploy.com/docs/core/docker-compose

O banco criado no servidor começa vazio e não copia automaticamente os dados deste computador. Para levar os cadastros existentes, faça backup do PostgreSQL de origem, restaure-o no banco de destino em uma janela de manutenção e execute a migração `Backend/migrate.js` com as credenciais de destino. Verifique os dados e teste a emissão após a restauração. Não restaure sobre dados de produção sem antes fazer backup. Não compartilhe backups com pessoas sem autorização: eles podem conter dados de clientes e modelos.

Alterar `DB_PASSWORD` no Dokploy depois que o volume já foi criado não altera a senha existente no PostgreSQL; a troca exige atualizar a senha no banco e na configuração de forma coordenada. Alterar `APP_PASSWORD` exige reiniciar a API e encerra as sessões existentes.

## Uso local

A API agora exige `APP_PASSWORD` no arquivo `Backend/.env`, inclusive no Windows. Defina uma senha de pelo menos 12 caracteres e `COOKIE_SECURE=false` para acesso local por HTTP. Rode `npm run migrate` na pasta Backend antes de iniciar o sistema. Para um banco novo no computador, execute `Backend/init.sql` antes da migração. O iniciador Windows continua usando as dependências instaladas nas pastas Backend e Frontend.
