# 무의존성 Node 서버 — NAS(시놀로지 Container Manager 등)에서 그대로 실행
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=8080
EXPOSE 8080
# npm install 불필요 (외부 의존성 없음)
CMD ["node", "server/server.js"]
