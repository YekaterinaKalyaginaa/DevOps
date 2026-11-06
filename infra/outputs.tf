output "s3_bucket_name" {
  description = "Name of the S3 bucket for scraper results"
  value       = aws_s3_bucket.results.bucket
}

output "sqs_queue_url" {
  description = "URL of the SQS queue for scraper jobs"
  value       = aws_sqs_queue.jobs.url
}