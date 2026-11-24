# Adding the Primitive obsession role

Two changes, both in the review setup. Neither touches source code.

1. Copy `review-templates/primitive-obsession.agent.md` to
   `.github/agents/primitive-obsession.agent.md`.
2. Add this row to the optional-roles table in
   `.github/skills/multi-agent-review/SKILL.md`, under R2:

```markdown
| R3 | Primitive obsession | `primitive-obsession` | adds a line declaring a public method, constructor, field or constant in a file under `src/main/java/com/example/giftcard/api/` whose parameter, return type or field type is a raw `long`, `int` or `String` standing for money, a card number or a number of days (names containing amount, pence, money, balance, card, number, days, grace or expir) |
```

Then ask the review session which optional rules match the current changes. It applies
every rule in the table, R3 included, and names each match with its line. A rule that
matches puts its role on the roster of the next review.
