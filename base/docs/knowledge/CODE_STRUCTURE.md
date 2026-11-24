# Code structure

Evidence: `gift-card-service`, branch `main`, the commit tagged `base`.
Static inspection of that commit only.
Path shorthand: `M/` = `src/main/java/com/example/giftcard/`.

Read by: the Architect reviewer, with [ARCHITECTURE.md](ARCHITECTURE.md). This file is the
class inventory and the import rules per package. Rules carry an ID (`CS-n`).

## 1. Allowed imports per package

| Package | May import | Must not import |
|---|---|---|
| `domain` | JDK | `reporting`, `adapter.*`, `api`, `app` |
| `reporting` | `domain`, JDK | `adapter.*`, `api`, `app` |
| `adapter.jdbc` | `domain`, JDK, `javax.sql` | `adapter.web`, `api`, `app` |
| `adapter.web` | `domain`, `reporting`, JDK, `com.sun.net.httpserver` | `adapter.jdbc`, `api`, `app` |
| `api` | `domain`, JDK | `reporting`, `adapter.*`, `app` |
| `app` | every package, `org.h2` | none |

- **CS-1** An import outside the "may import" column breaks ARCHITECTURE A-1 when it is in
  `domain` or `reporting`, and is **MEDIUM** elsewhere.
- **CS-2** The two adapters do not know each other. `adapter.web` reaches the database only
  through a domain service.
- **CS-3** No executable guard enforces this table. A layering test does not exist in
  `src/test`, so CI passes a violating diff.

Coverage: imports read from all 26 files under `M/`; every file conforms at `base`.

## 2. Class inventory

| Package | Class | Kind | Role | Evidence |
|---|---|---|---|---|
| `domain` | `Money` | record | pence, never negative | `M/domain/Money.java:9` |
| `domain` | `CardNumber` | record | 16 digits, masked `toString` | `M/domain/CardNumber.java:6` |
| `domain` | `GiftCard` | record | balance rules | `M/domain/GiftCard.java:9` |
| `domain` | `LedgerEntry` | record | one money movement | `M/domain/LedgerEntry.java:10` |
| `domain` | `EntryKind` | enum | `ISSUE`, `REDEEM`, `TOP_UP` | `M/domain/EntryKind.java:4` |
| `domain` | `GiftCardRepository` | interface | card writes with their entry | `M/domain/GiftCardRepository.java:9` |
| `domain` | `LedgerRepository` | interface | ledger reads | `M/domain/LedgerRepository.java:8` |
| `domain` | `CardService` | service | issue, top-up, balance | `M/domain/CardService.java:8` |
| `domain` | `RedemptionService` | service | redeem | `M/domain/RedemptionService.java:6` |
| `domain` | `RedemptionHistory` | service | read redemptions | `M/domain/RedemptionHistory.java:6` |
| `domain` | `DomainRuleException` | exception | rule broken, 422 | `M/domain/DomainRuleException.java:7` |
| `domain` | `InsufficientBalanceException` | exception | redeem above balance | `M/domain/InsufficientBalanceException.java:4` |
| `domain` | `UnknownCardException` | exception | 404 | `M/domain/UnknownCardException.java:4` |
| `reporting` | `ReportingService` | service | daily totals | `M/reporting/ReportingService.java:10` |
| `adapter.jdbc` | `JdbcGiftCardRepository` | adapter | `cards` plus entry, one transaction | `M/adapter/jdbc/JdbcGiftCardRepository.java:20` |
| `adapter.jdbc` | `JdbcLedgerRepository` | adapter | `ledger_entries` reads | `M/adapter/jdbc/JdbcLedgerRepository.java:20` |
| `adapter.jdbc` | `MigrationRunner` | infrastructure | versioned SQL | `M/adapter/jdbc/MigrationRunner.java:36` |
| `adapter.web` | `CardHandler` | handler | `/cards` routes | `M/adapter/web/CardHandler.java:33` |
| `adapter.web` | `ReportHandler` | handler | `/reports/daily` | `M/adapter/web/ReportHandler.java:16` |
| `adapter.web` | `Json` | utility | flat JSON | `M/adapter/web/Json.java:11` |
| `adapter.web` | `ErrorMapper` | utility | exception to status | `M/adapter/web/ErrorMapper.java:12` |
| `adapter.web` | `StoreWebhookNotifier` | outbound adapter | store webhook | `M/adapter/web/StoreWebhookNotifier.java:19` |
| `api` | `GiftCards` | facade | published API | `M/api/GiftCards.java:12` |
| `api` | `CardView` | record | what partners see | `M/api/CardView.java:8` |
| `app` | `GiftCardApplication` | composition root | HTTP process | `M/app/GiftCardApplication.java:29` |
| `app` | `ReportingJob` | composition root | nightly job | `M/app/ReportingJob.java:12` |

Coverage: `find src/main/java -name '*.java' | wc -l` gives 26; all listed.

## 3. Where a new class goes

| A new... | Goes in | Exemplar |
|---|---|---|
| business operation | `domain`, a `*Service` taking repositories and a `Clock` | `RedemptionService` |
| route | a branch in the handler for that path prefix | `CardHandler.handle`, `M/adapter/web/CardHandler.java:51-76` |
| outbound event | a method on the outbound adapter, called by the handler | `StoreWebhookNotifier.redemption` |
| something the domain must trigger outside itself | an interface in `domain`, implemented in an adapter, wired in `app` | none exists yet |
| table access | a method on a `domain` repository interface, implemented in `adapter.jdbc` | `LedgerRepository.forCard` |
| wiring | `GiftCardApplication.start` and, for jobs, `ReportingJob.run` | `M/app/GiftCardApplication.java:53-78` |

## 4. Duplication to check for

- **CS-4** `CardService.balance` and `RedemptionService.card` both load a card or throw
  `UnknownCardException` (`M/domain/CardService.java:36-38`,
  `M/domain/RedemptionService.java:30-32`). A third copy in a new service is **LOW**.
- `ReportHandler` and `ReportingJob` both format `DailyTotals`; they do not share code.

## 5. Open questions

None.
