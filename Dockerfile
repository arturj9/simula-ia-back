# 1. Imagem base leve do Node.js
FROM node:22-alpine

# 2. Diretório de trabalho dentro do container
WORKDIR /usr/src/app

# 3. Copia apenas os arquivos de dependência primeiro (para cachear o npm install)
COPY package*.json ./
COPY prisma ./prisma/

# 4. Instala dependências
RUN npm install 

# 5. Gera o cliente do Prisma (para o Linux do container)
RUN npx prisma generate

# 6. Copia o resto do código fonte
COPY . .

# 7. Compila o projeto NestJS
RUN npm run build

# 8. Expõe a porta 3000
EXPOSE 3000

# 9. Comando para iniciar a aplicação (Modo Produção)
CMD ["npm", "run", "start:prod"]