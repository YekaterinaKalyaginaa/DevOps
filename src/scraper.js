const { chromium } = require('playwright');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand
} = require('@aws-sdk/client-sqs');

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
    }
});

const sqs = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.SQS_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
    }
});

const BUCKET_NAME = process.env.S3_BUCKET;
const QUEUE_URL = process.env.SQS_QUEUE_URL;

async function scrapeQuotes() {
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

        console.log(`Сбор завершён. Всего цитат: ${quotes.length}`);

        return quotes;

    } finally {
        await browser.close();
    }
}

async function saveToS3(quotes) {
    if (!process.env.S3_ENDPOINT) {
    throw new Error('Не задана переменная S3_ENDPOINT');
    }
    if (!BUCKET_NAME) {
        throw new Error('Не задана переменная S3_BUCKET');
    }

    const key = `quotes-${Date.now()}.json`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(quotes, null, 2),
        ContentType: 'application/json'
    }));

    console.log(`Результат сохранён в S3: ${key}`);
}

async function processJob() {
    if (!QUEUE_URL) {
        throw new Error('Не задана переменная SQS_QUEUE_URL');
    }

    const response = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10
    }));

    if (!response.Messages || response.Messages.length === 0) {
        console.log('В очереди нет заданий');
        return;
    }

    const message = response.Messages[0];

    console.log('Получено задание из SQS');

    const quotes = await scrapeQuotes();

    await saveToS3(quotes);

    await sqs.send(new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle
    }));

    console.log('Задание успешно обработано и удалено из SQS');
}

processJob().catch(error => {
    console.error('Ошибка при обработке задания:', error);
    process.exitCode = 1;
});