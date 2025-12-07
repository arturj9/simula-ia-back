###################
# ETAPA 1: BUILD  #
###################
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# 1. Copia arquivos de dependência e configuração
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# 2. Instala todas as dependências (incluindo dev para compilar)
RUN npm install

# 3. Copia o código fonte
COPY . .

# 4. Gera o cliente do Prisma
RUN npx prisma generate

# 5. Compila o projeto (Cria a pasta /dist)
RUN npm run build

###################
# ETAPA 2: FINAL  #
###################
FROM node:22-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

# 1. Copia apenas arquivos essenciais para instalação
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# 2. Instala APENAS dependências de produção (economiza espaço)
RUN npm install --omit=dev

# 3. Gera o cliente do Prisma novamente no ambiente final
# Isso garante que o binário 'linux-musl' correto seja baixado
RUN npx prisma generate

# 4. Copia a aplicação compilada da etapa anterior
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

# 5. Roda a aplicação
CMD ["node", "dist/main"]