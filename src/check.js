'use strict';

const {
  PHASES,
  PHASE_NAMES,
  normalisePhase,
  phaseLabel,
  parseClock,
  schedule,
} = require('./agenda');

/**
 * Default share of the slot per phase, in percent [min, max].
 * For a 60-minute session this centres on roughly 10 / 25 / 15 / 10 minutes.
 * Override per agenda with `rules.phase_share`.
 */
const DEFAULT_PHASE_SHARE = {
  C1: [10, 25],
  C2: [30, 50],
  C3: [15, 35],
  C4: [10, 25],
};

/** Stories longer than this are flagged (1 punch, 1 stumble, 1 takeaway). */
const MAX_STORY_MINUTES = 9;

const ACCEPTANCE_RE = /^\s*At minute (\d+)\b/i;

function blockLabel(block, index) {
  const title = block && block.title ? ` "${block.title}"` : '';
  return `Block ${index + 1}${title}`;
}

function resolvePhaseShare(agenda, error) {
  const shares = { ...DEFAULT_PHASE_SHARE };
  const custom = agenda.rules && agenda.rules.phase_share;
  if (custom === undefined) return shares;
  if (!custom || typeof custom !== 'object' || Array.isArray(custom)) {
    error('RULES_INVALID', 'rules.phase_share must map phases to [min, max] percentages');
    return shares;
  }
  for (const [key, range] of Object.entries(custom)) {
    const phase = normalisePhase(key);
    const ok = PHASES.includes(phase)
      && Array.isArray(range)
      && range.length === 2
      && range.every((n) => typeof n === 'number' && n >= 0 && n <= 100)
      && range[0] <= range[1];
    if (!ok) {
      error('RULES_INVALID', `rules.phase_share.${key} must be [min, max] in percent, e.g. [10, 25]`);
      continue;
    }
    shares[phase] = range;
  }
  return shares;
}

/**
 * Check an agenda against the planning rules.
 *
 * Errors make the plan unusable (wrong total, missing purpose, acceptance
 * sentence outside its phase). Warnings point at things worth a second look.
 *
 * @param {object} agenda
 * @returns {{issues: object[], errors: object[], warnings: object[], schedule: object}}
 */
function checkAgenda(agenda) {
  const issues = [];
  const error = (code, message) => issues.push({ level: 'error', code, message });
  const warning = (code, message) => issues.push({ level: 'warning', code, message });

  const session = agenda.session || {};
  if (!session.title || !String(session.title).trim()) {
    error('TITLE_MISSING', 'session.title is missing');
  }

  const slot = session.slot_minutes;
  const slotValid = Number.isInteger(slot) && slot > 0;
  if (!slotValid) {
    error('SLOT_INVALID', `session.slot_minutes must be a positive whole number, got ${JSON.stringify(slot)}`);
  }
  if (session.start !== undefined && parseClock(session.start) === null) {
    error('START_INVALID', `session.start must look like "14:00", got ${JSON.stringify(session.start)}`);
  }

  const blocks = Array.isArray(agenda.blocks) ? agenda.blocks : [];
  if (blocks.length === 0) {
    error('BLOCKS_MISSING', 'The agenda has no blocks');
  }

  // Per-block checks
  let highestPhase = -1;
  blocks.forEach((block, index) => {
    const b = block || {};
    const label = blockLabel(b, index);
    const phase = normalisePhase(b.phase);
    const phaseIndex = PHASES.indexOf(phase);

    if (!b.title || !String(b.title).trim()) {
      error('BLOCK_TITLE_MISSING', `${label} has no title`);
    }
    if (phaseIndex === -1) {
      error('PHASE_UNKNOWN', `${label}: phase must be one of ${PHASES.join(', ')}, got ${JSON.stringify(b.phase)}`);
    } else {
      if (phaseIndex < highestPhase) {
        error('PHASE_ORDER', `${label} is in ${phaseLabel(phase)} but comes after a ${phaseLabel(PHASES[highestPhase])} block; phases must run C1 → C4`);
      }
      highestPhase = Math.max(highestPhase, phaseIndex);
    }
    if (!Number.isInteger(b.minutes) || b.minutes <= 0) {
      error('MINUTES_INVALID', `${label}: minutes must be a positive whole number, got ${JSON.stringify(b.minutes)}`);
    }
    if (!b.purpose || !String(b.purpose).trim()) {
      error('PURPOSE_MISSING', `${label} has no purpose; say why this block exists`);
    }
    if (b.type && /story/i.test(String(b.type)) && Number.isInteger(b.minutes) && b.minutes > MAX_STORY_MINUTES) {
      warning('STORY_TOO_LONG', `${label} is a story of ${b.minutes} min; keep stories to ${MAX_STORY_MINUTES} min (1 punch, 1 stumble, 1 takeaway)`);
    }
  });

  const plan = schedule(agenda);

  // Total against slot
  if (slotValid && blocks.length > 0 && plan.total !== slot) {
    const diff = plan.total - slot;
    error('TOTAL_MISMATCH', `Blocks add up to ${plan.total} min, but the slot is ${slot} min (${diff > 0 ? '+' : ''}${diff} min)`);
  }

  // Phase presence and balance
  const shares = resolvePhaseShare(agenda, error);
  for (const phase of PHASES) {
    const window = plan.phases[phase];
    if (!window) {
      error('PHASE_MISSING', `No block in ${phaseLabel(phase)}`);
      continue;
    }
    if (slotValid) {
      const share = (window.minutes / slot) * 100;
      const [min, max] = shares[phase];
      if (share < min || share > max) {
        warning('PHASE_SHARE', `${phaseLabel(phase)} takes ${window.minutes} min (${Math.round(share)} % of the slot); expected ${min}–${max} %`);
      }
    }
  }

  // Acceptance sentences
  const acceptance = agenda.acceptance && typeof agenda.acceptance === 'object' ? agenda.acceptance : {};
  const acceptanceByPhase = {};
  for (const [key, sentence] of Object.entries(acceptance)) {
    const phase = normalisePhase(key);
    if (!PHASES.includes(phase)) {
      warning('ACCEPTANCE_UNKNOWN_PHASE', `acceptance.${key} does not belong to a phase (${PHASES.join(', ')})`);
      continue;
    }
    acceptanceByPhase[phase] = sentence;
  }
  for (const phase of PHASES) {
    const sentence = acceptanceByPhase[phase];
    if (!sentence || !String(sentence).trim()) {
      error('ACCEPTANCE_MISSING', `No acceptance sentence for ${phaseLabel(phase)}; write "At minute N, every participant has …"`);
      continue;
    }
    const match = ACCEPTANCE_RE.exec(String(sentence));
    if (!match) {
      error('ACCEPTANCE_FORMAT', `${phase} acceptance sentence must start with "At minute N": "${sentence}"`);
      continue;
    }
    const minute = Number(match[1]);
    const window = plan.phases[phase];
    if (window && !(minute > window.start && minute <= window.end)) {
      error('ACCEPTANCE_WINDOW', `${phase} acceptance names minute ${minute}, but ${PHASE_NAMES[phase]} runs from minute ${window.start} to ${window.end}`);
    }
    if (!/every participant/i.test(String(sentence))) {
      warning('ACCEPTANCE_WORDING', `${phase} acceptance sentence should say what every participant has done: "${sentence}"`);
    }
  }

  // Learning-objective references (only when objectives are listed)
  const objectives = agenda.learning_objectives;
  if (objectives && typeof objectives === 'object' && !Array.isArray(objectives)) {
    const used = new Set();
    blocks.forEach((block, index) => {
      const ids = block && Array.isArray(block.los) ? block.los : [];
      for (const id of ids) {
        used.add(String(id));
        if (!Object.prototype.hasOwnProperty.call(objectives, id)) {
          warning('LO_UNKNOWN', `${blockLabel(block, index)} refers to learning objective "${id}", which is not listed`);
        }
      }
    });
    for (const id of Object.keys(objectives)) {
      if (!used.has(id)) {
        warning('LO_UNUSED', `Learning objective "${id}" is not addressed by any block`);
      }
    }
  }

  return {
    issues,
    errors: issues.filter((i) => i.level === 'error'),
    warnings: issues.filter((i) => i.level === 'warning'),
    schedule: plan,
  };
}

/**
 * Human-readable issue list.
 * @param {object[]} issues
 * @returns {string}
 */
function formatIssues(issues) {
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.length - errors;
  const ordered = [...issues.filter((i) => i.level === 'error'), ...issues.filter((i) => i.level !== 'error')];
  const lines = ordered.map((i) => `${i.level === 'error' ? 'ERROR' : 'WARN '}  ${i.code.padEnd(20)} ${i.message}`);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  lines.push(issues.length === 0 ? 'OK  No issues found.' : `${plural(errors, 'error')}, ${plural(warnings, 'warning')}`);
  return lines.join('\n');
}

module.exports = {
  DEFAULT_PHASE_SHARE,
  MAX_STORY_MINUTES,
  checkAgenda,
  formatIssues,
};
