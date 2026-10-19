const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { loadEnv } = require("./load-env");

const ROOT = path.join(__dirname, "..");
// Local .env values are defaults; CI-provided environment variables take precedence.
const env = { ...loadEnv(), ...process.env };

const bucket = env.S3_BUCKET;
const region = env.S3_REGION || "us-east-1";
const prefix = env.S3_KEY_PREFIX || "assets/images";
const profile = env.AWS_PROFILE;
const localDir = path.join(ROOT, "src", "assets", "images");
const localAudioDir = path.join(ROOT, "src", "assets", "audio");

if (!bucket) {
  console.error("S3_BUCKET not set in .env");
  process.exit(1);
}

const dest = `s3://${bucket}/${prefix}`;
const args = [
  "s3", "sync", localDir, dest,
  "--cache-control", "public, max-age=31536000, immutable",
  "--region", region,
];
if (profile) args.push("--profile", profile);

console.log(`> aws ${args.join(" ")}`);
execFileSync("aws", args, { stdio: "inherit" });
console.log(`Uploaded ${path.relative(ROOT, localDir)} -> ${dest}`);

if (fs.existsSync(localAudioDir)) {
  const audioPrefix = env.S3_AUDIO_KEY_PREFIX || "assets/audio";
  const audioDest = `s3://${bucket}/${audioPrefix}`;
  const audioArgs = [
    "s3", "sync", localAudioDir, audioDest,
    "--exclude", "README.md",
    "--cache-control", "public, max-age=31536000, immutable",
    "--region", region,
  ];
  if (profile) audioArgs.push("--profile", profile);
  console.log(`> aws ${audioArgs.join(" ")}`);
  execFileSync("aws", audioArgs, { stdio: "inherit" });
  console.log(`Uploaded ${path.relative(ROOT, localAudioDir)} -> ${audioDest}`);
}

const baseUrl = (env.ASSETS_BASE_URL || "").replace(/\/+$/, "");
if (baseUrl) {
  console.log(`\nAssets base URL: ${baseUrl}`);
  console.log(`Verify: curl -sI ${baseUrl}/${prefix}/max-payne-1-keyart-800.webp`);
}
