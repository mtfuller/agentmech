const { execSync } = require('child_process');
const path = require('path');
const packageJson = require('../../package.json');

describe('Version Flag', () => {
  test('should return version from package.json with --version flag', () => {
    const output = execSync('node dist/cli.js --version', {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8'
    }).trim();
    
    expect(output).toBe(packageJson.version);
  });

  test('should return version from package.json with -V flag', () => {
    const output = execSync('node dist/cli.js -V', {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8'
    }).trim();
    
    expect(output).toBe(packageJson.version);
  });
});
