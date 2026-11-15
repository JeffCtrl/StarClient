const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { toolDirectory } = require('./win-resources.cjs');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const builderCache = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign');
const archiveUrl = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';
const fallbackArchive = path.join(toolDirectory, 'winCodeSign-2.6.0.7z');
const sevenZip = path.resolve(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

function cachedArchive() {
  if (!fs.existsSync(builderCache)) return null;

  return fs.readdirSync(builderCache, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.7z'))
    .map((entry) => path.join(builderCache, entry.name))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)[0] || null;
}

function download(url, destination, redirects = 0) {
  if (redirects > 10) {
    return Promise.reject(new Error('Too many redirects while downloading the Windows resource editor.'));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const location = response.headers.location;
        response.resume();
        if (!location) {
          reject(new Error('The resource-editor download returned a redirect without a Location header.'));
          return;
        }
        download(new URL(location, url).toString(), destination, redirects + 1).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Resource-editor download failed with HTTP ${response.statusCode}.`));
        return;
      }

      const output = fs.createWriteStream(destination);
      response.pipe(output);
      output.on('error', reject);
      output.on('finish', () => output.close(resolve));
    });

    request.setTimeout(60000, () => request.destroy(new Error('Resource-editor download timed out.')));
    request.on('error', reject);
  });
}

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('The Windows resource-editor preparation step must run on Windows.');
  }
  if (!fs.existsSync(sevenZip)) {
    throw new Error(`7-Zip was not found at ${sevenZip}. Restore project dependencies before packaging.`);
  }

  fs.mkdirSync(toolDirectory, { recursive: true });
  let archive = cachedArchive();
  if (!archive) {
    console.log('Downloading the pinned electron-builder Windows resource tools.');
    await download(archiveUrl, fallbackArchive);
    archive = fallbackArchive;
  }

  const test = spawnSync(sevenZip, ['t', archive], { stdio: 'inherit' });
  if (test.error) throw test.error;
  if (test.status !== 0) {
    throw new Error(`The Windows resource-tools archive failed validation: ${archive}`);
  }

  console.log('Extracting only the Windows resource editors; unrelated macOS symlinks are not needed.');
  const extraction = spawnSync(sevenZip, [
    'x',
    archive,
    `-o${toolDirectory}`,
    '-y',
    'rcedit-x64.exe',
  ], { stdio: 'inherit' });
  if (extraction.error) throw extraction.error;
  if (extraction.status !== 0) {
    throw new Error(`Could not extract rcedit-x64.exe from ${archive}.`);
  }

  const editor = path.join(toolDirectory, 'rcedit-x64.exe');
  if (!fs.existsSync(editor) || fs.statSync(editor).size < 500000) {
    throw new Error(`The extracted Windows resource editor is missing or incomplete: ${editor}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
