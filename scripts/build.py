#!/usr/bin/env python3
# ==============================================================================
# QRPrint — Python Build Orchestrator
# Invokes the unified production packaging pipeline
# ==============================================================================

import os
import sys
import subprocess
import argparse

def main():
    parser = argparse.ArgumentParser(description="QRPrint Production Build Runner")
    parser.add_argument("--skip-build-all", action="store_true", help="Skip npm run build:all if already compiled")
    args = parser.parse_args()

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ps_script = os.path.join(root_dir, "scripts", "build.ps1")

    if not os.path.exists(ps_script):
        print(f"Error: PowerShell build script not found at {ps_script}")
        sys.exit(1)

    cmd = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps_script]
    if args.skip_build_all:
        cmd.append("-SkipBuildAll")

    print(f"[QRPrint Build] Running build pipeline: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=root_dir)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
