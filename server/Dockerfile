FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY src/game3d/simulation.ts ./src/game3d/simulation.ts
COPY server/index.cjs ./server/index.cjs
ENV PORT=8787
ENV CHALLENGE_DATA=/data/rooms.json
EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "server/index.cjs"]
