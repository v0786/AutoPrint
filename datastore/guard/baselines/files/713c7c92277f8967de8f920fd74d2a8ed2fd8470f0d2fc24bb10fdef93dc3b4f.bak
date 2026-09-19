const fs = require('fs');
const path = require('path');

function checkFile(filePath, apis) {
    if (!fs.existsSync(filePath)) {
        console.log(`[FILE MISSING] ${filePath}`);
        return;
    }
    const buf = fs.readFileSync(filePath);
    const content = buf.toString('latin1');
    console.log(`\n=== Auditing: ${filePath} (${(buf.length / (1024 * 1024)).toFixed(2)} MB) ===`);
    
    let foundCount = 0;
    for (const api of apis) {
        if (content.includes(api)) {
            console.log(`  [POST-WIN7 SYMBOL DETECTED]: ${api}`);
            foundCount++;
        }
    }
    if (foundCount === 0) {
        console.log('  [PASS]: No post-Windows 7 APIs detected.');
    }
}

const win8PlusApis = [
    'GetSystemTimePreciseAsFileTime',
    'SetThreadDescription',
    'CreateFile2',
    'GetPackageFamilyName',
    'VirtualAlloc2',
    'DiscardVirtualMemory',
    'OfferVirtualMemory',
    'ReclaimVirtualMemory',
    'MapViewOfFileFromApp',
    'UnmapViewOfFileEx'
];

console.log('--- AUDITING RUNTIME BINARIES FOR WINDOWS 7 COMPATIBILITY ---');
checkFile(path.resolve('runtime/node/node.exe'), win8PlusApis);
checkFile(path.resolve('AutoPrint.exe'), win8PlusApis);
checkFile(path.resolve('app/backend/node_modules/better-sqlite3/prebuilds/win32-x64.node'), win8PlusApis);
