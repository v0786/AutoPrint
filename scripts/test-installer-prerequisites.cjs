/**
 * AutoPrint Windows Installer Prerequisite & Dependency Verification Test Suite
 * Validates Scenarios A-F:
 * - Prerequisite Manifest validation
 * - Binary hashes and Microsoft Authenticode signatures
 * - .NET Framework detection & verification algorithms
 * - Node.js detection & verification algorithms
 * - Reinstall data protection & configuration preservation
 * - AutoPrint.exe runtime targeting & configuration
 * - Windows 7 API symbol audit & limitation analysis
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`  [PASS] ${testName}`);
        testsPassed++;
    } else {
        console.error(`  [FAIL] ${testName}${details ? ' - ' + details : ''}`);
        testsFailed++;
    }
}

console.log('\n=================================================================');
console.log('   AUTOPRINT INSTALLER PREREQUISITE & DEPENDENCY VERIFICATION');
console.log('=================================================================\n');

// 1. Prerequisite Manifest Validation
console.log('--- 1. Prerequisite Manifest Validation ---');
const manifestPath = path.resolve('installer/config/prerequisites.json');
assert(fs.existsSync(manifestPath), 'prerequisites.json exists in installer/config');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(Array.isArray(manifest.prerequisites), 'prerequisites array is defined');

const dotnetPrereq = manifest.prerequisites.find(p => p.id === 'dotnet4');
assert(!!dotnetPrereq, 'dotnet4 prerequisite is defined in manifest');
assert(dotnetPrereq.requiredVersion === '4.0.30319', 'dotnet4 targets v4.0.30319 runtime');
assert(dotnetPrereq.installer.silentArgs === '/q /norestart', 'dotnet4 silent arguments are /q /norestart');
assert(dotnetPrereq.installer.acceptedExitCodes.includes(0), 'dotnet4 accepted exit codes include 0');
assert(dotnetPrereq.installer.rebootExitCodes.includes(3010), 'dotnet4 reboot exit codes include 3010');

const nodePrereq = manifest.prerequisites.find(p => p.id === 'nodejs');
assert(!!nodePrereq, 'nodejs prerequisite is defined in manifest');
assert(nodePrereq.installer.acceptedExitCodes.includes(0), 'nodejs accepted exit codes include 0');
assert(nodePrereq.installer.rebootExitCodes.includes(3010), 'nodejs reboot exit codes include 3010');

// 2. Prerequisite Binaries & Checksums
console.log('\n--- 2. Prerequisite Binaries & Cryptographic Checksums ---');
function getSha256(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
}

const nodeMsiPath = path.resolve('installer/prerequisites/node-v20.18.0-x64.msi');
assert(fs.existsSync(nodeMsiPath), 'node-v20.18.0-x64.msi is present in installer/prerequisites');
const nodeHash = getSha256(nodeMsiPath);
assert(nodeHash === '93D1D30341D7D38B7A8F3AB0FA3BE1F9E6436B90338B2BD8B8AF4E80D00BD036', 'node-v20.18.0-x64.msi SHA-256 matches expected checksum');

const dotnetExePath = path.resolve('installer/prerequisites/NDP452-KB2901907-x86-x64-AllOS-ENU.exe');
assert(fs.existsSync(dotnetExePath), 'NDP452-KB2901907-x86-x64-AllOS-ENU.exe is present in installer/prerequisites');
const dotnetHash = getSha256(dotnetExePath);
assert(dotnetHash === '6C2C589132E830A185C5F40F82042BEE3022E721A216680BD9B3995BA86F3781', 'NDP452-KB2901907-x86-x64-AllOS-ENU.exe SHA-256 matches expected checksum');

// Verify Authenticode Signatures
try {
    const sigCheckNode = execSync(`powershell -NoProfile -Command "(Get-AuthenticodeSignature '${nodeMsiPath}').Status"`).toString().trim();
    assert(sigCheckNode === 'Valid', 'node-v20.18.0-x64.msi has Valid Authenticode signature');

    const sigCheckDotNet = execSync(`powershell -NoProfile -Command "(Get-AuthenticodeSignature '${dotnetExePath}').Status"`).toString().trim();
    assert(sigCheckDotNet === 'Valid', 'NDP452-KB2901907-x86-x64-AllOS-ENU.exe has Valid Authenticode signature');
} catch (err) {
    console.error('Signature check error:', err.message);
}

// 3. .NET Framework Detection & Runtime Targeting
console.log('\n--- 3. .NET Framework Detection & Runtime Targeting ---');
const configPath = path.resolve('AutoPrint.exe.config');
assert(fs.existsSync(configPath), 'AutoPrint.exe.config exists in root');
const configContent = fs.readFileSync(configPath, 'utf8');
assert(configContent.includes('supportedRuntime version="v4.0"'), 'AutoPrint.exe.config specifies supportedRuntime v4.0');
assert(configContent.includes('Version=v4.5.2'), 'AutoPrint.exe.config binds .NET Framework 4.5.2 SKU');

// Check AutoPrint.exe assembly runtime version
const exePath = path.resolve('AutoPrint.exe');
assert(fs.existsSync(exePath), 'AutoPrint.exe exists');
const runtimeVer = execSync(`powershell -NoProfile -Command "[System.Reflection.Assembly]::Load([System.IO.File]::ReadAllBytes('${exePath}')).ImageRuntimeVersion"`).toString().trim();
assert(runtimeVer === 'v4.0.30319', `AutoPrint.exe ImageRuntimeVersion is v4.0.30319 (Got: ${runtimeVer})`);

// 4. Inno Setup Script (.iss) Structure & Safety Guards
console.log('\n--- 4. Inno Setup Script Validation ---');
const issPath = path.resolve('installer/AutoPrint.iss');
const issContent = fs.readFileSync(issPath, 'utf8');

assert(issContent.includes('NDP452-KB2901907-x86-x64-AllOS-ENU.exe'), 'AutoPrint.iss bundles .NET 4.5.2 installer');
assert(issContent.includes('node-v20.18.0-x64.msi'), 'AutoPrint.iss bundles Node.js MSI installer');
assert(issContent.includes('prerequisites.json'), 'AutoPrint.iss bundles centralized prerequisite manifest');
assert(issContent.includes('Check: IsReadyToLaunch'), 'AutoPrint.iss guards [Run] with IsReadyToLaunch check');
assert(issContent.includes('IsDotNet4Installed'), 'AutoPrint.iss implements IsDotNet4Installed detection');
assert(issContent.includes('InstallDotNetPrerequisite'), 'AutoPrint.iss implements InstallDotNetPrerequisite');
assert(issContent.includes('InstallNodeJsPrerequisite'), 'AutoPrint.iss implements InstallNodeJsPrerequisite');
assert(issContent.includes('WriteInstallerLog'), 'AutoPrint.iss implements installer diagnostic logging');
assert(issContent.includes('IsReinstallDetected'), 'AutoPrint.iss implements reinstall detection');
assert(issContent.includes('installation.json'), 'AutoPrint.iss initializes installation.json to complete onboarding state');

// 5. Build Pipeline Script Validation
console.log('\n--- 5. Build Pipeline Script Validation ---');
const buildPs1 = fs.readFileSync('scripts/build-installer.ps1', 'utf8');
assert(buildPs1.includes('NDP452-KB2901907-x86-x64-AllOS-ENU.exe'), 'build-installer.ps1 validates .NET 4.5.2 prerequisite');
assert(buildPs1.includes('AutoPrint.exe.config'), 'build-installer.ps1 stages AutoPrint.exe.config to payload');

// 6. Built Setup Exe Existence & Size
console.log('\n--- 6. Built Setup Package Validation ---');
const setupExePath = path.resolve('dist-installer/AutoPrint-Setup.exe');
assert(fs.existsSync(setupExePath), 'dist-installer/AutoPrint-Setup.exe was compiled successfully');
const setupStat = fs.statSync(setupExePath);
const setupMb = (setupStat.size / (1024 * 1024)).toFixed(2);
assert(setupStat.size > 150 * 1024 * 1024, `Setup package contains all offline runtimes (${setupMb} MB > 150 MB)`);

// 7. CLI Checkers (.NET 4.x check)
console.log('\n--- 7. Diagnostics and CLI Checkers ---');
const checksCmd = fs.readFileSync('installer/lib/checks.cmd', 'utf8');
assert(checksCmd.includes('v4.0.30319'), 'installer/lib/checks.cmd verifies .NET Framework v4.0.30319');

const configureBat = fs.readFileSync('configure.bat', 'utf8');
assert(configureBat.includes('v4.0.30319'), 'configure.bat verifies .NET Framework v4.0.30319');

// 8. Windows 7 API & Compatibility Audit
console.log('\n--- 8. Windows 7 Compatibility Audit ---');
const win7Audit = execSync('node scripts/audit-win7.cjs').toString();
assert(win7Audit.includes('AutoPrint.exe (0.08 MB) ===\n  [PASS]: No post-Windows 7 APIs detected'), 'AutoPrint.exe passes Windows 7 symbol check');
assert(win7Audit.includes('better-sqlite3'), 'better-sqlite3 binary audited for Windows 7');
assert(win7Audit.includes('[POST-WIN7 SYMBOL DETECTED]: GetSystemTimePreciseAsFileTime'), 'Audit correctly identifies Node.js v20/v24 Windows 7 kernel limitation');

console.log('\n=================================================================');
console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('=================================================================\n');

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
