const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const toolDirectory = path.join(localAppData, 'StarClient', 'BuildTools', 'winCodeSign-2.6.0');
const iconPath = path.resolve(__dirname, '..', 'build-assets', 'starclient.ico');

function editExecutable(executablePath) {
  const editorPath = path.join(toolDirectory, 'rcedit-x64.exe');

  if (!fs.existsSync(editorPath)) {
    throw new Error(`Windows resource editor was not prepared: ${editorPath}`);
  }
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Windows executable to edit was not found: ${executablePath}`);
  }
  if (!fs.existsSync(iconPath)) {
    throw new Error(`StarClient icon was not found: ${iconPath}`);
  }

  execFileSync(editorPath, [
    executablePath,
    '--set-icon', iconPath,
    '--set-version-string', 'ProductName', 'StarClient',
    '--set-version-string', 'FileDescription', 'StarClient Launcher',
    '--set-version-string', 'CompanyName', 'StarClient',
  ], { stdio: 'inherit' });
}

module.exports = { editExecutable, toolDirectory };
