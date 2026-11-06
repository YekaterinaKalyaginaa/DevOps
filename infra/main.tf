resource "aws_s3_bucket" "results" {
  bucket        = "quotes-results"
  force_destroy = true
}

resource "aws_sqs_queue" "jobs" {
  name = "quotes-jobs"
}