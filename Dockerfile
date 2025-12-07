###################
# ETAPA 1: BUILD  #
###################
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

# Instala tudo para poder fazer o build
RUN npm install

COPY . .

# Gera o cliente do Prisma
RUN npx prisma generate

# Cria a pasta /dist (Converte TS para JS)
RUN npm run build

###################
# ETAPA 2: FINAL  #
###################
FROM node:22-alpine

WORKDIR /usr/src/app

# Copia apenas o package.json para instalar dependências limpas
COPY package*.json ./
COPY prisma ./prisma/

# Instala APENAS dependências de produção (ignora eslint, jest, ts-node...)
RUN npm install --omit=dev

# Gera o cliente do Prisma novamente para o ambiente final
RUN npx prisma generate

# Copia a pasta dist gerada na etapa anterior
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

# Roda diretamente o JavaScript compilado (Muito mais rápido e leve)
CMD ["node", "dist/main"]