const { chromium } = require("playwright"); // подключаем Playwright и берем из него Chromium
const fs = require("fs"); // подключаем встроенный модуль Node.js для работы с файлами

async function main() { // асинхронная функция, Playwright выполняет операции, которые требуют ожидания

    const browser = await chromium.launch({ headless: true }); // запускаем Chromium; false означает, что браузер будет отображаться в отдельном окне

    const page = await browser.newPage(); // создаём новую вкладку браузера

    await page.goto("https://quotes.toscrape.com/scroll"); // переходим на страницу из задания

    const quote = page.locator(".quote"); // находим все элементы с классом .quote

    const count = await quote.count(); // узнаём количество найденных цитат

    console.log("Количество цитат:", count);

    const results = []; // создаём пустой массив, в который будем сохранять все цитаты

    for (let i = 0; i < count; i++) { // перебираем все цитаты по очереди

        const currentQuote = quote.nth(i); // берём конкретную цитату по её номеру

        console.log("Цитата №", i + 1);

        const text = await currentQuote.locator(".text").textContent(); // получаем текст цитаты

        const author = await currentQuote.locator(".author").textContent(); // получаем автора

        const tags = await currentQuote.locator(".tag").allTextContents(); // получаем все теги

        console.log("Цитата:", text);
        console.log("Автор:", author);
        console.log("Теги:", tags);

        results.push({ // добавляем полученную цитату в массив результатов
            text: text,
            author: author,
            tags: tags
        });
    }

    console.log(results); // выводим весь массив с собранными цитатами

    const json = JSON.stringify(results, null, 2); // превращаем JavaScript-массив в строку JSON
    fs.mkdirSync("out", { recursive: true });

    fs.writeFileSync("out/result.json", json); // записываем JSON в файл

    await browser.close(); // закрываем браузер после выполнения
}

main();