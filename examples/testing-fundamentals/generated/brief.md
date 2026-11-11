# Session brief: Testing Fundamentals

> Fictional example data.

| | |
|---|---|
| Slot | 60 min, 14:00–15:00 |
| Format | Online, 8 to 16 participants, one facilitator |
| Audience | Developers who write code every day but rarely write tests |
| Promise | Leave with your first unit test written and one test planned for your own code |

## Acceptance sentences

| Phase | Window | Acceptance sentence |
|---|---|---|
| C1 Connections | 14:00–14:10 | At minute 10, every participant has named one bug from their own work that a unit test could have caught. |
| C2 Concepts | 14:10–14:35 | At minute 35, every participant has predicted the result of at least one test in the live demo before it ran. |
| C3 Concrete Practice | 14:35–14:50 | At minute 50, every participant has written and run one failing and one passing unit test. |
| C4 Conclusions | 14:50–15:00 | At minute 60, every participant has written down one test they will add to their own code this week. |

## Timeline

| Time | Min | Phase | Block | Type | Method | Purpose | LOs |
|---|---|---|---|---|---|---|---|
| 14:00–14:04 | 4 | C1 | Check-in: the bug that got away | Opening | Chat waterfall: everyone types one sentence, all send at once | Connect the topic to bugs participants have already met. | – |
| 14:04–14:10 | 6 | C1 | What makes a test useful? | Discussion | Pairs for three minutes, then three answers in plenary | Surface what participants already believe about tests. | – |
| 14:10–14:18 | 8 | C2 | Anatomy of a unit test | Input | Short talk with live code: arrange, act, assert | Give one structure that every test in the session follows. | LO1 |
| 14:18–14:25 | 7 | C2 | Story: the test that always passed | Story | One punch, one stumble, one takeaway | Show why a test that was never seen failing proves nothing. | LO2 |
| 14:25–14:35 | 10 | C2 | Live demo: red, green, refactor | Demo | Facilitator codes; participants call the next step and predict each result | Make the test-first rhythm visible before participants try it. | LO2, LO3 |
| 14:35–14:47 | 12 | C3 | Pair exercise: first failing test | Exercise | Pairs in breakout rooms with a prepared practice repository | Apply arrange-act-assert to a small function until the test passes. | LO1, LO3 |
| 14:47–14:50 | 3 | C3 | Gallery: one test per pair | Debrief | Each pair pastes its test into the chat; facilitator picks two to discuss | Compare solutions and spot common mistakes. | LO3 |
| 14:50–14:56 | 6 | C4 | Commitment: one test this week | Reflection | Individual note, then one sentence each in the chat | Turn the session into one concrete next step. | LO4 |
| 14:56–15:00 | 4 | C4 | Questions and close | Closing | Open questions | Clear remaining doubts and end on time. | – |

## Phase balance

| Phase | Minutes | Share |
|---|---|---|
| C1 Connections | 10 | 17 % |
| C2 Concepts | 25 | 42 % |
| C3 Concrete Practice | 15 | 25 % |
| C4 Conclusions | 10 | 17 % |

## Learning objectives

| ID | Objective | Blocks |
|---|---|---|
| LO1 | Write a unit test that follows the arrange-act-assert structure. | 3, 6 |
| LO2 | Explain why a new test should be seen failing before it passes. | 4, 5 |
| LO3 | Run a test suite and read the output of a failing test. | 5, 6, 7 |
| LO4 | Plan one concrete test to add to an existing codebase. | 8 |
