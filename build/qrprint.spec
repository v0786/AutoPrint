# -*- mode: python ; coding: utf-8 -*-
# ==============================================================================
#   QRPrint — PyInstaller Production Build Specification
#   Target Operating Systems: Windows 7 (SP1 64-bit), Windows 10, Windows 11
# ==============================================================================

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Root directory of the repository
ROOT_DIR = os.path.abspath(os.path.join(SPECPATH, '..'))

# Collect static assets and configurations
datas = [
    (os.path.join(ROOT_DIR, 'assets'), 'assets'),
    (os.path.join(ROOT_DIR, 'config'), 'config'),
    (os.path.join(ROOT_DIR, 'tools'), 'tools'),
]

# Binaries to include (native helpers)
binaries = []

# Hidden imports for Windows spooler, WMI, and QR generation
hiddenimports = [
    'win32print',
    'win32api',
    'win32con',
    'win32gui',
    'win32process',
    'wmi',
    'sqlite3',
    'json',
    'hashlib',
    'hmac',
    'socket',
    'urllib',
    'urllib.request',
    'threading',
    'subprocess',
    'logging',
    'logging.handlers',
]

# Excluded packages to minimize binary footprint and avoid runtime bloat
excludes = [
    'tkinter',
    'unittest',
    'pydoc',
    'email',
    'xmlrpc',
    'distutils',
]

a = Analysis(
    [os.path.join(ROOT_DIR, 'app', 'desktop', 'qrprint_app.py') if os.path.exists(os.path.join(ROOT_DIR, 'app', 'desktop', 'qrprint_app.py')) else os.path.join(ROOT_DIR, 'scripts', 'build.py')],
    pathex=[ROOT_DIR],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=block_cipher,
)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='QRPrint',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # --windowed: No console window in production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(ROOT_DIR, 'assets', 'icon', 'autoprint.ico') if os.path.exists(os.path.join(ROOT_DIR, 'assets', 'icon', 'autoprint.ico')) else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='QRPrint',
)
