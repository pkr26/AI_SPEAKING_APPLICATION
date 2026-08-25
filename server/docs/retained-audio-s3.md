# Retained-audio S3 prerequisites

The API refuses production startup/readiness unless both diagnostic and practice buckets satisfy these invariants:

1. S3 Versioning is `Enabled`.
2. Every enabled current/noncurrent expiration rule is filtered by the single exact object tag `retention=transient`.
3. At least one such rule expires both current and noncurrent transient versions in 1–7 days.
4. No enabled broad, prefix-only, date-only, size-limited, or extra-tag expiration rule can touch `retention=retained` versions.

Do not apply a lifecycle update by replacing an existing configuration blindly. Read and review the complete bucket configuration first; `PutBucketLifecycleConfiguration` replaces the bucket's lifecycle configuration.

## Required lifecycle rule

Apply an equivalent rule to each bucket (the API accepts any 1–7 day value):

```json
{
  "Rules": [
    {
      "ID": "expire-transient-audio",
      "Status": "Enabled",
      "Filter": {
        "Tag": {
          "Key": "retention",
          "Value": "transient"
        }
      },
      "Expiration": {
        "Days": 1
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 1
      }
    }
  ]
}
```

Non-expiring transition or incomplete-multipart cleanup rules may coexist. An expiration rule without the exact sole transient tag is intentionally rejected.

## Runtime IAM permissions

Replace the bucket names and keep the diagnostic/practice prefixes separate. This is the minimum action inventory; narrow resources and prefixes in the deployed policy.

Bucket-level actions:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetBucketVersioning", "s3:GetLifecycleConfiguration", "s3:ListBucketVersions"],
  "Resource": ["arn:aws:s3:::DIAGNOSTIC_BUCKET", "arn:aws:s3:::PRACTICE_BUCKET"]
}
```

Object-level actions on the respective `audio-uploads/diagnostic/*` and `audio-uploads/practice/*` resources:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject",
    "s3:GetObjectVersion",
    "s3:DeleteObject",
    "s3:DeleteObjectVersion",
    "s3:PutObjectTagging",
    "s3:PutObjectVersionTagging"
  ],
  "Resource": [
    "arn:aws:s3:::DIAGNOSTIC_BUCKET/audio-uploads/diagnostic/*",
    "arn:aws:s3:::PRACTICE_BUCKET/audio-uploads/practice/*"
  ]
}
```

If the buckets use a customer-managed KMS key, add only the KMS permissions required by that key policy. Keep S3 Block Public Access enabled; no object ACL or public-read permission is needed.

For defense in depth, the bucket/IAM policy can require `s3:RequestObjectTag/retention = transient` and only the `retention` request tag on new `PutObject`/POST uploads. The presigned POST already binds the exact XML tag value in its signed policy.

## Safe rollout

1. Back up and inspect the existing lifecycle and bucket policy.
2. Enable versioning; note that an enabled bucket can later be suspended but never returned to the never-versioned state.
3. Merge the exact transient rule without broadening any other rule.
4. Grant the API runtime identity the scoped actions above.
5. Run `/ready`; it must pass for both buckets.
6. Run the gated live S3 smoke: upload → assessment → Postgres mapping → retained tag → authorized playback → replay → individual deletion → every version/delete marker absent.
7. Only then deploy retained audio to production.

Never test deletion against an unreviewed production bucket. The smoke/load scripts hard-require an authorized nonproduction target.
