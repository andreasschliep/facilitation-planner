# facilitation-planner

Plan a training session backwards from what every participant must have done
by a given minute, and let a small checker keep the timing honest.

*Built with Claude Code as co-developer.*

## Problem

Session plans tend to fail in the same places. The blocks add up to 70 minutes
in a 60-minute slot. The concept phase swallows the practice. A facilitator
guide gets written before anyone has decided what participants should be able
to do at the end, so every paragraph sounds useful and none can be checked.

## Approach

**Brief first, guide second.** The plan is written in three steps, and each step
constrains the next:

1. **Acceptance sentences.** One per phase of the 4C model (Connections,
   Concepts, Concrete Practice, Conclusions), always in the form
   *"At minute N, every participant has …"*. They name something participants
   have done, not something the facilitator has shown.
2. **Agenda (design table).** Blocks with phase, minutes, method and purpose,
   kept in `agenda.yaml`. The checker verifies the arithmetic and that each
   acceptance minute falls inside its phase.
3. **Facilitator guide.** Generated as a skeleton from the agenda and then
   filled in block by block. Every paragraph is read against the acceptance
   sentence of its phase; what does not serve it is cut.

The repository has two parts:

- **`plan-session`**, a small Node CLI that checks an agenda and generates a
  session brief, a facilitator-guide skeleton and a plain-text export for
  session-planning tools such as SessionLab.
- **A Claude Code skill** (`.claude/skills/plan-session/SKILL.md`) that walks
  an AI assistant through the brief-first method and uses the CLI as its check.

## Quick start

Requires Node.js 22 or later.

```bash
npm install
npx plan-session check examples/testing-fundamentals/agenda.yaml
npx plan-session all examples/testing-fundamentals/agenda.yaml --out out
npm test
```

The example is a fictional 60-minute workshop, "Testing Fundamentals".
The generated files are committed in
[`examples/testing-fundamentals/generated/`](examples/testing-fundamentals/generated/).

To see the checker fail on purpose:

```bash
npx plan-session check examples/testing-fundamentals/agenda-broken.yaml
```

```text
ERROR  PURPOSE_MISSING      Block 4 "Pair exercise: first failing test" has no purpose; say why this block exists
ERROR  PHASE_ORDER          Block 5 "Live demo: red, green, refactor" is in C2 Concepts but comes after a C3 Concrete Practice block; phases must run C1 → C4
ERROR  TOTAL_MISMATCH       Blocks add up to 65 min, but the slot is 60 min (+5 min)
ERROR  ACCEPTANCE_WINDOW    C3 acceptance names minute 25, but Concrete Practice runs from minute 30 to 45
ERROR  ACCEPTANCE_MISSING   No acceptance sentence for C4 Conclusions; write "At minute N, every participant has …"
WARN   STORY_TOO_LONG       Block 3 "Story: the test that always passed" is a story of 12 min; keep stories to 9 min (1 punch, 1 stumble, 1 takeaway)
WARN   ACCEPTANCE_WORDING   C2 acceptance sentence should say what every participant has done: "At minute 30, the facilitator has shown the red-green-refactor cycle."
WARN   LO_UNKNOWN           Block 5 "Live demo: red, green, refactor" refers to learning objective "LO9", which is not listed
5 errors, 3 warnings
```

## Commands

```text
plan-session check  <agenda.yaml> [--strict] [--json]
plan-session brief  <agenda.yaml>            # Markdown to stdout
plan-session guide  <agenda.yaml>            # Markdown to stdout
plan-session export <agenda.yaml>            # plain text to stdout
plan-session all    <agenda.yaml> [--out dir]
```

Exit codes: `0` OK, `1` the agenda has errors (or warnings with `--strict`),
`2` usage or file error. The render commands refuse to write anything while
the agenda has errors.

## Agenda format

```yaml
session:
  title: "Testing Fundamentals"
  slot_minutes: 60
  start: "14:00"
  audience: "Developers who write code every day but rarely write tests"

acceptance:
  C1: "At minute 10, every participant has named one bug ..."
  C2: "At minute 35, every participant has predicted ..."
  C3: "At minute 50, every participant has written and run ..."
  C4: "At minute 60, every participant has written down ..."

learning_objectives:          # optional
  LO1: "Write a unit test that follows the arrange-act-assert structure."

blocks:
  - title: "Anatomy of a unit test"
    phase: C2
    minutes: 8
    type: Input               # optional
    method: "Short talk with live code"
    purpose: "Give one structure that every test in the session follows."
    description: "..."        # optional, used in the export
    los: [LO1]                # optional

rules:                        # optional: override the phase balance
  phase_share:
    C2: [35, 55]              # percent of the slot
```

## What the checker enforces

| Check | Level |
|---|---|
| Blocks add up exactly to the slot | error |
| Every phase C1–C4 has at least one block; phases run in order | error |
| Every block has a title, a positive whole number of minutes and a purpose | error |
| Every phase has an acceptance sentence starting with "At minute N" | error |
| N falls inside the phase: after its start, at the latest at its end | error |
| The acceptance sentence talks about *every participant* | warning |
| Phase share within range (default C1 10–25 %, C2 30–50 %, C3 15–35 %, C4 10–25 %) | warning |
| Stories last at most 9 minutes | warning |
| Referenced learning objectives exist, listed ones are used | warning |

## Repository layout

```text
bin/plan-session.js            CLI
src/agenda.js                  YAML loading, clock arithmetic, scheduling
src/check.js                   the rules above
src/render.js                  brief, facilitator guide, plain-text export
templates/                     blank session brief and facilitator guide
.claude/skills/plan-session/   Claude Code skill for the brief-first workflow
examples/testing-fundamentals/ fictional example, valid and broken
test/                          node:test suite
```

## How this was built

The brief-first method comes from my own practice of designing short training sessions, where it lived as a Claude Code skill. For this repository, Claude Code rewrote the skill in neutral form and wrote the checker, the generators, the templates and the example from scratch, following my requirements.

Three rules I follow when working with AI:

1. It only sees what I would also show a client.
2. It says what it has done.
3. Nothing leaves the house without human review.

## Credits

The four phases Connections, Concepts, Concrete Practice and Conclusions (4C)
come from Sharon L. Bowman, *Training from the BACK of the Room!* (Pfeiffer,
2009). This project is not affiliated with or endorsed by the author.

All example data is fictional.

## Related tools

Small tools from my work as a trainer and facilitator:

- [learning-objective-lint](https://github.com/andreasschliep/learning-objective-lint): lint learning objectives against Bloom's taxonomy and check that an agenda practises them
- [miro-board-builder](https://github.com/andreasschliep/miro-board-builder): describe a Miro board in YAML, check it offline, then build it through the REST API
- [wardley-map-builder](https://github.com/andreasschliep/wardley-map-builder): render Wardley maps from YAML to PNG or onto a Miro board

More about me: [github.com/andreasschliep](https://github.com/andreasschliep)

## License

MIT, see [LICENSE](LICENSE).
