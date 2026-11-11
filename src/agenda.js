'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

const PHASES = ['C1', 'C2', 'C3', 'C4'];

const PHASE_NAMES = {
  C1: 'Connections',
  C2: 'Concepts',
  C3: 'Concrete Practice',
  C4: 'Conclusions',
};

/**
 * Read and parse an agenda YAML file.
 * @param {string} file
 * @returns {object}
 */
function loadAgenda(file) {
  return parseAgenda(fs.readFileSync(file, 'utf8'));
}

/**
 * Parse agenda YAML text.
 * @param {string} text
 * @returns {object}
 */
function parseAgenda(text) {
  const doc = yaml.load(text);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Agenda YAML must be a mapping with "session", "acceptance" and "blocks"');
  }
  return doc;
}

/** Normalise "c1", " C1 " etc. to "C1". Returns the input string otherwise. */
function normalisePhase(phase) {
  return String(phase === undefined || phase === null ? '' : phase).trim().toUpperCase();
}

function phaseLabel(phase) {
  return PHASE_NAMES[phase] ? `${phase} ${PHASE_NAMES[phase]}` : String(phase);
}

/**
 * Parse "HH:MM" into minutes after midnight.
 * @returns {number|null}
 */
function parseClock(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value === undefined ? '' : value).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Format minutes after midnight as "HH:MM" (wraps at 24h). */
function formatClock(minutes) {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function validMinutes(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/**
 * Lay the blocks out on the clock.
 *
 * Offsets are minutes from the start of the session. Invalid durations count
 * as 0 so that a broken agenda can still be reported on.
 *
 * @param {object} agenda
 * @returns {{start: number, blocks: object[], phases: object, total: number}}
 */
function schedule(agenda) {
  const session = agenda.session || {};
  const start = parseClock(session.start);
  const startMin = start === null ? 0 : start;
  const blocks = Array.isArray(agenda.blocks) ? agenda.blocks : [];

  let offset = 0;
  const laidOut = blocks.map((block, index) => {
    const minutes = validMinutes(block && block.minutes);
    const item = {
      index,
      number: index + 1,
      block: block || {},
      phase: normalisePhase(block && block.phase),
      minutes,
      start: offset,
      end: offset + minutes,
      clockStart: formatClock(startMin + offset),
      clockEnd: formatClock(startMin + offset + minutes),
    };
    offset += minutes;
    return item;
  });

  const phases = {};
  for (const item of laidOut) {
    if (!PHASES.includes(item.phase)) continue;
    const w = phases[item.phase];
    if (!w) {
      phases[item.phase] = { start: item.start, end: item.end, minutes: item.minutes, blocks: [item] };
    } else {
      w.start = Math.min(w.start, item.start);
      w.end = Math.max(w.end, item.end);
      w.minutes += item.minutes;
      w.blocks.push(item);
    }
  }
  for (const p of Object.keys(phases)) {
    phases[p].clockStart = formatClock(startMin + phases[p].start);
    phases[p].clockEnd = formatClock(startMin + phases[p].end);
  }

  return { start: startMin, blocks: laidOut, phases, total: offset };
}

module.exports = {
  PHASES,
  PHASE_NAMES,
  loadAgenda,
  parseAgenda,
  normalisePhase,
  phaseLabel,
  parseClock,
  formatClock,
  schedule,
};
