'use strict';

/** A small valid 60-minute agenda that tests can break one field at a time. */
function validAgenda() {
  return {
    session: { title: 'Test session', slot_minutes: 60, start: '09:00' },
    acceptance: {
      C1: 'At minute 10, every participant has said why they came.',
      C2: 'At minute 35, every participant has seen the model applied once.',
      C3: 'At minute 50, every participant has applied the model to their own case.',
      C4: 'At minute 60, every participant has written down one next step.',
    },
    learning_objectives: { LO1: 'Apply the model to a case.' },
    blocks: [
      { title: 'Opening', phase: 'C1', minutes: 10, purpose: 'Connect to experience.' },
      { title: 'Model', phase: 'C2', minutes: 25, purpose: 'Introduce the model.', type: 'Input' },
      { title: 'Practice', phase: 'C3', minutes: 15, purpose: 'Apply the model.', los: ['LO1'] },
      { title: 'Close', phase: 'C4', minutes: 10, purpose: 'Commit to a next step.' },
    ],
  };
}

function codes(result) {
  return result.issues.map((i) => i.code);
}

module.exports = { validAgenda, codes };
