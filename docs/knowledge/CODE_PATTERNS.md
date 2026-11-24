# Code patterns

Evidence: `gift-card-service`, branch `main`, the commit tagged `base`.
Static inspection of that commit only.
Path shorthand: `M/` = `src/main/java/com/example/giftcard/`.

Read by: the Primitive obsession reviewer, once a team adds that role. Rules carry an ID
(`CP-n`).

## 1. Layout and formatting

Two-space indent, 100-character lines, `final` locals, one top-level type per file. No
formatter plugin in `pom.xml`; the style is held by review.

## 2. Wiring

Constructor injection by hand; every service takes its collaborators and a `Clock`
(`M/domain/CardService.java:14-18`, `M/domain/RedemptionService.java:11-14`).

## 3. Entrypoint handler shape

A handler method parses the request into value types, calls one service, and writes a
`Map` as JSON (`M/adapter/web/CardHandler.java:97-109`).

## 4. Value types

Every quantity with a meaning has a type. Two exist and are used in every signature
above the HTTP parsing boundary.

| Meaning | Type | Instances | Exemplar |
|---|---|---|---|
| An amount of money | `Money` (pence, never negative) | every public signature that carries money | `M/domain/Money.java:9` |
| A card number | `CardNumber` (16 digits, masked `toString`) | every public signature that carries a card number | `M/domain/CardNumber.java:6` |
| A date | `java.time.LocalDate` | `GiftCard.issuedOn`, `ReportingService.daily` | `M/domain/GiftCard.java:9` |
| A length of time | `java.time.Period` or `java.time.Duration` | `StoreWebhookNotifier.TIMEOUT` | `M/adapter/web/StoreWebhookNotifier.java:22` |

Raw text and numbers appear in exactly two places: the JSON maps a handler reads and
writes (`M/adapter/web/CardHandler.java:98-100`), and the JDBC column values
(`M/adapter/jdbc/JdbcGiftCardRepository.java:36-37`). Both convert at once.

### Rules

- **CP-1 Money is `Money`.** No public method, constructor, field or record component
  takes or returns money as `long`, `int`, `double`, `BigDecimal` or `String`. Names that
  mark money: `amount`, `pence`, `balance`, `price`, `total`.
- **CP-2 A card number is `CardNumber`.** No public signature takes or returns a card
  number as `String` or `long`. Names that mark one: `card`, `cardNumber`, `number`.
- **CP-3 A length of time is `Period`, `Duration` or a pair of `LocalDate`s.** No public
  signature takes or returns a number of days, months or seconds as a bare `int` or
  `long`. Names that mark one: `days`, `graceDays`, `months`, `ttl`.
- **CP-4 Severity.** A raw primitive under CP-1 to CP-3 in a public signature in `M/api/`
  is **HIGH**: the signature is published, so replacing the primitive later is a breaking
  change for every partner. In any other public signature it is **MEDIUM**. In a private
  method or a local variable it is not a finding.
- **CP-5 Constants follow the same rule.** A `public static final int GRACE_DAYS` is CP-3;
  `Period.ofDays(14)` is not.

## 5. Persistence access

Repositories take and return domain types; JDBC values convert inside the repository
(`M/adapter/jdbc/JdbcGiftCardRepository.java:29-44`).

## 6. Outbound calls

`StoreWebhookNotifier` builds a JSON map from a `LedgerEntry`
(`M/adapter/web/StoreWebhookNotifier.java:33-41`).

## 7. Async composition

`CompletableFuture` from `HttpClient.sendAsync`, not joined in production code
(`M/adapter/web/StoreWebhookNotifier.java:52-57`).

## 8. Errors and logging

- `DomainRuleException(code, message)` for a broken rule; the code is an upper-case
  constant such as `BALANCE_LIMIT` (`M/domain/GiftCard.java:26-28`).
- One `private static final Logger LOG` per class, lambda suppliers
  (`M/adapter/web/CardHandler.java:35`, `M/adapter/web/CardHandler.java:102-103`).

## 9. Data shapes and naming

Records for values and views (`Money`, `CardNumber`, `GiftCard`, `LedgerEntry`,
`CardView`). Services are `*Service`; handlers `*Handler`; repositories `*Repository`.

## 10. Change map

### Add a field to a value

Exemplar: `LedgerEntry.storeId`, added with V3.

| Order | File | Symbol | Locator | What the exemplar has there |
|---|---|---|---|---|
| 1 | record | `LedgerEntry` | `M/domain/LedgerEntry.java:10-17` | the component |
| 2 | repository | `JdbcGiftCardRepository.append` | `M/adapter/jdbc/JdbcGiftCardRepository.java:78-100` | the insert |
| 3 | repository | `JdbcLedgerRepository.query` | `M/adapter/jdbc/JdbcLedgerRepository.java:48-68` | the read |
| 4 | handler | `CardHandler.redeem` | `M/adapter/web/CardHandler.java:100` | the request field |

## 11. Inconsistencies

`GiftCards.redeem` takes the store id as `String`. Store ids are opaque till text; CP-1 to
CP-3 do not cover them.

## 12. Open questions

None.
