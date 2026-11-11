#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadAgenda,
  checkAgenda,
  formatIssues,
  renderBrief,
  renderGuide,
  renderExport,
} = require('../src');

const USAGE = `Usage: plan-session <command> <agenda.yaml> [options]

Commands:
  check    Check timing, phase order and acceptance sentences
  brief    Print the session brief with a clock-time timeline (Markdown)
  guide    Print a facilitator-guide skeleton (Markdown)
  export   Print a plain-text export for session-planning tools
  all      Write brief.md, facilitator-guide.md and export.txt to --out

Options:
  --out <dir>   Output directory for "all" (default: out)
  --strict      Treat warnings as errors
  --json        Print check results as JSON (check only)
  -h, --help    Show this help

Exit codes: 0 = OK, 1 = the agenda has errors, 2 = usage or file error`;

const RENDERERS = {
  brief: { fn: renderBrief, file: 'brief.md' },
  guide: { fn: renderGuide, file: 'facilitator-guide.md' },
  export: { fn: renderExport, file: 'export.txt' },
};

function parseArgs(argv) {
  const opts = { positional: [], out: 'out', strict: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--out') {
      opts.out = argv[++i];
      if (!opts.out) throw new Error('--out needs a directory');
    } else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else opts.positional.push(arg);
  }
  return opts;
}

function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    io.stderr.write(`${err.message}\n\n${USAGE}\n`);
    return 2;
  }

  const [command, file] = opts.positional;
  if (opts.help || !command) {
    io.stdout.write(`${USAGE}\n`);
    return opts.help ? 0 : 2;
  }
  if (command !== 'check' && command !== 'all' && !RENDERERS[command]) {
    io.stderr.write(`Unknown command "${command}"\n\n${USAGE}\n`);
    return 2;
  }
  if (!file) {
    io.stderr.write(`Missing agenda file\n\n${USAGE}\n`);
    return 2;
  }

  let agenda;
  try {
    agenda = loadAgenda(file);
  } catch (err) {
    io.stderr.write(`Cannot read ${file}: ${err.message}\n`);
    return 2;
  }

  const result = checkAgenda(agenda);
  const failed = result.errors.length > 0 || (opts.strict && result.warnings.length > 0);

  if (command === 'check') {
    if (opts.json) {
      io.stdout.write(`${JSON.stringify({ ok: !failed, issues: result.issues }, null, 2)}\n`);
    } else {
      io.stdout.write(`${formatIssues(result.issues)}\n`);
    }
    return failed ? 1 : 0;
  }

  // Rendering a broken plan would only spread the mistake: stop here.
  if (failed) {
    io.stderr.write(`${formatIssues(result.issues)}\nNothing written: fix the errors first.\n`);
    return 1;
  }
  if (result.warnings.length > 0) {
    io.stderr.write(`${formatIssues(result.warnings)}\n`);
  }

  if (command === 'all') {
    fs.mkdirSync(opts.out, { recursive: true });
    for (const { fn, file: name } of Object.values(RENDERERS)) {
      const target = path.join(opts.out, name);
      fs.writeFileSync(target, fn(agenda));
      io.stdout.write(`Wrote ${target}\n`);
    }
    return 0;
  }

  io.stdout.write(RENDERERS[command].fn(agenda));
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main };
