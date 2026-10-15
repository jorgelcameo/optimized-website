# Deploying images to S3

Everything here was applied with profile **`personal-dev`**, region **`us-east-2`**, bucket **`max-payne-assets`** (account `102171546465`).

## 1. Bucket

```bash
aws s3api create-bucket \
  --bucket max-payne-assets \
  --region us-east-2 \
  --create-bucket-configuration LocationConstraint=us-east-2 \
  --profile personal-dev
```

## 2. Public read (bucket policy)

Objects are public-read via a bucket policy (not ACLs — object ownership is
`BucketOwnerEnforced` by default). First allow a public policy:

```bash
aws s3api put-public-access-block \
  --bucket max-payne-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --profile personal-dev

aws s3api put-bucket-policy \
  --bucket max-payne-assets \
  --policy file://infra/bucket-policy.json \
  --profile personal-dev
```

`infra/bucket-policy.json` grants `s3:GetObject` to `*` on `max-payne-assets/*`.

## 3. Static website hosting (optional)

```bash
aws s3api put-bucket-website \
  --bucket max-payne-assets \
  --website-configuration \
    '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"error.html"}}' \
  --profile personal-dev
```

> The website endpoint (`*.s3-website.<region>.amazonaws.com`) is **HTTP-only** and
> does **not** support CORS-mode fetches. We use the **REST endpoint**
> (`max-payne-assets.s3.<region>.amazonaws.com`, HTTPS) for `ASSETS_BASE_URL`.

## 4. CORS

```bash
aws s3api put-bucket-cors \
  --bucket max-payne-assets \
  --cors-configuration file://infra/cors.json \
  --profile personal-dev
```

## 5. Upload images

```bash
npm run deploy:assets
```

This runs `aws s3 sync src/assets/images s3://max-payne-assets/assets/images`
with `--cache-control "public, max-age=31536000, immutable"` using the settings in
`.env` (`S3_BUCKET`, `S3_REGION`, `S3_KEY_PREFIX`, `AWS_PROFILE`).

## 6. Point the site at S3 and build

`.env`:

```
ASSETS_BASE_URL=https://max-payne-assets.s3.us-east-2.amazonaws.com
```

```bash
npm run build     # copies src -> dist and rewrites asset URLs to ASSETS_BASE_URL
npm run serve:dist
```

## Why cross-origin images are precached with `no-cors`

The first attempt precached the S3 images with **cors**-mode fetches
(`cache.addAll`). That failed intermittently with:

```
TypeError: Failed to fetch
corsErrorStatus: { corsError: "MissingAllowOriginHeader" }
```

Root cause: a **cache race**. `<img>` tags fetch images in **no-cors** mode, so the
browser sends no `Origin` header and S3 returns no `Access-Control-Allow-Origin`.
That response gets cached under the image URL. A later **cors** fetch of the same
URL reuses the cached (header-less) response and fails the CORS check. Whichever
request wins the race determines success — hence the flakiness.

(The S3 *website* endpoint fails deterministically for a different reason: it does
not support CORS-mode fetches at all.)

**Fix:** precache cross-origin images with `mode:"no-cors"` and store the opaque
responses. `<img>` requests are no-cors too, so the cached entries match them, and
no `Access-Control-Allow-Origin` is required. This is the standard approach for
cross-origin images in a service worker (Workbox does the same). The bucket CORS
config is kept for any future CORS-mode reads.

## IAM

`infra/iam-deploy-policy.json` is a least-privilege policy (bucket + object actions
on `max-payne-assets`) for the deploy user `personal-dev`.
