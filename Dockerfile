
# Стадия 1: устанавливаем зависимости приложения
FROM node:22-bookworm AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci


# Стадия 2: независимо скачиваем Chromium
FROM node:22-bookworm AS browser

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npx playwright install chromium


# Стадия 3: собираем финальный образ
FROM node:22-bookworm AS runtime

WORKDIR /app

COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Устанавливаем системные библиотеки для Chromium
RUN npx playwright install-deps chromium

# Переносим браузер из стадии browser
COPY --from=browser /root/.cache/ms-playwright /root/.cache/ms-playwright

# Код копируем последним для эффективного кэширования
COPY src ./src

CMD ["node", "src/scraper.js"]
