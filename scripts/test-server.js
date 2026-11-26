#!/usr/bin/env node
'use strict';

// Use real Apache for browser tests: a static file server cannot test .htaccess.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-apache-'));
const mac = process.platform === 'darwin';
const binary = mac ? '/usr/sbin/httpd' : '/usr/sbin/apache2';
const modules = mac ? '/usr/libexec/apache2' : '/usr/lib/apache2/modules';
const inventory = spawnSync(binary, ['-l'], { encoding: 'utf8' });
if (inventory.error || inventory.status !== 0) {
  fs.rmSync(directory, { recursive: true, force: true });
  throw Error('Apache is required: install the apache2 package on Linux or use system httpd on macOS.');
}
const loaded = inventory.stdout;
const names = ['mpm_event', 'unixd', 'authz_core', 'authz_host', 'mime', 'dir', 'rewrite', 'headers', 'env', 'log_config'];
const load = names.filter(name => !loaded.includes('mod_' + name + '.c'))
  .map(name => `LoadModule ${name}_module "${modules}/mod_${name}.so"`).join('\n');
const port = Number(process.env.TEST_PORT || 8123);
const country = process.env.TEST_COUNTRY || 'US';
if (!/^[A-Z]{2}$/.test(country) || !Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid test server settings');
// macOS privacy protection prevents system Apache reading Documents directly.
// A disposable public copy also keeps test/config artifacts outside the web root.
const documentRoot = path.join(directory, 'public');
fs.cpSync(root, documentRoot, { recursive: true, mode: fs.constants.COPYFILE_FICLONE,
  filter(source) {
    const relative = path.relative(root, source);
    return !relative.split(path.sep).some(part => (part.startsWith('.') && part !== '.htaccess') || ['node_modules', 'scripts', 'docs', 'dev'].includes(part));
  } });
if (process.env.TEST_VERSION_ASSETS === '1') {
  const versioned = spawnSync(process.execPath, [path.join(__dirname, 'version-gallery-assets.js'), documentRoot], { stdio: 'inherit' });
  if (versioned.status !== 0) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw Error('CDN asset preparation failed in the disposable test copy.');
  }
}
const config = path.join(directory, 'httpd.conf');
const errorLog = path.join(directory, 'error.log');
fs.writeFileSync(config, `
ServerRoot "${directory}"
PidFile "${directory}/httpd.pid"
Listen 127.0.0.1:${port}
ServerName localhost
${load}
User "#${os.userInfo().uid}"
Group "#${os.userInfo().gid}"
ErrorLog "${errorLog}"
LogLevel warn
TypesConfig "${mac ? '/etc/apache2/mime.types' : '/etc/mime.types'}"
DocumentRoot "${documentRoot}"
DirectoryIndex index.html
SetEnv GEOIP_COUNTRY_CODE ${country}
<Directory "${documentRoot}">
  Options FollowSymLinks
  AllowOverride All
  Require all granted
</Directory>
`);
const child = spawn(binary, ['-f', config, '-DFOREGROUND'], { stdio: 'inherit' });
child.on('error', error => { fs.rmSync(directory, { recursive: true, force: true }); console.error(error.message); process.exitCode = 1; });
child.on('exit', code => {
  if (code && fs.existsSync(errorLog)) console.error(fs.readFileSync(errorLog, 'utf8').slice(-4000));
  fs.rmSync(directory, { recursive: true, force: true });
  process.exitCode = code || 0;
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill('SIGTERM'));
