
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const queueUrl = process.argv[2];

if (!queueUrl) {
    throw new Error('Не передан URL очереди SQS');
}

const sqs = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.SQS_ENDPOINT || 'http://localhost:4566',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
    }
});

async function sendJob() {
    await sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
            task: 'scrape_quotes'
        })
    }));

    console.log('Задание успешно отправлено в SQS');
}

sendJob().catch(error => {
    console.error('Не удалось отправить задание:', error);
    process.exitCode = 1;
});
