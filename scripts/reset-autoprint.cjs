/**
 * AutoPrint Factory Reset Script
 * Performs a complete destructive reset of AutoPrint application state,
 * returning the system to a brand-new, freshly-installed state.
 *
 * Usage:
 *   npm run reset                (Interactive confirmation required)
 *   npm run reset -- --force     (Non-interactive immediate reset)
 *   npm run reset -- --yes       (Non-interactive immediate reset)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const programDataDir = process.env.ProgramData
  ? path.join(process.env.ProgramData, 'AutoPrint')
  : 'C:\\ProgramData\\AutoPrint';

const args = process.argv.slice(2);
const isForced = args.some((a) => ['--force', '-f', '--yes', '-y'].includes(a.toLowerCase()));

function printBanner() {
  console.log('\n=========================================');
  console.log('   ⚠️  AUTOPRINT FACTORY RESET');
  console.log('=========================================\n');
  console.log('This will permanently delete:\n');
  console.log('  - All merchant users');
  console.log('  - All print jobs');
  console.log('  - All customers');
  console.log('  - All uploaded files');
  console.log('  - The SQLite database (autoprint.db, WAL, SHM)');
  console.log('  - All login sessions');
  console.log('  - Remember This PC tokens');
  console.log('  - Application setup & installation state\n');
  console.log('This action cannot be undone.\n');
}

async function confirmReset() {
  if (isForced) {
    console.log('[RESET] Non-interactive mode detected (--force/--yes). Proceeding with reset...\n');
    return true;
  }

  printBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Type RESET to continue: ', (answer) => {
      rl.close();
      if (answer.trim() === 'RESET') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

function stopAutoPrintProcesses() {
  console.log('[1/5] Stopping AutoPrint-owned processes...');
  if (process.platform !== 'win32') return;

  try {
    const psScript = [
      '$targetPids = @()',
      'Get-Process AutoPrint, AutoPrintManager -ErrorAction SilentlyContinue | ForEach-Object { $targetPids += $_.Id }',
      'Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {',
      '  $c = $_.CommandLine',
      '  if ($c) {',
      '    if ($_.Name -eq "node.exe" -and ($c -like "*app*backend*" -or $c -like "*app*customer-web*" -or $c -like "*app*merchant-desktop*")) {',
      '      $targetPids += $_.ProcessId',
      '    }',
      '  }',
      '}',
      '$unique = $targetPids | Select-Object -Unique | Where-Object { $_ -ne ' + process.pid + ' }',
      'foreach ($p in $unique) {',
      '  try {',
      '    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue',
      '    Write-Output "Stopped PID $p"',
      '  } catch {}',
      '}'
    ].join('\r\n');

    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    const output = execSync(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${b64}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const lines = output.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      lines.forEach((l) => console.log(`   [PASS] ${l}`));
    } else {
      console.log('   [PASS] No running AutoPrint background processes found.');
    }

    // Brief cooldown to release OS file locks
    execSync('powershell.exe -NoProfile -Command "Start-Sleep -Milliseconds 800"');
  } catch (err) {
    console.warn('   [WARN] Process discovery encountered notice:', err.message);
  }
}

function deleteFileIfExists(filePath, maxRetries = 5) {
  if (!fs.existsSync(filePath)) return;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Clear any ReadOnly/System attributes first if on Windows
      if (process.platform === 'win32') {
        try { execSync(`attrib.exe -r -s -h "${filePath}"`, { stdio: 'ignore' }); } catch {}
      }
      fs.unlinkSync(filePath);
      console.log(`   [DELETE FILE] ${filePath}`);
      return;
    } catch (e) {
      if (process.platform === 'win32') {
        try {
          execSync(`powershell.exe -NoProfile -Command "Remove-Item -LiteralPath '${filePath}' -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
          if (!fs.existsSync(filePath)) {
            console.log(`   [DELETE FILE] ${filePath}`);
            return;
          }
        } catch {}
      }

      if (attempt < maxRetries) {
        // Sleep 300ms before retry
        try {
          execSync('powershell.exe -NoProfile -Command "Start-Sleep -Milliseconds 300"');
        } catch {}
      } else {
        console.warn(`   [WARN] Could not delete ${filePath}: ${e.message}`);
      }
    }
  }
}

function emptyDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`   [DELETE DIR]  ${fullPath}`);
      } else {
        deleteFileIfExists(fullPath);
      }
    }
  } catch (e) {
    console.warn(`   [WARN] Could not clean ${dirPath}: ${e.message}`);
  }
}

function removeApplicationState() {
  console.log('[2/5] Removing persistent SQLite database & journals...');
  const dbLocations = [
    path.join(programDataDir, 'datastore', 'backend', 'database'),
    path.join(rootDir, 'datastore', 'backend', 'database'),
    path.join(rootDir, 'app', 'backend', 'datastore', 'backend', 'database'),
  ];

  const dbExtensions = ['', '-wal', '-shm', '-journal'];
  for (const dbDir of dbLocations) {
    if (fs.existsSync(dbDir)) {
      for (const ext of dbExtensions) {
        deleteFileIfExists(path.join(dbDir, `autoprint.db${ext}`));
      }
    }
  }

  console.log('[3/5] Removing installation state...');
  const configFiles = [
    path.join(programDataDir, 'config', 'installation.json'),
    path.join(programDataDir, 'config', 'appsettings.json'),
    path.join(rootDir, 'config', 'installation.json'),
    path.join(rootDir, 'config', 'appsettings.json'),
    path.join(rootDir, 'app', 'backend', 'config', 'appsettings.json'),
  ];
  for (const cfg of configFiles) {
    deleteFileIfExists(cfg);
  }

  // Clean Windows Auto-Start registry if present
  if (process.platform === 'win32') {
    try {
      execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v AutoPrint /f', {
        stdio: 'ignore',
      });
      console.log('   [REGISTRY] Removed AutoPrint from Windows startup registry.');
    } catch {}
  }

  console.log('[4/5] Removing uploaded files, print jobs, customer records & logs...');
  const dirsToEmpty = [
    // ProgramData storage
    path.join(programDataDir, 'datastore', 'customer', 'uploads'),
    path.join(programDataDir, 'datastore', 'customer', 'documents'),
    path.join(programDataDir, 'datastore', 'merchant', 'jobs'),
    path.join(programDataDir, 'datastore', 'temp'),
    path.join(programDataDir, 'datastore', 'payments'),
    path.join(programDataDir, 'datastore', 'verification'),
    path.join(programDataDir, 'datastore', 'cache'),
    path.join(programDataDir, 'datastore', 'backups'),
    path.join(programDataDir, 'logs'),
    // Workspace storage
    path.join(rootDir, 'datastore', 'customer', 'uploads'),
    path.join(rootDir, 'datastore', 'customer', 'documents'),
    path.join(rootDir, 'datastore', 'merchant', 'jobs'),
    path.join(rootDir, 'datastore', 'temp'),
    path.join(rootDir, 'datastore', 'payments'),
    path.join(rootDir, 'datastore', 'verification'),
    path.join(rootDir, 'datastore', 'cache'),
    path.join(rootDir, 'datastore', 'backups'),
    path.join(rootDir, 'logs'),
  ];

  for (const dir of dirsToEmpty) {
    emptyDirectory(dir);
  }
}

function recreateDirectorySkeletons() {
  console.log('[5/5] Recreating pristine directory skeletons...');
  const baseDirs = [
    // ProgramData
    path.join(programDataDir, 'config'),
    path.join(programDataDir, 'datastore', 'backend', 'database'),
    path.join(programDataDir, 'datastore', 'customer', 'uploads'),
    path.join(programDataDir, 'datastore', 'customer', 'documents'),
    path.join(programDataDir, 'datastore', 'merchant', 'jobs'),
    path.join(programDataDir, 'datastore', 'temp'),
    path.join(programDataDir, 'datastore', 'payments'),
    path.join(programDataDir, 'logs'),
    path.join(programDataDir, 'runtime'),
    // Local Workspace
    path.join(rootDir, 'config'),
    path.join(rootDir, 'datastore', 'backend', 'database'),
    path.join(rootDir, 'datastore', 'customer', 'uploads'),
    path.join(rootDir, 'datastore', 'customer', 'documents'),
    path.join(rootDir, 'datastore', 'merchant', 'jobs'),
    path.join(rootDir, 'datastore', 'temp'),
    path.join(rootDir, 'logs'),
  ];

  for (const d of baseDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
}

function verifyResetSuccess() {
  const checks = [
    {
      name: 'SQLite database removed (ProgramData)',
      pass: !fs.existsSync(path.join(programDataDir, 'datastore', 'backend', 'database', 'autoprint.db')),
    },
    {
      name: 'SQLite database removed (Workspace)',
      pass: !fs.existsSync(path.join(rootDir, 'datastore', 'backend', 'database', 'autoprint.db')),
    },
    {
      name: 'Installation state removed (ProgramData)',
      pass: !fs.existsSync(path.join(programDataDir, 'config', 'installation.json')),
    },
    {
      name: 'Installation state removed (Workspace)',
      pass: !fs.existsSync(path.join(rootDir, 'config', 'installation.json')),
    },
    {
      name: 'Customer upload directory empty (ProgramData)',
      pass:
        fs.existsSync(path.join(programDataDir, 'datastore', 'customer', 'uploads')) &&
        fs.readdirSync(path.join(programDataDir, 'datastore', 'customer', 'uploads')).length === 0,
    },
  ];

  for (const check of checks) {
    if (!check.pass) {
      throw new Error(`Factory reset verification check failed: ${check.name}`);
    }
  }
}

async function main() {
  const confirmed = await confirmReset();
  if (!confirmed) {
    console.log('Factory reset cancelled.\n');
    process.exit(0);
  }

  try {
    stopAutoPrintProcesses();
    removeApplicationState();
    recreateDirectorySkeletons();
    verifyResetSuccess();

    console.log('\n=========================================');
    console.log('    AUTOPRINT FACTORY RESET COMPLETE');
    console.log('=========================================\n');
    console.log('✓ AutoPrint services stopped');
    console.log('✓ Users removed');
    console.log('✓ Authentication sessions removed');
    console.log('✓ SQLite database removed');
    console.log('✓ Print jobs removed');
    console.log('✓ Customers removed');
    console.log('✓ Uploaded files removed');
    console.log('✓ Installation state removed');
    console.log('✓ Required directories recreated\n');
    console.log('AutoPrint will behave like a fresh installation');
    console.log('the next time it is started.\n');
    console.log('=========================================\n');
  } catch (err) {
    console.error('\n❌ Factory reset failed:', err.message);
    process.exit(1);
  }
}

main();
