const path = require('path');
const { editExecutable } = require('./win-resources.cjs');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const executableName = `${context.packager.appInfo.productFilename}.exe`;
  editExecutable(path.join(context.appOutDir, executableName));
};
