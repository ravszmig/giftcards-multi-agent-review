# Security

Evidence: `gift-card-service`, the first commit on `main`.
Static inspection of that commit only.
Path shorthand: `M/` = `src/main/java/com/example/giftcard/`, `T/` = `src/test/java/com/example/giftcard/`.

Read by: the Security Auditor reviewer. Rules carry an ID (`S-n`). The Security Auditor
flags risks in a diff. Its report is not an AppSec approval.

## 1. What is sensitive

| Data | Why | Where it lives |
|---|---|---|
| Full card number | A bearer credential. Whoever has the 16 digits can spend the balance at any till or partner app. There is no PIN. | `cards.number`, `ledger_entries.card_number`, `CardNumber.value()` (`M/domain/CardNumber.java:6`) |
| Balance | Personal spending data | `cards.balance_pence` |
| Store id | Not sensitive | `ledger_entries.store_id` |
| Redemption id, refund id, ledger entry id | Not sensitive: a row number the caller already holds | `ledger_entries.id` |

## 2. Rules

- **S-1 One place returns the full number.** `POST /cards` returns it once, to the buyer
  (`M/adapter/web/CardHandler.java:83`). Every other response carries the masked form
  (`M/adapter/web/CardHandler.java:91`).
- **S-2 No full card number in a log line, an exception message, an error body, a webhook
  payload or a metric.** Use `CardNumber.masked()` or the masked `toString()`
  (`M/domain/CardNumber.java:20-28`). A full number in any of these is **HIGH**: logs ship
  to the shared log platform, where every support engineer can read them for 90 days, so
  anyone with log access can spend the balance.
  - Audit and reconciliation needs are met by the ledger entry id and the last four
    digits. Finance's till-roll match uses both.
  - An exception to S-2 needs a Security sign-off recorded in section 5 of this file. A
    ticket cannot grant one. None exists.
  - S-2 covers the full card number and secrets only. Echoing a caller's own non-secret
    identifier back to that caller, such as a redemption id or store id in an error body or
    a log line, is not an S-2 finding, whatever digits the caller could type into it. At
    most it is S-5, **MEDIUM**, and only where the value skipped validation at the edge.
- **S-3 Database access uses `PreparedStatement` with parameters.** String-built SQL with
  request data is **CRITICAL**. Exemplar: `M/adapter/jdbc/JdbcGiftCardRepository.java:29-35`.
- **S-4 Configuration is read from the environment by name.** No URL, password or token is
  committed. Exemplar: `GIFTCARD_WEBHOOK_URL` (`M/app/GiftCardApplication.java:102-106`).
- **S-5 Request validation at the edge.** Amounts go through `Money.parse`, card numbers
  through `CardNumber.of`, before any domain call (`M/adapter/web/CardHandler.java:98-100`).
  A route that passes raw request text to the domain is **MEDIUM**. Raw request text
  written to a log line, such as an unvalidated store id, is the same risk at the same
  severity: **MEDIUM**, never more.
- **S-6 Error responses carry no stack trace.** Unmapped exceptions answer `INTERNAL` with
  a fixed message (`M/adapter/web/ErrorMapper.java:35-38`).

## 3. Existing guards

| Guard | What it enforces | What it does not cover | Evidence |
|---|---|---|---|
| `RedemptionLoggingTest` | the redemption log line is masked | every other log line | `T/adapter/web/RedemptionLoggingTest.java:17-40` |
| `StoreWebhookNotifierTest` | the webhook payload is masked | events other than `REDEMPTION` | `T/adapter/web/StoreWebhookNotifierTest.java:26-46` |
| `CardHandlerTest.balanceShowsTheMaskedNumber` | `GET /cards/{number}` masks | other responses | `T/adapter/web/CardHandlerTest.java:28-35` |

## 4. Accepted risks

| ID | Risk | Why accepted | Do not flag unless |
|---|---|---|---|
| SEC-RA-2025-02 | Card numbers travel in the URL path. The JDK HTTP server logs request lines at `FINE`. | Production logs at `INFO`; the store network is private. | a diff lowers a log level to `FINE` or below, or logs the request path itself |
| SEC-RA-2025-03 | No authentication in this service. | The store network authenticates tills. | a diff adds a route reachable from outside that network |

## 5. Signed-off exceptions

None.

## 6. Open questions

None.
