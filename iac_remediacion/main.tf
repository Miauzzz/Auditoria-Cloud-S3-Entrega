# Definición del Bucket de S3 base
resource "aws_s3_bucket" "archivos" {
  bucket = "archivacloud-p01-test"

  tags = {
    Environment = "Test"
    Audited     = "True"
  }
}

# Remediación 1: Bloqueo total de acceso público
resource "aws_s3_bucket_public_access_block" "secure_bucket_access" {
  bucket                  = aws_s3_bucket.archivos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Remediación 2: Versionado para protección contra sobrescritura/Ransomware
resource "aws_s3_bucket_versioning" "secure_versioning" {
  bucket = aws_s3_bucket.archivos.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Remediación 3: Cifrado en reposo obligatorio con KMS (SSE-KMS)
resource "aws_kms_key" "s3_key" {
  description             = "Llave KMS para cifrado de S3 en ArchivaCloud"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "secure_encryption" {
  bucket = aws_s3_bucket.archivos.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# Remediación 4: AWS WAF con Rate Limiting para mitigar Denegación de Servicio (VULN-002)
resource "aws_wafv2_web_acl" "api_rate_limit" {
  name        = "s3-upload-api-rate-limit"
  scope       = "REGIONAL"
  description = "WAF para prevenir consumo de recursos irrestricto (Billing DoS)"
  default_action { allow {} }
  rule {
    name     = "RateLimitRule"
    priority = 1
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WAFMainMetrics"
    sampled_requests_enabled   = true
  }
}

# Remediación 5: Política de Bucket S3 para forzar conexiones seguras (TLS/HTTPS) (CIS 2.1.2)
resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.archivos.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          "${aws_s3_bucket.archivos.arn}",
          "${aws_s3_bucket.archivos.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}