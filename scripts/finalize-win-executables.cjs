const fs = require('fs');
const path = require('path');
const { editExecutable } = require('./win-resources.cjs');

if (process.platform !== 'win32') {
  throw new Error('Final Windows executable metadata must be written on Windows.');
}

const outputDirectory = path.resolve(__dirname, '..', 'dist-electron');
editExecutable(path.join(outputDirectory, 'win-unpacked', 'StarClient.exe'));

const installerPath = path.join(outputDirectory, 'StarClient.exe');
if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size < 1024 * 1024) {
  throw new Error(`The NSIS installer is missing or incomplete: ${installerPath}`);
}

console.log('Application executable metadata is embedded; NSIS embeds its configured installer and uninstaller icons.');
