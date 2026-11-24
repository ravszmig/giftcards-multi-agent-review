# Gift cards: multi-agent review lab

A synthetic Java 21 gift card service, two tickets, and a review stage made of named reviewer
agents. The participant builds each ticket with one Copilot CLI session, reviews it with
another, acts on every FAIL, adds a reviewer role of their own, and makes the one decision no
agent may make. Everything happens in IntelliJ and Copilot CLI.

- **Running the session:** [facilitator/FACILITATOR-GUIDE.md](facilitator/FACILITATOR-GUIDE.md).
  Keep `facilitator/` off the shared screen.

## Setup

JDK 21, Maven 3.9, Node.js 22 or later, and Copilot CLI 1.0.114 or later (1.0.115 seen).

```sh
git clone https://github.com/ravszmig/giftcards-multi-agent-review.git
```

In IntelliJ: File, Open, the `giftcards-multi-agent-review` folder, with a JDK 21 as the
project SDK. In IntelliJ's terminal, from that folder, run `copilot`.

## What is in it

| Path | What |
|---|---|
| `tickets/` | GC-207 partial refund, GC-212 card expiry |
| `AGENTS.md` | Build, layout and conventions |
| `.github/skills/multi-agent-review/` | The review skill: roster, routing rules, steps |
| `.github/agents/` | Five reviewers and the reconciler |
| `REVIEW-CONTRACT.md` | Run status, findings, severities and the verdict rule |
| `docs/knowledge/` | The reviewers' rules, one reader per file |
| `review-templates/` | A reviewer role and a routing rule, added by hand in the session |
| `facilitator/` | The guide and the expected outcomes. Facilitator only |

Each review writes its records and report to `review/`, which Git ignores.

## Starting again

In IntelliJ: Git, Rollback, select all, Rollback. Then delete `review/`. Or delete the clone
and clone again.
