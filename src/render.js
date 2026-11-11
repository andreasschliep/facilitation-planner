'use strict';

const { PHASES, PHASE_NAMES, phaseLabel, schedule } = require('./agenda');

const FILL = '_(fill in)_';

/** Make a value safe for a Markdown table cell. */
function cell(value) {
  if (value === undefined || value === null || String(value).trim() === '') return '–';
  return String(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function losOf(block) {
  return Array.isArray(block.los) && block.los.length > 0 ? block.los.join(', ') : '';
}

function fictionalNote(session) {
  return session.fictional ? ['> Fictional example data.', ''] : [];
}

function acceptanceFor(agenda, phase) {
  const acc = agenda.acceptance || {};
  for (const [key, sentence] of Object.entries(acc)) {
    if (String(key).trim().toUpperCase() === phase) return sentence;
  }
  return undefined;
}

function sessionRange(plan) {
  const first = plan.blocks[0];
  const last = plan.blocks[plan.blocks.length - 1];
  return first && last ? `${first.clockStart}–${last.clockEnd}` : '';
}

/**
 * Session brief: acceptance sentences plus the design table with clock times.
 * The design table is the skeleton for the facilitator guide.
 */
function renderBrief(agenda) {
  const session = agenda.session || {};
  const plan = schedule(agenda);
  const out = [];

  out.push(`# Session brief: ${session.title || 'Untitled session'}`, '');
  out.push(...fictionalNote(session));
  out.push('| | |', '|---|---|');
  out.push(`| Slot | ${cell(`${session.slot_minutes} min, ${sessionRange(plan)}`)} |`);
  if (session.format) out.push(`| Format | ${cell(session.format)} |`);
  if (session.audience) out.push(`| Audience | ${cell(session.audience)} |`);
  if (session.promise) out.push(`| Promise | ${cell(session.promise)} |`);
  out.push('');

  out.push('## Acceptance sentences', '');
  out.push('| Phase | Window | Acceptance sentence |', '|---|---|---|');
  for (const phase of PHASES) {
    const w = plan.phases[phase];
    const window = w ? `${w.clockStart}–${w.clockEnd}` : '';
    out.push(`| ${phaseLabel(phase)} | ${cell(window)} | ${cell(acceptanceFor(agenda, phase))} |`);
  }
  out.push('');

  out.push('## Timeline', '');
  out.push('| Time | Min | Phase | Block | Type | Method | Purpose | LOs |', '|---|---|---|---|---|---|---|---|');
  for (const item of plan.blocks) {
    const b = item.block;
    out.push(`| ${item.clockStart}–${item.clockEnd} | ${item.minutes} | ${cell(item.phase)} | ${cell(b.title)} | ${cell(b.type)} | ${cell(b.method)} | ${cell(b.purpose)} | ${cell(losOf(b))} |`);
  }
  out.push('');

  out.push('## Phase balance', '');
  out.push('| Phase | Minutes | Share |', '|---|---|---|');
  for (const phase of PHASES) {
    const w = plan.phases[phase];
    const minutes = w ? w.minutes : 0;
    const share = session.slot_minutes ? `${Math.round((minutes / session.slot_minutes) * 100)} %` : '';
    out.push(`| ${phaseLabel(phase)} | ${minutes} | ${cell(share)} |`);
  }
  out.push('');

  const objectives = agenda.learning_objectives;
  if (objectives && typeof objectives === 'object' && !Array.isArray(objectives)) {
    out.push('## Learning objectives', '');
    out.push('| ID | Objective | Blocks |', '|---|---|---|');
    for (const [id, text] of Object.entries(objectives)) {
      const blocks = plan.blocks
        .filter((item) => Array.isArray(item.block.los) && item.block.los.map(String).includes(id))
        .map((item) => item.number)
        .join(', ');
      out.push(`| ${cell(id)} | ${cell(text)} | ${cell(blocks)} |`);
    }
    out.push('');
  }

  return out.join('\n');
}

/**
 * Facilitator-guide skeleton: one section per phase, one entry per block,
 * with the prompts a facilitator fills in.
 */
function renderGuide(agenda) {
  const session = agenda.session || {};
  const plan = schedule(agenda);
  const out = [];

  out.push(`# Facilitator guide: ${session.title || 'Untitled session'}`, '');
  out.push(...fictionalNote(session));
  out.push('> Skeleton generated from the agenda. Replace every _(fill in)_, then read each paragraph against the acceptance sentence of its phase and cut what does not serve it.', '');
  const meta = [`**Slot:** ${session.slot_minutes} min (${sessionRange(plan)})`];
  if (session.audience) meta.push(`**Audience:** ${session.audience}`);
  out.push(meta.join(' · '), '');

  out.push('## Quick reference', '');
  out.push('| Time | Block | Phase | Min |', '|---|---|---|---|');
  for (const item of plan.blocks) {
    out.push(`| ${item.clockStart} | ${cell(item.block.title)} | ${cell(item.phase)} | ${item.minutes} |`);
  }
  out.push('');

  out.push('## Preparation', '');
  out.push(`- **Materials:** ${FILL}`);
  out.push(`- **Room or online setup:** ${FILL}`);
  out.push(`- **Participant pre-work:** ${FILL}`, '');

  for (const phase of PHASES) {
    const w = plan.phases[phase];
    if (!w) continue;
    out.push(`## ${phaseLabel(phase)} · ${w.clockStart}–${w.clockEnd}`, '');
    out.push(`**Acceptance:** ${acceptanceFor(agenda, phase) || FILL}`, '');
    for (const item of w.blocks) {
      const b = item.block;
      const next = plan.blocks[item.index + 1];
      out.push(`### ${item.clockStart} · ${b.title || 'Untitled block'} (${item.minutes} min)`, '');
      out.push(`- **Purpose:** ${b.purpose || FILL}`);
      out.push(`- **Method:** ${b.method || FILL}`);
      if (losOf(b)) out.push(`- **Learning objectives:** ${losOf(b)}`);
      out.push(`- **Materials:** ${FILL}`);
      out.push(`- **Say this:** ${FILL}`);
      out.push(`- **Watch out:** ${FILL}`);
      out.push(`- **Debrief:** ${FILL}`);
      out.push(next
        ? `- **Transition:** ${FILL}, one sentence that leads into "${next.block.title || 'the next block'}"`
        : `- **Close:** ${FILL}, the last sentence participants hear`);
      out.push('');
    }
  }

  out.push('## If you run late', '');
  const flexible = plan.blocks
    .filter((item) => item.phase === 'C2' || item.phase === 'C3')
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 2);
  if (flexible.length > 0) {
    out.push(`- Shorten first: ${flexible.map((item) => `"${item.block.title}" (${item.minutes} min)`).join(', ')}.`);
  }
  out.push(`- Protect ${phaseLabel('C4')}: it is where participants decide what they will do next.`, '');

  out.push('## After the session', '');
  for (const phase of PHASES) {
    out.push(`- [ ] ${phase}: did every participant reach the acceptance sentence?`);
  }
  out.push('');

  return out.join('\n');
}

/**
 * Plain-text export with one field per line, for pasting into
 * session-planning tools.
 */
function renderExport(agenda) {
  const session = agenda.session || {};
  const plan = schedule(agenda);
  const out = [];

  out.push(`Workshop title: ${session.title || ''}`);
  out.push(`Duration: ${session.slot_minutes} min`);
  if (session.start) out.push(`Start: ${plan.blocks[0] ? plan.blocks[0].clockStart : session.start}`);
  if (session.description) out.push(`Description: ${String(session.description).trim()}`);
  out.push('');

  for (const item of plan.blocks) {
    const b = item.block;
    out.push(`Activity: ${item.number} ${b.title || ''}`.trimEnd());
    out.push(`Duration: ${item.minutes} min`);
    if (b.type) out.push(`Type: ${b.type}`);
    if (b.method) out.push(`Method: ${b.method}`);
    if (b.purpose) out.push(`Purpose: ${String(b.purpose).trim()}`);
    if (b.description) out.push(`Description: ${String(b.description).replace(/\s*\n\s*/g, ' ').trim()}`);
    out.push(`4C Phase: ${PHASE_NAMES[item.phase] ? phaseLabel(item.phase) : item.phase}`);
    if (losOf(b)) out.push(`Learning Objectives: ${losOf(b)}`);
    out.push('');
  }

  return out.join('\n');
}

module.exports = {
  renderBrief,
  renderGuide,
  renderExport,
};
