import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');
const iconSvg = path.join(buildDir, 'icon.svg');
const iconPng = path.join(buildDir, 'icon.png');
const iconIco = path.join(buildDir, 'icon.ico');
const uninstallerSvg = path.join(buildDir, 'uninstaller-icon.svg');
const uninstallerIco = path.join(buildDir, 'uninstallerIcon.ico');
const minSize = 256;

if (fs.existsSync(iconSvg)) {
  await sharp(iconSvg).resize(minSize, minSize).png().toFile(iconPng);
  console.log('build-icon: build/icon.png generated from icon.svg');
} else if (fs.existsSync(iconPng)) {
  const meta = await sharp(iconPng).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w < minSize || h < minSize) {
    const tmp = path.join(buildDir, 'icon-256-tmp.png');
    await sharp(iconPng).resize(minSize, minSize).png().toFile(tmp);
    fs.renameSync(tmp, iconPng);
    console.log('build-icon: build/icon.png upscaled to 256x256');
  }
}

const icoSizes = [256, 48, 32, 16];
if (fs.existsSync(iconPng)) {
  const tmpFiles = [];
  const pngs = [];
  for (const size of icoSizes) {
    const tmp = path.join(buildDir, `icon-${size}.png`);
    await sharp(iconPng).resize(size, size).png().toFile(tmp);
    tmpFiles.push(tmp);
    pngs.push(tmp);
  }
  const icoBuf = await pngToIco(pngs);
  fs.writeFileSync(iconIco, icoBuf);
  for (const f of tmpFiles) {
    try { fs.unlinkSync(f); } catch (_) {}
  }
}

if (fs.existsSync(uninstallerSvg)) {
  const tmpPng = path.join(buildDir, 'uninstaller-256-tmp.png');
  await sharp(uninstallerSvg).resize(minSize, minSize).png().toFile(tmpPng);
  const icoBuf = await pngToIco(tmpPng);
  fs.writeFileSync(uninstallerIco, icoBuf);
  try { fs.unlinkSync(tmpPng); } catch (_) {}
  console.log('build-icon: build/uninstallerIcon.ico generated');
}
