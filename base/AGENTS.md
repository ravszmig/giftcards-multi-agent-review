# Gift card service

A Java 21 service that issues, redeems and tops up gift cards, keeps a ledger of every
movement and reports daily totals. Store tills call it over HTTP. Partner teams embed it
and call `com.example.giftcard.api.GiftCards`.

## Build and test

```sh
mvn -o -q test                                   # the full suite, offline; CI runs exactly this
mvn -o -q test -Dtest=CardHandlerTest            # one class
mvn -o -q test -Dtest=CardHandlerTest#errorsMapToStatuses
```

Everything is offline. Do not add dependencies.

## Layout

| Path | What is there |
|---|---|
| `src/main/java/com/example/giftcard/domain/` | cards, money, the ledger, services |
| `src/main/java/com/example/giftcard/reporting/` | daily totals |
| `src/main/java/com/example/giftcard/adapter/jdbc/` | H2 repositories and the migration runner |
| `src/main/java/com/example/giftcard/adapter/web/` | HTTP handlers, JSON, the store webhook |
| `src/main/java/com/example/giftcard/api/` | the partner API |
| `src/main/java/com/example/giftcard/app/` | `GiftCardApplication` (HTTP process) and `ReportingJob` |
| `src/main/resources/db/migration/` | `V<n>__<description>.sql`, applied in order at start |
| `src/test/java/` | JUnit 5; `support/` has `TestDatabase`, `Clocks`, `TestHttp` |
| `tickets/` | the stories to implement |

## Conventions

- Services take their collaborators and a `java.time.Clock` in the constructor.
- `GiftCardApplication.start` wires every object.
- Tests use a fresh H2 database per test and `Clocks.fixed()`.

## When you implement a ticket

- Implement only what the ticket or the pasted review findings ask.
- Add no validation, rule or check that nobody asked for. Inputs the ticket does not
  constrain, such as store ids, stay as they are.
- Add tests for what you change. Finish with `mvn -o -q test` passing.
- Leave your changes uncommitted. Do not edit `.github/`, `REVIEW-CONTRACT.md`, `docs/`,
  `tickets/` or `review/`.
