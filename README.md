# 🧠 Simula.IA - Backend

> API inteligente para geração e gestão de simulados usando Inteligência Artificial Generativa.

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

## 📖 Sobre o Projeto

O **Simula.IA** é uma plataforma que auxilia professores na criação de provas e alunos no estudo prático. O diferencial é o uso do **Google Gemini (Flash 1.5)** para:
1.  **Gerar Questões:** Criação automática baseada em tópicos, dificuldade e contexto (Few-Shot Prompting).
2.  **Correção Semântica:** Analisa respostas discursivas para validar o conceito, não apenas palavras-chave.
3.  **Correção Visual (Vision AI):** Analisa desenhos enviados pelos alunos (ex: "Desenhe uma mitocôndria") e fornece feedback.

## 🚀 Funcionalidades Principais

* **Autenticação & Segurança:** Login JWT, RBAC (Roles: Professor/Student), Guards de proteção.
* **Gestão de Provas:** CRUD de Questões (Objetiva, V/F, Discursiva, Desenho) e Disciplinas.
* **Engine de Simulação:** Geração híbrida (Banco de Questões + IA + Manual).
* **Exportação:** Geração de arquivos `.pdf` e `.docx` formatados para impressão.

## 🛠️ Tecnologias

* **Framework:** NestJS (Node.js)
* **Database:** PostgreSQL + Prisma ORM
* **AI Model:** Google Gemini 1.5 Flash (via Google Generative AI SDK)
* **Docs:** Swagger (OpenAPI 3.0)
* **Testes:** Jest (Unitários e Cobertura)
* **Infra:** Docker & Docker Compose

## 📦 Como Rodar Localmente

### Pré-requisitos
* Node.js (v18+)
* Docker e Docker Compose

### Passo a Passo

1.  **Clone o repositório**
    ```bash
    git clone [https://github.com/seu-usuario/simula-ia-back.git](https://github.com/seu-usuario/simula-ia-back.git)
    cd simula-ia-back
    ```

2.  **Configure as Variáveis de Ambiente**
    Crie um arquivo `.env` na raiz:
    ```env
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/simula_ia?schema=public"
    JWT_SECRET="sua_chave_secreta_aqui"
    JWT_EXPIRES_IN="7d"
    GEMINI_API_KEY="sua_chave_api_google_aistudio"
    PORT=3000
    ```

3.  **Suba o Banco de Dados (Docker)**
    ```bash
    docker-compose up -d
    ```

4.  **Instale as Dependências**
    ```bash
    npm install
    ```

5.  **Execute as Migrations e o Seed (Dados Iniciais)**
    ```bash
    npx prisma migrate dev --name init
    npx prisma db seed
    ```

6.  **Inicie o Servidor**
    ```bash
    npm run start:dev
    ```

7.  **Acesse a Documentação**
    Abra o navegador em: `http://localhost:3000/docs`

## 🧪 Testes

O projeto possui alta cobertura de testes unitários, incluindo mocks da API do Gemini e do Prisma.

```bash
# Rodar testes unitários
npm run test

# Verificar cobertura (Coverage)
npm run test:cov
```

