'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'plan-session.js');
const VALID = path.join(ROOT, 'examples', 'testing-fundamentals', 'agenda.yaml');
const BROKEN = path.join(ROOT, 'examples', 'testing-fundamentals', 'agenda-broken.yaml');

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

test('check passes on the valid example', () => {
  const r = run('check', VALID);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK {2}No issues found\./);
});

test('check fails on the broken example', () => {
  const r = run('check', BROKEN);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /ERROR\s+TOTAL_MISMATCH/);
  assert.match(r.stdout, /\d+ errors, \d+ warnings/);
});

test('check --json returns machine-readable issues', () => {
  const r = run('check', BROKEN, '--json');
  assert.equal(r.status, 1);
  const data = JSON.parse(r.stdout);
  assert.equal(data.ok, false);
  assert.ok(data.issues.some((i) => i.code === 'ACCEPTANCE_MISSING'));
});

test('rendering refuses a broken agenda', () => {
  const r = run('brief', BROKEN);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /Nothing written/);
});

test('all writes three files', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-session-'));
  const r = run('all', VALID, '--out', out);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(fs.readdirSync(out).sort(), ['brief.md', 'export.txt', 'facilitator-guide.md']);
  fs.rmSync(out, { recursive: true, force: true });
});

test('--strict turns warnings into a failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-session-'));
  const file = path.join(dir, 'agenda.yaml');
  const text = fs.readFileSync(VALID, 'utf8').replace(
    'At minute 35, every participant has predicted',
    'At minute 35, the group has predicted',
  );
  fs.writeFileSync(file, text);
  assert.equal(run('check', file).status, 0);
  assert.equal(run('check', file, '--strict').status, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('usage errors exit with 2', () => {
  assert.equal(run().status, 2);
  assert.equal(run('nonsense', VALID).status, 2);
  assert.equal(run('check').status, 2);
  assert.equal(run('check', path.join(ROOT, 'does-not-exist.yaml')).status, 2);
  assert.equal(run('--help').status, 0);
});
