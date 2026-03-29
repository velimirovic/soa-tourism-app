FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS final
COPY --from=build /app/dist/tourism-frontend/browser /usr/share/nginx/html
# Nasa nginx konfiguracija sa proxy pravilima za API Gateway
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]