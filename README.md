SetorLink

SetorLink é um sistema web interno desenvolvido para automatizar o envio e a gestão de documentos entre o setor de Recursos Humanos (RH) e os demais setores de uma organização.

O sistema permite que o RH envie documentos para análise, enquanto os setores responsáveis avaliam e validam essas informações dentro de um fluxo organizado.

Problema

Em muitas empresas, o envio de documentos administrativos ocorre por meios informais como:

e-mail

mensagens

compartilhamento manual de arquivos

Esse processo pode gerar:

perda de documentos

falta de controle sobre quem avaliou

dificuldade para acompanhar o status

retrabalho entre setores

O SetorLink centraliza esse processo em uma única plataforma.

Funcionalidades

Envio de documentos do RH para outros setores

Avaliação de documentos pelos setores responsáveis

Cadastro de colaboradores pelo RH

Exclusão ou gerenciamento de documentos

Exportação de documentos avaliados em formato de planilha

Histórico de documentos enviados

Fluxo do Sistema

O RH envia um documento ou solicitação

O setor responsável recebe o documento

O setor analisa e avalia o documento

O sistema registra o status da avaliação

O RH pode visualizar ou exportar os documentos avaliados

Tecnologias Utilizadas

Frontend:

HTML

CSS

JavaScript

React

Backend / Serviços:

Appwrite (backend as a service)

Ambiente de desenvolvimento:

Node.js

Estrutura do Projeto
setorlink/
 ├── public/
 ├── src/
 │   ├── components/
 │   ├── pages/
 │   ├── services/
 │   └── styles/
 ├── package.json
 └── README.md

Como executar o projeto
1️⃣ Clonar o repositório
git clone https://github.com/AdriannAlves8/SetorLink-Web.git

2️⃣ Entrar na pasta do projeto
cd setorlink

3️⃣ Instalar as dependências
npm install

4️⃣ Rodar o projeto
npm run dev


ou

npm start


(depende da configuração do projeto)
