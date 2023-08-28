FROM node:14.15.4-alpine3.12 as build

WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY src ./src
COPY public ./public

RUN npm run build

FROM nginx:1.25-alpine3.18
COPY --from=build /app/build /usr/share/nginx/html
COPY /etc/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
