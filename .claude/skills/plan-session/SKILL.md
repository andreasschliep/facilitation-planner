---
name: plan-session
description: Plan a short training session brief-first. Write one acceptance sentence per 4C phase, then the agenda (design table), check it with plan-session, then turn it into a facilitator guide. Use when designing a new workshop, webinar or training block.
argument-hint: <session-title> [slot-minutes]
allowed-tools: Read Write Edit Glob Bash(node bin/plan-session.js *) Bash(npx plan-session *)
---

# Plan a session, brief-first

Design a session backwards from what every participant must have **done** by a
given minute. The order matters: acceptance sentences, then the agenda, then the
facilitator guide.

## Input

- `$0`: session title
- `$1`: slot length in minutes (default 60)
- Ask the user for audience, format and the promise made in the announcement if
  they are not given. Do not invent them.

## Output

```
sessions/<slug>/
├── agenda.yaml               # the design table, checked by plan-session
├── brief.md                  # generated: acceptance sentences + timeline
├── facilitator-guide.md      # generated skeleton, then filled in
└── export.txt                # generated: plain text for planning tools
```

## Workflow

1. **Find a precedent.** If a similar `agenda.yaml` exists in the repository,
   read it for shape and pacing. Do not copy its content.
2. **Write four acceptance sentences**, one per phase:
   *"At minute N, every participant has …"*. Each names an observable result
   for every participant, never "the facilitator has shown …". Show them to the
   user and agree on them before going on.
3. **Write `agenda.yaml`.** Blocks in phase order C1 → C4, each with minutes,
   method and purpose. Default split for 60 minutes: about 10 / 25 / 15 / 10.
4. **Run the checker** and fix every error:
   `node bin/plan-session.js check sessions/<slug>/agenda.yaml`
   Discuss warnings with the user instead of silencing them.
5. **Generate the documents:**
   `node bin/plan-session.js all sessions/<slug>/agenda.yaml --out sessions/<slug>`
6. **Fill in the facilitator guide** block by block: Say this, Watch out,
   Debrief, Transition. Keep the timing from the agenda; if a block needs more
   time, change `agenda.yaml` and run the checker again.
7. **Review against the acceptance sentences.** Read each paragraph of the guide
   against the acceptance sentence of its phase. Cut paragraphs that do not
   help participants get there. Report what you cut.

## Rules

- **Brief first.** The design table forces a commitment to timing per phase.
  Writing the guide first produces prose whose timing does not fit any plan.
- **Acceptance sentences first.** They are the test every later paragraph must
  pass.
- **Stories:** 1 punch, 1 stumble, 1 takeaway, at most 9 minutes. Without this
  constraint, concept phases grow past their budget.
- **Protect the conclusions phase.** When time runs short, shorten concept or
  practice blocks, never C4.
- Leave layout, slides and boards for later; this skill produces the plan and
  the words.

## The 4C phases

| Phase | Purpose |
|---|---|
| C1 Connections | Participants connect the topic to what they already know |
| C2 Concepts | New ideas, models, demonstrations |
| C3 Concrete Practice | Participants apply the concepts themselves |
| C4 Conclusions | Participants summarise, evaluate and commit to a next step |

The 4C model comes from Sharon L. Bowman, *Training from the BACK of the Room!*
(2009).
