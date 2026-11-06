const fs = require('fs');
const path = require('path');

const {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand
} = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    forcePathStyle: true,
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
    }
});

async function downloadQuotes() {
    const bucket = 'quotes-results';
    const downloadDir = path.join(__dirname, '..', 'downloads');

    // Создаём папку, если её ещё нет
    fs.mkdirSync(downloadDir, { recursive: true });

    const list = await s3.send(new ListObjectsV2Command({
        Bucket: bucket
    }));

    if (!list.Contents || list.Contents.length === 0) {
        console.log('В S3 пока нет файлов.');
        return;
    }

    for (const file of list.Contents) {
        const result = await s3.send(new GetObjectCommand({
            Bucket: bucket,
            Key: file.Key
        }));

        const content = await result.Body.transformToString();
        const filePath = path.join(downloadDir, file.Key);

        fs.writeFileSync(filePath, content, 'utf8');

        console.log(`Скачан файл: ${file.Key}`);
    }

    console.log(`Всего файлов: ${list.Contents.length}`);
    console.log(`Папка с результатами: ${downloadDir}`);
}

downloadQuotes().catch(error => {
    console.error('Ошибка скачивания:', error);
    process.exitCode = 1;
});