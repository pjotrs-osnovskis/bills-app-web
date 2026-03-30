const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const pkg = require('./package.json');

const build = { ...pkg.build };

build.afterPack = async (context) => {
  if (context.electronPlatformName !== 'win') return;
  const projectDir = path.resolve(context.packager.projectDir);
  const appOutDir = path.resolve(context.appOutDir);
  const iconIco = path.resolve(projectDir, 'build', 'icon.ico');
  if (!fs.existsSync(iconIco)) {
    throw new Error('build/icon.ico not found; run scripts/build-icon.mjs first');
  }
  const entries = fs.readdirSync(appOutDir, { withFileTypes: true });
  const mainExe = entries.find(
    (e) => e.isFile() && e.name.endsWith('.exe') && !e.name.toLowerCase().startsWith('uninstall')
  );
  if (!mainExe) {
    throw new Error('apply-icon: no main exe found in ' + appOutDir);
  }
  const exePath = path.join(appOutDir, mainExe.name);
  const rceditExe = path.join(
    projectDir,
    'node_modules',
    'rcedit',
    'bin',
    process.arch === 'x64' ? 'rcedit-x64.exe' : 'rcedit.exe'
  );
  if (!fs.existsSync(rceditExe)) {
    throw new Error('rcedit not found at ' + rceditExe);
  }
  execFileSync(rceditExe, [exePath, '--set-icon', iconIco], {
    cwd: projectDir,
    stdio: 'inherit'
  });
};

build.win = {
  ...(build.win || {}),
  target: (build.win && build.win.target) || 'nsis',
  signAndEditExecutable: true,
  icon: 'build/icon.ico'
};
build.nsis = {
  ...(build.nsis || {}),
  oneClick: true,
  runAfterFinish: false,
  deleteAppDataOnUninstall: true,
  installerIcon: 'build/icon.ico',
  uninstallerIcon: 'build/uninstallerIcon.ico'
};

module.exports = build;
