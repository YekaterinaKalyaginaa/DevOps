resource "aws_s3_bucket" "results" {
  bucket = "quotes-results"
}

resource "aws_sqs_queue" "jobs" {
  name = "quotes-jobs"
}