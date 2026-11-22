import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function makeTransparent(inputPath, outputPath) {
  const image = sharp(inputPath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  // Process raw RGBA pixels
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Detect white background with smooth falloff threshold
    // pure white is 255, 255, 255
    const brightness = (r + g + b) / 3;
    const colorVariance = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

    if (brightness > 245 && colorVariance < 12) {
      data[i + 3] = 0; // Fully transparent
    } else if (brightness > 220 && colorVariance < 18) {
      // Smooth alpha transition on edges
      const alphaFactor = 1 - (brightness - 220) / (245 - 220);
      data[i + 3] = Math.min(data[i + 3], Math.round(255 * alphaFactor));
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

  console.log(`Generated transparent PNG: ${outputPath}`);
}

async function run() {
  const source = path.resolve(ROOT, 'brand/logo/sola-logo-full.jpg');
  await makeTransparent(source, path.resolve(ROOT, 'brand/logo/sola-logo-transparent.png'));
  await makeTransparent(source, path.resolve(ROOT, 'brand/favicon/favicon.png'));
  await makeTransparent(source, path.resolve(ROOT, 'app/static/logo.png'));
  await makeTransparent(source, path.resolve(ROOT, 'app/static/favicon.png'));
  console.log('All transparent brand files created!');
}

run().catch(console.error);
