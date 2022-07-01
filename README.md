<hr>
<h1 align="center">flem-ppe-backend</h1>
<p align=center><i align="center">Aplicação Backend para o Portal Programa Primeiro Emprego, para o cliente FLEM.</i></p>
<hr>

<div align="center">

<a href="">[![Alerts](https://img.shields.io/lgtm/alerts/github/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend) </a>
<a href="">[![Grade](https://img.shields.io/lgtm/grade/javascript/github/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend)</a>
<a href="">[![Code Size](https://img.shields.io/github/languages/code-size/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend)</a>
<a href="">[![Repo Size](https://img.shields.io/github/repo-size/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend)</a>
<a href="">[![Contributors](https://img.shields.io/github/contributors/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend/graphs/contributors)</a><br>
<a href="">[![Last Commit](https://img.shields.io/github/last-commit/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend/) </a>
<a href="">[![Fork](https://img.shields.io/github/forks/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend/fork) </a>
<a href="">![Version](https://img.shields.io/badge/version-0.0.1-005bff) </a>
<a href="">[![license](https://img.shields.io/github/license/frtechdev/flem-ppe-backend)](https://github.com/frtechdev/flem-ppe-backend/LICENSE)</a>
<br>

</div>

Essa aplicação tem como função servir de Backend para o Portal Primeiro Emprego, um novo conceito de sistema que integra funcionalidades, hoje separadas, de um dos serviços essenciais do cliente (FLEM).

<br>

## Conteúdo

- [Objetivo](#objetivo)
- [Características](#características)
- [Especificações](#especificações)
- [Stack](#stack)
- [Documentação](#documentação)
- [Notas de versão](#notas-de-versão)
- [Como usar este repositório](#como-usar-este-repositório)
  - [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Autores](#autores)
- [Contato](#contato)
- [Licença](#licença)

<br>

## Objetivo

- Apresentar uma nova solução informatizada que facilite, dinamize e aumente a produtividade dos sistemas computacionais que giram em torno do Programa Primeiro Emprego
- Fornecer de maneira segura, confiável e precisa, dados relacionados ao Programa Primeiro Emprego, seguindo os Princípios Básicos de Desenvolvimento, para garantir a sustentabilidade, manutenibilidade e confiabilidade do Software, melhorando sua performance no geral
- Promover documentação clara e densa o suficiente para discriminar processos e permitir que o Software seja facilmente mantido por qualquer profissional da área de Desenvolvimento

<br>

## Características

- Desenhado para assumir a responsabilidade das múltiplas conexões com consulta a APIs não-FLEM e manter um circuito de distribuição de informações onde o Backend seja a fonte principal dos dados
- Fácil modularização, atualização e adequação com diferentes sistemas de bancos de dados e inclusão de funcionalidades

<br>

## Especificações

- **Tipo de Software:** Aplicação Backend
- **Distribuição:** Web
- **Arquitetura:** REST API
- **Metodologia de Projeto:** Metodologia Ágil
- **Estrutura de Biblioteca:** Baseada em Framework
- **Disponibilidade de Código:** Open Source

<br>

## Stack

- **Linguagem Principal:** [Javascript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
- **Framework Principal:** [Node.js](https://nodejs.org/en/docs/)
- **Framework estrutural:** [Next.js](https://nextjs.org/docs/getting-started)
- **Biblioteca de Conexão ODBC:** [Prisma.io](https://www.prisma.io)
- **Banco de Dados:** [SQLite](https://www.sqlite.org/index.html)
- **Gerenciador de Bibliotecas:** [Yarn](https://yarnpkg.com/getting-started)
- **Bibliotecas:** Para uma lista completa de bibliotecas e dependências nos mais variados escopos, conferir o arquivo [package.json](https://github.com/frtechdev/flem-ppe-backend/blob/master/package.json).

<br>

## Documentação

- [Quadros Kanban da Metodologia Ágil](https://frtechnologies.notion.site/Quadro-Kanban-c6994bfdb6ba4ab98434b805635d3fe7)
- [Roadmap](https://miro.com/app/board/uXjVOMzAe7s=/?invite_link_id=872842801580)
- [Documentação das Regras de Negócio](https://frtechnologies.notion.site/Documenta-o-de-Refer-ncia-das-Regras-de-Neg-cio-a66eae4edf5045e4b17e414647500c31)
- Diagramas
  - [Modelo Conceitual de Fluxo de Cadastramento de Beneficiários](https://miro.com/app/board/uXjVONgTB50=/?invite_link_id=986301656145)
  - [Diagrama de Macroprocessos](https://miro.com/app/board/uXjVOOJxdWc=/?invite_link_id=184583999527)
  - [Mapa de Macroprocessos](https://miro.com/app/board/uXjVOOroXvA=/?invite_link_id=576187018086)
  - Diagrama de Banco de Dados

Documentação adicional pode ser encontrada [aqui](https://frtechdev.github.io/flem-ppe-backend/).

<br>

## Notas de versão

Para ver as notas de versão, clique [aqui](https://github.com/frtechdev/flem-ppe-backend/blob/master/CHANGELOG.md).
<br>

## Como usar este repositório

Em breve.

### Variáveis de Ambiente

Para testar a aplicação, crie um arquivo .env com as seguintes variáveis de ambiente:

| Variável                 | Uso  |
| ------------------- | -------|
| `NEXT_PUBLIC_PORT=` | Define porta para uso na execução do Node |
|`NEXT_PUBLIC_DATABASE_URL=`          | Define o endereço do Servidor de BD e credenciais para acesso, de acordo com as especificações da biblioteca [Prisma.io](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/connect-your-database-node-sqlserver)| |
|`NEXT_PUBLIC_UPLOAD_TEMP_DIR=`          | Diretório temporário de armazenamento do upload de arquivo|

| Variável                 | Uso  |
| ------------------- | -------|
|`NEXT_PUBLIC_API_MUNIC=`          | Endereço de API de Municípios |
|`NEXT_PUBLIC_API_MUNIC_FALLBACK=`          | Endereço de API de Fallback de Municípios |
|`NEXT_PUBLIC_BA_API_DEMAND=`          | Endereço de API de Demandantes, do PPE BA |
|`NEXT_PUBLIC_API_PPE_BD_LEGADO=`| Endereço de API de Banco de Dados Legado da FLEM |

<br>

## Autores

<a href="https://github.com/frtechdev/flem-ppe-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=frtechdev/flem-ppe-backend" />
</a>

<br>

## Contato

Se você gostou desse projeto, nos dê uma <a href="https://github.com/frtechdev/flem-ppe-backend" data-icon="octicon-star" aria-label="Star frtechdev/flem-ppe-backend on GitHub">estrela</a>. Isso agirá como um indicador da qualidade dos nossos serviços. <br>
Para contato, envie um email a: <a href="mailto:devops@frtechnologies.com.br">devops@frtechnologies.com.br</a>

<br>

## Licença

Licenciado sob a [MIT License](https://github.com/frtechdev/flem-ppe-backend/blob/main/LICENSE).
