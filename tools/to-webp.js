/* Makes a WebP copy of a picture (JPEG, PNG or WebP) at a given size, with
   nothing to install: a headless Chrome draws it on a canvas and encodes it
   (tools/browser.js).

     node tools/to-webp.js <in> <out.webp> [size=768] [quality=0.86] [flip]

   The picture is scaled so that its longer side is <size> pixels; with the
   word flip it is also mirrored left to right. */
const fs = require('fs');
const path = require('path');
const { open } = require('./browser.js');

async function convert(page, source, target, size, quality, flip = false) {
  const type = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(source).toLowerCase()] || 'image/jpeg';
  const data = `data:${type};base64,${fs.readFileSync(source).toString('base64')}`;
  await page.eval(`window.__src = ${JSON.stringify(data)}`);
  const out = await page.eval(`(async () => {
    const image = new Image();
    image.src = window.__src;
    await image.decode();
    const scale = ${size} / Math.max(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * Math.min(1, scale));
    canvas.height = Math.round(image.naturalHeight * Math.min(1, scale));
    const c = canvas.getContext('2d');
    c.imageSmoothingQuality = 'high';
    if (${flip ? 'true' : 'false'}) { c.translate(canvas.width, 0); c.scale(-1, 1); }
    c.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', ${quality});
  })()`);
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  fs.writeFileSync(target, Buffer.from(out.split(',')[1], 'base64'));
  return fs.statSync(target).size;
}

module.exports = { convert };

if (require.main === module) {
  const [source, target, size = '768', quality = '0.86', flip = ''] = process.argv.slice(2);
  if (!source || !target) {
    console.log('node tools/to-webp.js <in> <out.webp> [size=768] [quality=0.86] [flip]');
    process.exit(1);
  }
  open('about:blank').then(async (page) => {
    const bytes = await convert(page, source, target, Number(size), Number(quality), flip === 'flip');
    await page.close();
    console.log('wrote', target, bytes, 'bytes');
  }).catch((error) => { console.error(error.message); process.exit(1); });
}
