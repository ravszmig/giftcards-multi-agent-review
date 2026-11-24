# Architecture

Evidence: `gift-card-service`, branch `main`, the commit tagged `base`.
Static inspection of that commit only. No build, test, deployment or external call
was run. Source configuration is not proof of deployed configuration.
Path shorthand: `M/` = `src/main/java/com/example/giftcard/`, `T/` = `src/test/java/com/example/giftcard/`.

Read by: the Architect reviewer. Rules a reviewer applies carry an ID (`A-n`).

## 1. Purpose

The service issues gift cards, redeems and tops them up, keeps an append-only ledger of
every movement, and reports daily totals to Finance. Store staff use it over HTTP
(`M/adapter/web/CardHandler.java:20-32` `CardHandler`). Partner teams embed it in their
own processes and call the published API (`M/api/GiftCards.java:8-12` `GiftCards`). A
nightly job prints Finance totals without starting the HTTP server
(`M/app/ReportingJob.java:8-12` `ReportingJob`).

## 2. Stack

| Dimension | Finding | Evidence |
|---|---|---|
| Language | Java 21 | `pom.xml:13` `maven.compiler.release` |
| Build | Maven, offline (`mvn -o`) | `pom.xml:1-52` |
| HTTP | JDK `com.sun.net.httpserver.HttpServer`, no framework | `M/app/GiftCardApplication.java:65-75` |
| Outbound HTTP | JDK `java.net.http.HttpClient` | `M/adapter/web/StoreWebhookNotifier.java:27-30` |
| Database | H2 2.3.232 over JDBC | `pom.xml:18-22`, `M/app/GiftCardApplication.java:80-85` |
| Schema | Versioned SQL files applied by an in-house runner | `M/adapter/jdbc/MigrationRunner.java:29-36` |
| Logging | `java.util.logging` | `M/adapter/web/CardHandler.java:35` |
| Tests | JUnit 5.12.2 | `pom.xml:23-28` |

## 3. Module map

One Maven module. Packages:

| Package | Responsibility | Key symbols |
|---|---|---|
| `domain` | Cards, money, ledger entries, business rules, repository interfaces | `GiftCard`, `Money`, `CardNumber`, `CardService`, `RedemptionService`, `RedemptionHistory`, `GiftCardRepository`, `LedgerRepository` |
| `reporting` | Daily Finance totals from the ledger | `ReportingService` |
| `adapter.jdbc` | H2 persistence and schema migrations | `JdbcGiftCardRepository`, `JdbcLedgerRepository`, `MigrationRunner` |
| `adapter.web` | HTTP routes, JSON, error mapping, the store webhook | `CardHandler`, `ReportHandler`, `Json`, `ErrorMapper`, `StoreWebhookNotifier` |
| `api` | The published in-process API for partner teams | `GiftCards`, `CardView` |
| `app` | Composition roots | `GiftCardApplication`, `ReportingJob` |

The class-level inventory and the allowed imports per package are in
[CODE_STRUCTURE.md](CODE_STRUCTURE.md).

Coverage: 6 packages from `find src/main/java -type d`; 26 classes; all listed in CODE_STRUCTURE.

## 4. Entry points

| Entry | Trigger | Auth or guard | Handler | Feature | Evidence |
|---|---|---|---|---|---|
| `POST /cards` | HTTP | none in this service; the store network fronts it | `CardHandler.issue` | Issue | `M/adapter/web/CardHandler.java:56-57` |
| `GET /cards/{number}` | HTTP | as above | `CardHandler.balance` | Balance | `M/adapter/web/CardHandler.java:58-59` |
| `POST /cards/{number}/redemptions` | HTTP | as above | `CardHandler.redeem` | Redeem | `M/adapter/web/CardHandler.java:60-62` |
| `GET /cards/{number}/redemptions` | HTTP | as above | `CardHandler.redemptions` | Redemption history | `M/adapter/web/CardHandler.java:63-65` |
| `POST /cards/{number}/top-ups` | HTTP | as above | `CardHandler.topUp` | Top-up | `M/adapter/web/CardHandler.java:66-67` |
| `GET /reports/daily?date=` | HTTP | as above | `ReportHandler.handle` | Reporting | `M/adapter/web/ReportHandler.java:26-50` |
| `GiftCards.*` | In-process call | the partner's process | `GiftCards` | Partner API | `M/api/GiftCards.java:12-43` |
| `ReportingJob.main` | Nightly scheduler outside this repo | none | `ReportingJob.run` | Reporting | `M/app/ReportingJob.java:17-28` |
| `GiftCardApplication.main` | Process start | none | `GiftCardApplication.start` | All HTTP features | `M/app/GiftCardApplication.java:102-106` |

Coverage: 2 `createContext` calls (`M/app/GiftCardApplication.java:71-72`), 5 route branches in `CardHandler.handle`, 1 in `ReportHandler`, 2 `main` methods, 1 public API class. All listed.

## 5. Layers and wiring

1. A handler in `adapter.web` parses the request into domain values (`Money.parse`, `CardNumber.of`) (`M/adapter/web/CardHandler.java:98-100`).
2. It calls one domain service (`M/adapter/web/CardHandler.java:101`).
3. The service applies the rule and stores the change through a domain interface (`M/domain/RedemptionService.java:22-27`).
4. `adapter.jdbc` implements the interface (`M/adapter/jdbc/JdbcGiftCardRepository.java:20`).
5. After the service returns, the handler starts any outbound call, then writes the response (`M/adapter/web/CardHandler.java:104-108`).

Wiring is constructor injection by hand. `GiftCardApplication.start` builds every object
(`M/app/GiftCardApplication.java:53-78`). `ReportingJob.run` builds only the ledger
repository and the reporting service (`M/app/ReportingJob.java:17-19`).

### Rules

- **A-1 Dependencies point inward.** `domain` imports only the JDK. `reporting` imports
  `domain` and the JDK. No class in `domain` or `reporting` imports `adapter`, `app` or
  `api`, by `import` or by fully qualified name. A violation is **HIGH**: partner teams
  embed the domain through `api` with no HTTP stack, and `ReportingJob` runs it with none.
  A domain class that needs `adapter.web` makes every process that builds it carry the
  web adapter, its configuration and its network access, and a partner process would call
  the store system.
- **A-2 Outbound calls start in an adapter.** The store webhook is called by the handler
  after the domain call returns, as `CardHandler.redeem` does
  (`M/adapter/web/CardHandler.java:101-104`). When a domain service must trigger
  something outside itself, the domain declares an interface (a port) and `app` wires an
  adapter that implements it. The domain never constructs or calls an adapter class. A
  violation is the same HIGH as A-1.
- **A-3 One composition root per process.** Objects are created and wired only in
  `M/app/`. A service that constructs its own collaborators is **MEDIUM**.
- **A-4 Handlers translate and delegate.** A handler holds no business rule. A rule that
  lives in a handler is **MEDIUM**: the partner API and the nightly job do not pass
  through it.

## 6. Feature and change-path index

| Term | Kind | Feature |
|---|---|---|
| `/cards` | route | Issue |
| `/cards/{number}` | route | Balance |
| `/cards/{number}/redemptions` | route | Redeem, Redemption history |
| `/cards/{number}/top-ups` | route | Top-up |
| `/reports/daily` | route | Reporting |
| `REDEMPTION` | webhook event | Redeem |
| `INSUFFICIENT_BALANCE`, `BALANCE_LIMIT` | API error code | Redeem, Top-up, Issue |
| `GIFTCARD_WEBHOOK_URL` | config key | Redeem |
| ledger, entry, `EntryKind` | domain word | all |

### Redeem

Search terms: `/redemptions`, `RedemptionService`, `REDEMPTION`, `INSUFFICIENT_BALANCE`
Entry: `M/adapter/web/CardHandler.java:97` `CardHandler.redeem`

| Hop | File | Symbol | Locator | What happens | Tests covering this hop |
|---|---|---|---|---|---|
| 1 | handler | `CardHandler.redeem` | `M/adapter/web/CardHandler.java:97-109` | parses, delegates, logs, notifies, responds | `T/adapter/web/CardHandlerTest.java:37-54` |
| 2 | service | `RedemptionService.redeem` | `M/domain/RedemptionService.java:22-27` | loads card, applies rule, stores | `T/domain/RedemptionServiceTest.java:21-50` |
| 3 | value | `GiftCard.redeem` | `M/domain/GiftCard.java:14-20` | rejects above balance | `T/domain/GiftCardTest.java:14-16` |
| 4 | repository | `JdbcGiftCardRepository.apply` | `M/adapter/jdbc/JdbcGiftCardRepository.java:61-76` | version check, update, ledger insert, one transaction | `T/adapter/jdbc/JdbcGiftCardRepositoryTest.java:31-50` |
| 5 | outbound | `StoreWebhookNotifier.redemption` | `M/adapter/web/StoreWebhookNotifier.java:33-41` | fire-and-forget POST | `T/adapter/web/StoreWebhookNotifierTest.java:26-50` |

Ends at: a `cards` update, a `REDEEM` ledger entry, a webhook POST, a `201`.

### Issue, Balance, Top-up

Entry: `CardHandler.issue`, `CardHandler.balance`, `CardHandler.topUp`
(`M/adapter/web/CardHandler.java:78-131`), all delegating to `CardService`
(`M/domain/CardService.java:21-38`). Tests: `T/domain/CardServiceTest.java:23-55`,
`T/adapter/web/CardHandlerTest.java:20-35`.

### Redemption history

`CardHandler.redemptions` to `RedemptionHistory.redemptions`
(`M/domain/RedemptionHistory.java:15-19`), which keeps `REDEEM` entries only. The history
has no notion of a reversal. Tests: `T/domain/RedemptionHistoryTest.java:23-36`.

### Reporting

`ReportHandler.handle` and `ReportingJob.run` both call `ReportingService.daily`
(`M/reporting/ReportingService.java:24-39`), which switches over every `EntryKind`.

## 7. Error, status and code mappings

| Exception | HTTP status | Code | Locator |
|---|---|---|---|
| `UnknownCardException` | 404 | `UNKNOWN_CARD` | `M/adapter/web/ErrorMapper.java:31` |
| `DomainRuleException` and subclasses | 422 | the exception's `code()` | `M/adapter/web/ErrorMapper.java:32` |
| `IllegalArgumentException` | 400 | `INVALID_REQUEST` | `M/adapter/web/ErrorMapper.java:33` |
| `ConcurrentModificationException` | 409 | `CONFLICT` | `M/adapter/web/ErrorMapper.java:34` |
| anything else | 500 | `INTERNAL` | `M/adapter/web/ErrorMapper.java:35-38` |

## 8. Data and storage

H2 tables `cards` and `ledger_entries`, created by versioned SQL files under
`src/main/resources/db/migration/` and recorded in `schema_version`. The rules for
changing them are in a separate file owned by the migrations review. Every card change
and its ledger entry are written in one transaction
(`M/adapter/jdbc/JdbcGiftCardRepository.java:106-120` `inTransaction`), with an
optimistic `version` check (`M/adapter/jdbc/JdbcGiftCardRepository.java:63-72`).

## 9. External integrations

| Direction | System | Client symbol | Protocol | Config keys | Failure handling | Evidence |
|---|---|---|---|---|---|---|
| Outbound | Store system webhook | `StoreWebhookNotifier` | HTTP POST JSON | `GIFTCARD_WEBHOOK_URL` | 2 s timeout, logged, no retry | `M/adapter/web/StoreWebhookNotifier.java:44-57` |
| Inbound | Store tills | `CardHandler` | HTTP JSON | port 8080 | error mapping, section 7 | `M/app/GiftCardApplication.java:102-106` |
| In-process | Partner apps | `GiftCards` | Java calls | none | exceptions propagate | `M/api/GiftCards.java:12-43` |

## 10. Upstream and cross-repo dependencies

- Partner teams depend on `com.example:gift-card-service` and call `api` only. The rules
  for changing `api` are in a separate file owned by the API compatibility review.
- The nightly scheduler that runs `ReportingJob` lives outside this repository.

## 11. Configuration, environments and deployment

`GIFTCARD_WEBHOOK_URL` (optional; no webhook when unset) and the H2 file path
`./data/giftcards` (`M/app/GiftCardApplication.java:102-106`). Tests run on an in-memory
database per test with a fixed clock.

## 12. Concurrency, async and non-determinism

| Source | Where | Effect |
|---|---|---|
| Clock | injected `java.time.Clock` | `M/app/GiftCardApplication.java:38` |
| Random card numbers | `SecureRandom` in production, seeded `Random` in tests | `M/app/GiftCardApplication.java:59` |
| HTTP threads | fixed pool of 4 | `M/app/GiftCardApplication.java:73` |
| Concurrent card writes | optimistic version, 409 on conflict | `M/adapter/jdbc/JdbcGiftCardRepository.java:63-72` |
| Webhook | async, unordered | `M/adapter/web/StoreWebhookNotifier.java:52-57` |

## 13. Generated code and ownership boundaries

None generated. Search: `generated`, `annotationProcessor`, `<plugin>` in `pom.xml`: none.

## 14. Maintained documentation

`AGENTS.md` (builder instructions), `REVIEW-CONTRACT.md`, `tickets/`.

## 15. Open questions

- How the store network authenticates callers is not in this repository.

## 16. Related

[CODE_STRUCTURE.md](CODE_STRUCTURE.md).
