
$ErrorActionPreference = "Stop"

# Получаем URL очереди из Terraform
$queueUrl = terraform -chdir=infra output -raw sqs_queue_url

if ($LASTEXITCODE -ne 0) {
    throw "Не удалось получить URL очереди SQS"
}

# Настраиваем AWS-переменные для запуска на Windows
$env:AWS_REGION = "us-east-1"
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:SQS_ENDPOINT = "http://localhost:4566"

# Отправляем задание в SQS
node src/send-job.js $queueUrl

if ($LASTEXITCODE -ne 0) {
    throw "Не удалось отправить задание в SQS"
}

# Для контейнера используем имя сервиса floci
$containerQueueUrl = $queueUrl -replace "localhost", "floci"

# Запускаем парсер в Docker
docker compose run --rm -e "SQS_QUEUE_URL=$containerQueueUrl" scraper

if ($LASTEXITCODE -ne 0) {
    throw "Ошибка выполнения парсера"
}
