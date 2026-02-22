const path = require('path');

const backendDir = path.resolve(__dirname, '..', '..');
const rootDir = path.resolve(backendDir, '..');
const frontendDir = path.join(rootDir, 'FRONTEND');

module.exports = {
  backendDir,
  rootDir,
  frontendDir
};
