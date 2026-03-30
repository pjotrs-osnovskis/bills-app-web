import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { rcedit } from 'rcedit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.PROJECT_DIR ? path.resolve(process.env.PROJECT_DIR) : path.resolve(__dirname, '..');

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const buildDir = path.join(root, 'build');
  const iconSvg = path.join(buildDir, 'icon.svg');
  const iconPng = path.join(buildDir, 'icon.png');
  const iconIco = path.join(buildDir, 'icon.ico');
  const appOutDir = process.argv[2];
  const exeNameArg = process.argv[3];
  const unpackedDir = appOutDir || path.join(root, 'dist', 'win-unpacked');
  let exeName;
  let exePath;
  if (exeNameArg) {
    exeName = exeNameArg.endsWith('.exe') ? exeNameArg : exeNameArg + '.exe';
    exePath = path.join(unpackedDir, exeName);
  } else {
    if (!fs.existsSync(unpackedDir)) {
      console.warn('apply-icon: unpacked dir not found', unpackedDir);
      return;
    }
    const files = fs.readdirSync(unpackedDir, { withFileTypes: true });
    const exeFile = files.find((f) => f.isFile() && f.name.endsWith('.exe') && !f.name.toLowerCase().startsWith('uninstall'));
    if (!exeFile) {
      console.warn('apply-icon: no app exe found in', unpackedDir);
      return;
    }
    exeName = exeFile.name;
    exePath = path.join(unpackedDir, exeName);
  }

  if (!fs.existsSync(exePath)) {
    console.warn('apply-icon: exe not found at', exePath);
    process.exit(1);
  }

  const icoSizes = [256, 48, 32, 16];
  if (!fs.existsSync(iconIco)) {
    const iconSource = fs.existsSync(iconSvg) ? iconSvg : iconPng;
    if (!fs.existsSync(iconSource)) {
      console.warn('apply-icon: build/icon.ico, icon.svg or icon.png not found.');
      process.exit(1);
    }
    const pngs = [];
    for (const size of icoSizes) {
      const tmp = path.join(buildDir, `icon-${size}.png`);
      await sharp(iconSource).resize(size, size).png().toFile(tmp);
      pngs.push(tmp);
    }
    const icoBuf = await pngToIco(pngs);
    fs.writeFileSync(iconIco, icoBuf);
    for (const f of pngs) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  }

  await rcedit(exePath, { icon: path.resolve(iconIco) });
  console.log('apply-icon: icon applied to', exeName);
}

main().catch((err) => {
  console.error('apply-icon failed:', err);
  process.exit(1);
});
