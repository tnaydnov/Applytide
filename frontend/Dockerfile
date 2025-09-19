FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Change this line from npm ci to npm install
RUN npm install
# Add this line to explicitly install axios
RUN npm install axios --save
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]