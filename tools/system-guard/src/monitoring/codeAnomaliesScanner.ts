/**
 * AutoPrint SystemGuard — Code Anomalies, Syntax Errors & Logic Flaws Scanner
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { AnomalyIssue, IncidentSeverity } from '../types';
import { GUARD_PATHS, GUARD_CONFIG } from '../config';
import { logger } from '../reporting/structuredLogger';

export class CodeAnomaliesScanner {
  public scanFiles(targetDirs?: string[]): {
    count: number;
    issues: AnomalyIssue[];
  } {
    const dirs = targetDirs || GUARD_PATHS.CRITICAL_SCAN_DIRS;
    const issues: AnomalyIssue[] = [];

    const fileList: string[] = [];
    for (const d of dirs) {
      if (fs.existsSync(d)) {
        this.gatherFiles(d, fileList);
      }
    }

    // Add critical config files
    for (const f of GUARD_PATHS.CRITICAL_CONFIG_FILES) {
      if (fs.existsSync(f) && !fileList.includes(f)) {
        fileList.push(f);
      }
    }

    for (const file of fileList) {
      const ext = path.extname(file).toLowerCase();
      try {
        const content = fs.readFileSync(file, 'utf8');

        if (ext === '.json') {
          this.validateJson(file, content, issues);
        } else if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
          this.validateJsSyntax(file, content, issues);
        } else if (ext === '.ts') {
          this.validateTsSyntaxAndPatterns(file, content, issues);
        }
      } catch (err: any) {
        issues.push({
          filePath: file,
          type: 'CORRUPT_ENCODING',
          severity: 'HIGH',
          message: `Cannot read file: ${err.message}`,
        });
      }
    }

    if (issues.length > 0) {
      logger.warn(`Code anomaly scanner detected ${issues.length} potential issues across ${fileList.length} files`);
    }

    return {
      count: issues.length,
      issues,
    };
  }

  private validateJson(file: string, content: string, issues: AnomalyIssue[]): void {
    try {
      JSON.parse(content);
    } catch (err: any) {
      issues.push({
        filePath: file,
        type: 'MALFORMED_CONFIG',
        severity: 'HIGH',
        message: `JSON syntax error: ${err.message}`,
      });
    }
  }

  private validateJsSyntax(file: string, content: string, issues: AnomalyIssue[]): void {
    try {
      if (file.endsWith('.mjs') || /^\s*(import|export)\s/m.test(content)) {
        if (typeof (vm as any).SourceTextModule === 'function') {
          new (vm as any).SourceTextModule(content, { identifier: file });
        }
      } else {
        // Use vm.Script to validate JavaScript syntax without executing
        new vm.Script(content, { filename: file });
      }
    } catch (err: any) {
      if (!err.message.includes('Cannot use import statement outside a module')) {
        issues.push({
          filePath: file,
          type: 'SYNTAX_ERROR',
          severity: 'CRITICAL',
          message: `JavaScript syntax error: ${err.message}`,
          line: err.lineNumber,
          column: err.columnNumber,
        });
      }
    }

    this.checkCodePatterns(file, content, issues);
  }

  private validateTsSyntaxAndPatterns(file: string, content: string, issues: AnomalyIssue[]): void {
    // Check balanced brackets and common TypeScript syntax blunders
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 10) {
      issues.push({
        filePath: file,
        type: 'SYNTAX_ERROR',
        severity: 'MEDIUM',
        message: `Potential syntax imbalance: found ${openBraces} opening braces vs ${closeBraces} closing braces.`,
      });
    }

    this.checkCodePatterns(file, content, issues);
  }

  private checkCodePatterns(file: string, content: string, issues: AnomalyIssue[]): void {
    // 1. Unhandled infinite promise loops or empty catches that swallow errors
    if (/catch\s*\(\s*\w*\s*\)\s*{\s*}/g.test(content) && !file.includes('.test.')) {
      issues.push({
        filePath: file,
        type: 'LOGIC_FLAW',
        severity: 'LOW',
        message: 'Silent empty catch block detected (swallowed exception).',
      });
    }

    // 2. Dangling unresolved promises without return or await
    if (/async\s+function[^{]+{\s*fetch\(/g.test(content)) {
      issues.push({
        filePath: file,
        type: 'DANGLING_RESOURCE',
        severity: 'MEDIUM',
        message: 'Async function invokes fetch without explicit await/return statement.',
      });
    }

    // 3. Catastrophic regex backtracking hazard
    if (/(\(\.\*\)\+)|(\(\.\+\)\*)|(\(\[a-zA-Z0-9\]\+\)\+)/.test(content)) {
      issues.push({
        filePath: file,
        type: 'LOGIC_FLAW',
        severity: 'HIGH',
        message: 'Potential catastrophic polynomial regex backtracking pattern detected.',
      });
    }
  }

  private gatherFiles(dir: string, list: string[]): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (GUARD_CONFIG.SCANNER.EXCLUDE_PATTERNS.some((p) => full.includes(p))) continue;

        if (entry.isDirectory()) {
          this.gatherFiles(full, list);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.ts', '.js', '.json', '.cjs', '.mjs'].includes(ext)) {
            list.push(full);
          }
        }
      }
    } catch {}
  }
}
