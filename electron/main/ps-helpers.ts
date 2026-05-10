import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Forces UTF-8 across PS pipeline + console writer + underlying code page.
// Without this, accented chars / ñ / non-ASCII titles arrive mangled.
export const PS_UTF8_PREFIX =
  'chcp 65001 > $null\r\n' +
  '$OutputEncoding = [System.Text.Encoding]::UTF8\r\n' +
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\r\n';

export interface PSResult {
  stdout: string;
  stderr: string;
  ok: boolean;
}

export interface PSOptions {
  /**
   * Positional arguments forwarded to the script. Use a `param(...)` block at
   * the top of the script to receive them — this is the safe way to pass user
   * data into PowerShell (no string interpolation, no injection surface).
   */
  args?: string[];
  timeoutMs?: number;
  maxBufferBytes?: number;
}

/**
 * Run a PowerShell script via tmp .ps1 + -File. Always prepends the UTF-8
 * preamble. Use `opts.args` + a `param(...)` block in the script to safely
 * inject untrusted data. Never interpolate user data directly into the script.
 */
export function runPS(script: string, opts: PSOptions = {}): Promise<PSResult> {
  return new Promise((resolve) => {
    const tmp = join(tmpdir(), `vd_ps_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`);
    let resolved = false;
    let timer: NodeJS.Timeout | null = null;
    let stdout = '';
    let stderr = '';
    const maxBuf = opts.maxBufferBytes ?? 5 * 1024 * 1024;

    try {
      // PowerShell requires `param(...)` to be the FIRST non-comment statement.
      // If the user script starts with one, inject the UTF-8 prefix AFTER it
      // instead of before. Otherwise PS bails with "param: term not recognized".
      const finalScript = injectUtf8Prefix(script);
      writeFileSync(tmp, finalScript, 'utf-8');
    } catch (e) {
      resolve({ stdout: '', stderr: String(e), ok: false });
      return;
    }

    const args = [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NonInteractive',
      '-File', tmp,
      ...(opts.args ?? []),
    ];

    const finalize = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      try { unlinkSync(tmp); } catch {}
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), ok });
    };

    const child = spawn('powershell', args, { windowsHide: true });

    child.stdout.setEncoding('utf-8');
    child.stderr.setEncoding('utf-8');
    child.stdout.on('data', (d: string) => { if (stdout.length < maxBuf) stdout += d; });
    child.stderr.on('data', (d: string) => { if (stderr.length < maxBuf) stderr += d; });
    child.on('close', (code) => finalize(code === 0));
    child.on('error', () => finalize(false));

    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        try { child.kill(); } catch {}
        finalize(false);
      }, opts.timeoutMs);
    }
  });
}

/** Convenience: returns just the boolean success flag. */
export async function runPSBool(script: string, opts: PSOptions = {}): Promise<boolean> {
  const r = await runPS(script, opts);
  return r.ok;
}

/**
 * Insert PS_UTF8_PREFIX into a script. If the script declares `param(...)`
 * (which MUST be the first non-comment statement in PowerShell), inject the
 * prefix immediately AFTER the closing paren of param. Otherwise prepend.
 */
function injectUtf8Prefix(script: string): string {
  // Skip leading whitespace + line comments to find the first real token.
  let i = 0;
  while (i < script.length) {
    const ch = script[i];
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') { i++; continue; }
    if (ch === '#') {
      // line comment — skip to end of line
      while (i < script.length && script[i] !== '\n') i++;
      continue;
    }
    if (ch === '<' && script[i + 1] === '#') {
      // block comment — skip to '#>'
      const end = script.indexOf('#>', i + 2);
      if (end < 0) return PS_UTF8_PREFIX + script; // malformed, give up safely
      i = end + 2;
      continue;
    }
    break;
  }
  // Is it `param`? (case-insensitive in PS, but conventionally lowercase)
  if (script.slice(i, i + 5).toLowerCase() !== 'param') {
    return PS_UTF8_PREFIX + script;
  }
  // Find the matching closing paren accounting for nested parens.
  let j = script.indexOf('(', i + 5);
  if (j < 0) return PS_UTF8_PREFIX + script;
  let depth = 1;
  j++;
  while (j < script.length && depth > 0) {
    const ch = script[j];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    j++;
  }
  if (depth !== 0) return PS_UTF8_PREFIX + script; // unbalanced — fall back
  // Insert the prefix on its own line right after the param() closing paren.
  return script.slice(0, j) + '\r\n' + PS_UTF8_PREFIX + script.slice(j);
}
