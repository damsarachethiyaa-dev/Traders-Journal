// Builds runtime/python: a self-contained Windows Python (python.org "embeddable" build)
// with MetaTrader5 + requests pre-installed. electron-builder ships it inside the installer
// (extraResources) so end users never need to install Python or run setup-mt5.bat.
//
// Runs automatically before `npm run dist`. Needs internet on first run and any Python 3 on
// the build machine (only used to download the wheels). Re-runs are a no-op.
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const PY_VERSION = '3.14.4';                       // keep in sync with PY_TAG below
const PY_TAG = '314';
const PACKAGES = ['MetaTrader5==5.0.6231', 'requests==2.34.2']; // pinned so every build ships the same tested code

const root = path.join(__dirname, '..');
const runtimeDir = path.join(root, 'runtime');
const pyDir = path.join(runtimeDir, 'python');
const sitePkgs = path.join(pyDir, 'Lib', 'site-packages');
const zipPath = path.join(runtimeDir, `python-${PY_VERSION}-embed-amd64.zip`);
const marker = path.join(pyDir, '.prepared');
const url = `https://www.python.org/ftp/python/${PY_VERSION}/python-${PY_VERSION}-embed-amd64.zip`;

function log(m) { console.log('[python-runtime] ' + m); }
function fail(m) { console.error('[python-runtime] ERROR: ' + m); process.exit(1); }

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ encoding: 'utf8' }, opts));
  return r;
}

function download(u, dest, redirects) {
  return new Promise((resolve, reject) => {
    https.get(u, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (redirects || 0) < 5) {
        res.resume();
        return resolve(download(new URL(res.headers.location, u).toString(), dest, (redirects || 0) + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    }).on('error', reject);
  });
}

function findHostPython() {
  for (const c of [['py', ['-3']], ['python', []], ['python3', []]]) {
    const r = run(c[0], c[1].concat(['-c', 'import sys;print(sys.version_info[0])']));
    if (r.status === 0 && String(r.stdout).trim() === '3') return c;
  }
  return null;
}

(async () => {
  if (process.platform !== 'win32') { log('not Windows - skipping'); return; }
  if (fs.existsSync(marker) && fs.existsSync(path.join(pyDir, 'python.exe'))) {
    log('already prepared: ' + pyDir);
    return;
  }

  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(zipPath)) {
    log('downloading ' + url);
    try { await download(url, zipPath); } catch (e) { fail('download failed: ' + e.message); }
  }

  log('extracting');
  fs.rmSync(pyDir, { recursive: true, force: true });
  fs.mkdirSync(pyDir, { recursive: true });
  // Windows' own bsdtar reads zip files; a GNU tar earlier on PATH (Git Bash) treats "C:" as a remote host.
  const winTar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  const ex = run(fs.existsSync(winTar) ? winTar : 'tar', ['-xf', zipPath, '-C', pyDir]);
  if (ex.status !== 0) fail('extract failed: ' + (ex.stderr || ex.stdout));
  if (!fs.existsSync(path.join(pyDir, 'python.exe'))) fail('python.exe missing after extract');

  // Make sure we got the genuine python.org build before shipping it: a valid signature from the PSF, not just anyone.
  const sig = run('powershell.exe', ['-NoProfile', '-Command',
    `$s = Get-AuthenticodeSignature -LiteralPath $env:TJ_PY_EXE; "$($s.Status)|$($s.SignerCertificate.Subject)"`],
    { env: Object.assign({}, process.env, { TJ_PY_EXE: path.join(pyDir, 'python.exe') }) });
  const [sigStatus, signer = ''] = String(sig.stdout).trim().split('|');
  if (sigStatus !== 'Valid') fail('python.exe signature is not valid: ' + sigStatus);
  if (!/O=Python Software Foundation/.test(signer)) fail('python.exe is not signed by the Python Software Foundation: ' + signer);

  // Embeddable builds ignore site-packages unless the ._pth file enables it.
  const pth = path.join(pyDir, `python${PY_TAG}._pth`);
  fs.writeFileSync(pth, [`python${PY_TAG}.zip`, '.', 'Lib\\site-packages', 'import site', ''].join('\r\n'));
  fs.mkdirSync(sitePkgs, { recursive: true });

  const host = findHostPython();
  if (!host) fail('no Python 3 found on this build machine (needed once to fetch ' + PACKAGES.join(', ') + ')');
  log('installing ' + PACKAGES.join(', '));
  const pip = run(host[0], host[1].concat(['-m', 'pip', 'install', '--disable-pip-version-check', '--no-compile',
    '--target', sitePkgs, '--only-binary=:all:', '--platform', 'win_amd64',
    '--python-version', PY_VERSION.split('.').slice(0, 2).join('.'), '--implementation', 'cp'], PACKAGES), { stdio: 'inherit' });
  if (pip.status !== 0) fail('pip install failed');

  // Smoke test with the runtime itself.
  const t = run(path.join(pyDir, 'python.exe'), ['-c', 'import MetaTrader5, requests, ssl, json; print("ok")']);
  if (t.status !== 0 || !/ok/.test(t.stdout)) fail('runtime self-test failed: ' + (t.stderr || t.stdout));

  fs.writeFileSync(marker, `python ${PY_VERSION}; ${PACKAGES.join(', ')}\n`);
  log('ready: ' + pyDir);
})();
