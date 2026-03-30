FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js data-store-file.js data-store-firebase.js session-store-firestore.js password-utils.js user-store.js ./
COPY public ./public

ENV NODE_ENV=production
EXPOSE 8080

USER node
CMD ["node", "server.js"]
