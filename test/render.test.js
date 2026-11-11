'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadAgenda, renderBrief, renderGuide, renderExport, schedule } = require('../src');
const { validAgenda } = require('./helpers');

const EXAMPLE = path.join(__dirname, '..', 'examples', 'testing-fundamentals', 'agenda.yaml');

test('schedule lays blocks out on the clock', () => {
  const plan = schedule(validAgenda());
  assert.deepEqual(plan.blocks.map((b) => `${b.clockStart}-${b.clockEnd}`), [
    '09:00-09:10', '09:10-09:35', '09:35-09:50', '09:50-10:00',
  ]);
  assert.deepEqual(
    Object.fromEntries(Object.entries(plan.phases).map(([p, w]) => [p, [w.start, w.end, w.minutes]])),
    { C1: [0, 10, 10], C2: [10, 35, 25], C3: [35, 50, 15], C4: [50, 60, 10] },
  );
  assert.equal(plan.total, 60);
});

test('brief contains acceptance windows, timeline and phase balance', () => {
  const md = renderBrief(loadAgenda(EXAMPLE));
  assert.match(md, /^# Session brief: Testing Fundamentals/);
  assert.match(md, /> Fictional example data\./);
  assert.match(md, /\| C3 Concrete Practice \| 14:35–14:50 \| At minute 50, every participant/);
  assert.match(md, /\| 14:25–14:35 \| 10 \| C2 \| Live demo: red, green, refactor \|/);
  assert.match(md, /\| C2 Concepts \| 25 \| 42 % \|/);
  assert.match(md, /\| LO3 \| Run a test suite and read the output of a failing test\. \| 5, 6, 7 \|/);
});

test('brief escapes pipes in table cells', () => {
  const agenda = validAgenda();
  agenda.blocks[0].method = 'Either | or';
  assert.match(renderBrief(agenda), /Either \\\| or/);
});

test('guide has one section per phase and fill-in prompts per block', () => {
  const md = renderGuide(loadAgenda(EXAMPLE));
  for (const heading of ['## C1 Connections · 14:00–14:10', '## C2 Concepts · 14:10–14:35', '## C3 Concrete Practice · 14:35–14:50', '## C4 Conclusions · 14:50–15:00']) {
    assert.ok(md.includes(heading), heading);
  }
  assert.match(md, /### 14:35 · Pair exercise: first failing test \(12 min\)/);
  assert.equal((md.match(/\*\*Say this:\*\*/g) || []).length, 9);
  assert.match(md, /Transition:\*\* _\(fill in\)_, one sentence that leads into "Gallery: one test per pair"/);
  assert.match(md, /Shorten first: "Pair exercise: first failing test" \(12 min\), "Live demo: red, green, refactor" \(10 min\)/);
});

test('export lists every activity with its fields', () => {
  const text = renderExport(loadAgenda(EXAMPLE));
  assert.match(text, /^Workshop title: Testing Fundamentals\nDuration: 60 min\nStart: 14:00\n/);
  assert.equal((text.match(/^Activity: /gm) || []).length, 9);
  assert.match(text, /Activity: 6 Pair exercise: first failing test\nDuration: 12 min\nType: Exercise\nMethod: .+\nPurpose: .+\nDescription: Each pair gets a function with a known bug\. .+\n4C Phase: C3 Concrete Practice\nLearning Objectives: LO1, LO3\n/);
});

test('export omits empty optional fields', () => {
  const text = renderExport(validAgenda());
  assert.match(text, /Activity: 1 Opening\nDuration: 10 min\nPurpose: Connect to experience\.\n4C Phase: C1 Connections\n\n/);
});
