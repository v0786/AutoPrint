const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const expected = { backend: 5000, merchant: 8000, customer: 7000 };

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function assertContains(file, pattern, description) {
  if (!pattern.test(read(file))) {
    throw new Error(`${file}: missing ${description}`);
  }
}

assertContains('app/backend/.env.example', /^PORT=5000\s*$/m, 'backend port 5000');
assertContains('app/backend/.env.example', /^MERCHANT_PORT=8000\s*$/m, 'merchant port 8000');
assertContains('app/backend/.env.example', /^CUSTOMER_PORT=7000\s*$/m, 'customer port 7000');
assertContains('installer/install.cmd', /set "CUSTOM_API_PORT=5000"/, 'cmd backend default');
assertContains('installer/install.cmd', /set "CUSTOM_MERCHANT_PORT=8000"/, 'cmd merchant default');
assertContains('installer/install.cmd', /set "CUSTOM_CUSTOMER_PORT=7000"/, 'cmd customer default');
assertContains('installer/install.ps1', /\$backendPort\s*=\s*5000/, 'PowerShell backend default');
assertContains('installer/install.ps1', /\$merchantPort\s*=\s*8000/, 'PowerShell merchant default');
assertContains('installer/install.ps1', /\$customerPort\s*=\s*7000/, 'PowerShell customer default');
assertContains('scripts/start-autoprint.cmd', /set "BACKEND_PORT=5000"/, 'launcher backend default');
assertContains('scripts/start-autoprint.cmd', /set "MERCHANT_PORT=8000"/, 'launcher merchant default');
assertContains('scripts/start-autoprint.cmd', /set "CUSTOMER_PORT=7000"/, 'launcher customer default');
assertContains('scripts/status-autoprint.cmd', /\$backendPort = 5000/, 'status backend default');
assertContains('scripts/status-autoprint.cmd', /\$merchantPort = 8000/, 'status merchant default');
assertContains('scripts/status-autoprint.cmd', /\$customerPort = 7000/, 'status customer default');
assertContains('scripts/start-all.cmd', /%PROJECT_ROOT%\\app\\backend/, 'start-all backend path');
assertContains('scripts/start-all.cmd', /localhost:8000/, 'start-all merchant URL');
assertContains('scripts/start-all.cmd', /localhost:7000/, 'start-all customer URL');

console.log(`Configuration defaults are consistent: backend=${expected.backend}, merchant=${expected.merchant}, customer=${expected.customer}`);
