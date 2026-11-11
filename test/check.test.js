'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { checkAgenda, formatIssues, loadAgenda, parseClock, formatClock } = require('../src');
const { validAgenda, codes } = require('./helpers');

const EXAMPLES = path.join(__dirname, '..', 'examples', 'testing-fundamentals');

test('valid agenda has no issues', () => {
  const result = checkAgenda(validAgenda());
  assert.deepEqual(result.issues, []);
});

test('the shipped example agenda passes', () => {
  const result = checkAgenda(loadAgenda(path.join(EXAMPLES, 'agenda.yaml')));
  assert.deepEqual(result.issues, []);
});

test('the broken example agenda reports the intended problems', () => {
  const result = checkAgenda(loadAgenda(path.join(EXAMPLES, 'agenda-broken.yaml')));
  const found = codes(result);
  for (const code of [
    'TOTAL_MISMATCH',
    'PURPOSE_MISSING',
    'PHASE_ORDER',
    'ACCEPTANCE_WINDOW',
    'ACCEPTANCE_MISSING',
    'ACCEPTANCE_WORDING',
    'STORY_TOO_LONG',
    'LO_UNKNOWN',
  ]) {
    assert.ok(found.includes(code), `expected ${code} in ${found.join(', ')}`);
  }
  assert.ok(result.errors.length >= 5);
});

test('total must equal the slot', () => {
  const agenda = validAgenda();
  agenda.blocks[1].minutes = 30;
  const result = checkAgenda(agenda);
  const issue = result.errors.find((i) => i.code === 'TOTAL_MISMATCH');
  assert.ok(issue);
  assert.match(issue.message, /65 min.*60 min \(\+5 min\)/);
});

test('every block needs a purpose', () => {
  const agenda = validAgenda();
  delete agenda.blocks[2].purpose;
  assert.deepEqual(codes(checkAgenda(agenda)), ['PURPOSE_MISSING']);
});

test('phases must run C1 to C4', () => {
  const agenda = validAgenda();
  agenda.blocks.push({ title: 'Late model', phase: 'C2', minutes: 1, purpose: 'x' });
  agenda.session.slot_minutes = 61;
  assert.ok(codes(checkAgenda(agenda)).includes('PHASE_ORDER'));
});

test('unknown phase and invalid minutes are errors', () => {
  const agenda = validAgenda();
  agenda.blocks[0].phase = 'C5';
  agenda.blocks[1].minutes = 'twenty';
  const found = codes(checkAgenda(agenda));
  assert.ok(found.includes('PHASE_UNKNOWN'));
  assert.ok(found.includes('MINUTES_INVALID'));
});

test('a phase without blocks is an error', () => {
  const agenda = validAgenda();
  agenda.blocks = agenda.blocks.filter((b) => b.phase !== 'C3');
  agenda.blocks[1].minutes = 40;
  assert.ok(codes(checkAgenda(agenda)).includes('PHASE_MISSING'));
});

test('acceptance sentence is required per phase', () => {
  const agenda = validAgenda();
  delete agenda.acceptance.C4;
  assert.deepEqual(codes(checkAgenda(agenda)), ['ACCEPTANCE_MISSING']);
});

test('acceptance sentence must start with "At minute N"', () => {
  const agenda = validAgenda();
  agenda.acceptance.C2 = 'By the end, every participant has seen the model.';
  assert.deepEqual(codes(checkAgenda(agenda)), ['ACCEPTANCE_FORMAT']);
});

test('acceptance minute must fall inside the phase window', () => {
  const agenda = validAgenda();
  agenda.acceptance.C3 = 'At minute 30, every participant has applied the model.';
  const issue = checkAgenda(agenda).errors.find((i) => i.code === 'ACCEPTANCE_WINDOW');
  assert.ok(issue);
  assert.match(issue.message, /minute 30.*from minute 35 to 50/);
});

test('acceptance window: end of phase counts, start of phase does not', () => {
  const atEnd = validAgenda();
  atEnd.acceptance.C1 = 'At minute 10, every participant has said hello.';
  assert.deepEqual(checkAgenda(atEnd).issues, []);

  const atStart = validAgenda();
  atStart.acceptance.C2 = 'At minute 10, every participant has seen the model.';
  assert.deepEqual(codes(checkAgenda(atStart)), ['ACCEPTANCE_WINDOW']);
});

test('acceptance sentence without "every participant" is a warning', () => {
  const agenda = validAgenda();
  agenda.acceptance.C2 = 'At minute 35, the facilitator has shown the model.';
  const result = checkAgenda(agenda);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(codes(result), ['ACCEPTANCE_WORDING']);
});

test('phase share outside the default range is a warning', () => {
  const agenda = validAgenda();
  agenda.blocks[1].minutes = 35; // C2 grows to 35 of 60 min = 58 %
  agenda.blocks[2].minutes = 5;  // C3 shrinks to 5 of 60 min = 8 %
  agenda.acceptance.C2 = 'At minute 45, every participant has seen the model applied once.';
  const result = checkAgenda(agenda);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(codes(result), ['PHASE_SHARE', 'PHASE_SHARE']);
});

test('phase share ranges can be overridden per agenda', () => {
  const agenda = validAgenda();
  agenda.blocks[1].minutes = 35;
  agenda.blocks[2].minutes = 5;
  agenda.acceptance.C2 = 'At minute 45, every participant has seen the model applied once.';
  agenda.rules = { phase_share: { C2: [40, 60], C3: [5, 30] } };
  assert.deepEqual(checkAgenda(agenda).issues, []);
});

test('invalid phase share override is reported', () => {
  const agenda = validAgenda();
  agenda.rules = { phase_share: { C2: [60, 40] } };
  assert.deepEqual(codes(checkAgenda(agenda)), ['RULES_INVALID']);
});

test('long stories are flagged', () => {
  const agenda = validAgenda();
  agenda.blocks[1] = { ...agenda.blocks[1], type: 'Story' };
  assert.deepEqual(codes(checkAgenda(agenda)), ['STORY_TOO_LONG']);
});

test('unknown and unused learning objectives are warnings', () => {
  const agenda = validAgenda();
  agenda.blocks[2].los = ['LO2'];
  const found = codes(checkAgenda(agenda));
  assert.deepEqual(found.sort(), ['LO_UNKNOWN', 'LO_UNUSED']);
});

test('session fields are validated', () => {
  const agenda = validAgenda();
  agenda.session = { slot_minutes: 0, start: '25:00' };
  const found = codes(checkAgenda(agenda));
  for (const code of ['TITLE_MISSING', 'SLOT_INVALID', 'START_INVALID']) {
    assert.ok(found.includes(code), code);
  }
});

test('clock helpers', () => {
  assert.equal(parseClock('9:05'), 545);
  assert.equal(parseClock('24:00'), null);
  assert.equal(parseClock('noon'), null);
  assert.equal(formatClock(545), '09:05');
  assert.equal(formatClock(1440 + 30), '00:30');
});

test('formatIssues summarises counts', () => {
  const agenda = validAgenda();
  delete agenda.blocks[0].purpose;
  agenda.acceptance.C2 = 'At minute 35, the model was shown.';
  const text = formatIssues(checkAgenda(agenda).issues);
  assert.match(text, /ERROR\s+PURPOSE_MISSING/);
  assert.match(text, /WARN\s+ACCEPTANCE_WORDING/);
  assert.match(text, /1 error, 1 warning$/);
  assert.equal(formatIssues([]), 'OK  No issues found.');
});
