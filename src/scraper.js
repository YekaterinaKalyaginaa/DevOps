
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
    const browser = await chromium.launch({ headless: true });

    try {
        const page = await browser.newPage();

        console.log('Открываем сайт...');
        await page.goto('https://quotes.toscrape.com/scroll', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        const allQuotes = new Map(); //уникальные цитаты 
        let previousCount = 0;//запоминает число цитат на предыдущей итерации 
        let stableRounds = 0;//Считает последовательные проверки без новых цитат

        console.log('Начинаем сбор цитат с прокруткой...');

        while (stableRounds < 3) {
            // Собираем все цитаты, которые уже появились на странице
            const currentQuotes = await page.locator('.quote').evaluateAll(elements =>
                elements.map(element => ({
                    text: element.querySelector('.text')?.innerText.trim() ?? '',
                    author: element.querySelector('.author')?.innerText.trim() ?? '',
                    tags: Array.from(element.querySelectorAll('.tags .tag'))
                        .map(tag => tag.innerText.trim())
                }))
            );

            // Добавляем цитаты в коллекцию без повторов
            for (const quote of currentQuotes) {
                if (quote.text) {
                    allQuotes.set(quote.text, quote);
                }
            }

            console.log(`Собрано уникальных цитат: ${allQuotes.size}`);

            if (allQuotes.size === previousCount) {
                stableRounds++;
            } else {
                stableRounds = 0;
            }

            previousCount = allQuotes.size;

            // Прокручиваем страницу вниз, чтобы подгрузились новые цитаты
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            // Даём сайту время загрузить новые данные
            await page.waitForTimeout(1200);
        }

        const quotes = Array.from(allQuotes.values());

        if (quotes.length === 0) {
            throw new Error('Цитаты не найдены. Проверь доступность сайта и селекторы.');
        }

        const outputDir = path.join(__dirname, '..', 'out');
        const outputFile = path.join(outputDir, 'result.json');

        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputFile, JSON.stringify(quotes, null, 2), 'utf8');

        console.log(`\nСбор завершён. Всего уникальных цитат: ${quotes.length}`);
        console.log(`Результат сохранён в ${outputFile}`);

    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error('Ошибка при сборе цитат:', error);
    process.exitCode = 1;
});
