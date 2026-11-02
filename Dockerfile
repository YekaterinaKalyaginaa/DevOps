
# Стадия 1: устанавливаем зависимости приложения
FROM node:22-bookworm AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci


# Стадия 2: готовим окружение для запуска
FROM node:22-bookworm AS runtime

WORKDIR /app

COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Устанавливаем системные библиотеки для Chromium
RUN npx playwright install-deps chromium

# Скачиваем Chromium с помощью установленного Playwright
RUN npx playwright install chromium

# Код копируем последним для эффективного кэширования
COPY src ./src

CMD ["node", "src/scraper.js"]
