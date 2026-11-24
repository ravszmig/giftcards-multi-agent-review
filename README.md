# Gift cards: multi-agent review lab

A synthetic Java 21 gift card service, two tickets, and a review stage made of named reviewer
agents. In one session the participant builds each ticket with one Copilot CLI session,
reviews it with another, acts on every FAIL, adds a reviewer role of their own, and makes the
one decision no agent may make. Everything happens in IntelliJ and Copilot CLI.

No services, no client code, no tickets of your own.

- **Running the session:** [facilitator/FACILITATOR-GUIDE.md](facilitator/FACILITATOR-GUIDE.md),
  step by step. Keep `facilitator/` off the shared screen.

## Setup

On `PATH`: JDK 21, Maven 3.9, Node.js 22 or later, Git, Copilot CLI 1.0.114 or later, and
`gh` signed in. macOS or Linux: the launch scripts are bash.

```sh
git clone https://github.com/ravszmig/giftcards-multi-agent-review.git
cd giftcards-multi-agent-review
node scripts/warm-up.mjs
```

The warm-up needs network once. It prints an `ok` line per step, then `Ready: …`. Every
build after it runs Maven offline.

In IntelliJ: File, Open, and pick the `giftcards-multi-agent-review` folder. Set the project
SDK to a JDK 21. Start Copilot from this folder, in IntelliJ's terminal, with one of:

```sh
scripts/copilot-builder     # builds a ticket
scripts/copilot-reviewer    # runs the review
```

> **TODO.** Windows is not covered. The launch scripts are bash. A PowerShell twin of
> `scripts/copilot-session.sh`, rehearsed once on a Windows laptop, closes this.

## What is in it

| Path | What |
|---|---|
| `tickets/` | GC-207 partial refund, GC-212 card expiry |
| `AGENTS.md` | Build, layout and conventions for the builder |
| `.github/skills/multi-agent-review/` | The review skill and `pin.mjs`, which pins a ticket branch against `main` and computes the roster |
| `.github/agents/` | Five reviewers and the reconciler |
| `REVIEW-CONTRACT.md` | Run status, finding blocks, the report and the verdict rule |
| `docs/knowledge/` | The reviewers' rules, one reader per file |
| `review-templates/` | A reviewer role and a routing rule, added by hand in the session |
| `scripts/` | The two launch scripts and the warm-up |
| `facilitator/` | The guide, the expected outcomes, proof tests and checks. Facilitator only |

`review/` (each review's pin, records and report) and `.lab/` (each Copilot session's profile
and log) are created during the session and ignored by Git.

## Starting again

Delete the clone and clone again. Or, from the clone's root:

```sh
git checkout -q main && git reset -q --hard origin/main
git branch -D ticket-1 ticket-2
rm -rf review .lab
```
