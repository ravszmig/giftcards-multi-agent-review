# Test patterns

Evidence: `gift-card-service`, the first commit on `main`.
Static inspection of that commit only.
No command below was executed during ingest. A passing baseline is unverified.
Path shorthand: `M/` = `src/main/java/com/example/giftcard/`, `T/` = `src/test/java/com/example/giftcard/`.

Read by: the Tester reviewer, with [BUSINESS_DECISIONS.md](BUSINESS_DECISIONS.md). Rules a
reviewer applies carry an ID (`T-n`).

## 1. Toolchain and prerequisites

- Java 21 (`pom.xml:13`), Maven 3.9, offline: every dependency is in the local Maven
  repository. JUnit 5.12.2 (`pom.xml:23-28`), H2 2.3.232 (`pom.xml:18-22`).
- No container, no network. Tests bind HTTP servers to `127.0.0.1` on a free port.

## 2. How this repository is checked

Working directory: repository root

| Check | Command | Needs | Source |
|---|---|---|---|
| Focused tests: one class | `mvn -o -q test -Dtest=CardHandlerTest` | Java 21, Maven | surefire 3.5.4, `pom.xml:38-48` |
| Focused tests: one method | `mvn -o -q test -Dtest=CardHandlerTest#redeemingMoreThanTheBalanceIs422` | as above | as above |
| Full local suite | `mvn -o -q test` | as above | `AGENTS.md` |
| Types | compile is part of `test` | as above | `pom.xml:34-37` |
| Lint | not applicable: no lint plugin in `pom.xml` | none | `pom.xml:31-50` |
| CI | `mvn -o -q test` before every change is handed over | as above | `AGENTS.md` |

The builder runs the suite before it hands a change over. A reviewer does not rerun it.

## 3. Test inventory

| Package | Layer | Test files | Test methods | Harness | Evidence |
|---|---|---|---|---|---|
| `domain` | unit and service-with-H2 | 6 | 19 | `TestDatabase`, `Clocks` | `T/domain/` |
| `reporting` | service-with-H2 | 1 | 2 | `TestDatabase`, `Clocks` | `T/reporting/ReportingServiceTest.java:19` |
| `adapter.jdbc` | integration, H2 in memory | 3 | 7 | `TestDatabase` | `T/adapter/jdbc/` |
| `adapter.web` | HTTP, whole application on a free port | 5 | 12 | `HttpTestApp`, `TestHttp` | `T/adapter/web/` |
| `api` | in-process, whole application | 1 | 3 | `GiftCardApplication.start` | `T/api/GiftCardsTest.java:17` |
| `app` | job | 1 | 1 | `TestDatabase` | `T/app/ReportingJobTest.java:15` |

Coverage: 44 `@Test` methods in 17 test classes from `grep -c '@Test'`; no `@Disabled`.

## 4. Tests by feature

| Feature | Unit or service | HTTP | Notes |
|---|---|---|---|
| Issue | `T/domain/CardServiceTest.java:23-37` | `T/adapter/web/CardHandlerTest.java:20-26` | cap at £500.00 covered |
| Balance | `T/domain/CardServiceTest.java:52-55` | `T/adapter/web/CardHandlerTest.java:28-35` | masked number in response covered |
| Redeem | `T/domain/RedemptionServiceTest.java:21-50` | `T/adapter/web/CardHandlerTest.java:37-54` | exact balance and one penny above covered |
| Top-up | `T/domain/CardServiceTest.java:39-50` | none found | cap covered at service level |
| Redemption history | `T/domain/RedemptionHistoryTest.java:23-36` | `T/adapter/web/CardHandlerTest.java:63-69` | |
| Reporting | `T/reporting/ReportingServiceTest.java:28-45` | `T/adapter/web/ReportHandlerTest.java:11-19` | one test per kind total |
| Migrations | `T/adapter/jdbc/MigrationRunnerTest.java:23-60` | n/a | edited checksum covered |
| Store webhook | `T/adapter/web/StoreWebhookNotifierTest.java:26-50` | n/a | masked payload covered |
| Redemption log line | `T/adapter/web/RedemptionLoggingTest.java:17-40` | n/a | redemption route only |
| Partner API | `T/api/GiftCardsTest.java:29-49` | n/a | version constant against `pom.xml` covered |

## 5. Harnesses and fixtures

- `TestDatabase.migrated()` gives a fresh in-memory H2 database with every migration
  applied (`T/support/TestDatabase.java:14-24`).
- `Clocks.fixed()` is 2026-11-02 12:00 UTC (`T/support/Clocks.java:7-18`). Services take
  the clock in their constructor, so a test controls "today".
- `HttpTestApp` starts the whole application on a free port with a fresh database and the
  fixed clock (`T/adapter/web/HttpTestApp.java:10-33`). `TestHttp` sends JSON and parses
  flat replies (`T/support/TestHttp.java:13-50`).

## 6. Conventions

- Test class per production class, same package. Method names state the behaviour:
  `redeemingMoreThanTheBalanceFailsAndLeavesTheBalance`.
- Plain JUnit assertions. No mocking library: tests use H2 and real adapters.
- A failure case asserts both the exception or status and that the balance is unchanged
  (`T/domain/RedemptionServiceTest.java:37-43`).

## 7. Rules for reviewing tests in a diff

- **T-1** Every changed money rule has a test at the boundary: the limit, one penny below,
  one penny above. A missing boundary test for a rule in BUSINESS_DECISIONS is **MEDIUM**.
- **T-2** A rule that accumulates, such as refunds against one redemption, needs a test with
  more than one operation. A single-operation test does not prove the total.
- **T-3** A test that asserts behaviour a BUSINESS_DECISIONS entry forbids pins the wrong
  behaviour. Report it with the decision it contradicts, at that decision's severity. A
  passing CI run on such a test is not evidence the behaviour is right.
- **T-4** Time-dependent behaviour is tested with an injected clock moved across the
  boundary. `LocalDate.now()` with no clock in production code makes the rule untestable:
  **MEDIUM**.
- **T-5** A changed existing test is read as a changed expectation. Name what it asserted
  before and after.

## 8. Isolation and determinism

Each test gets its own database name (`T/support/TestDatabase.java:14-16`), so tests share
no state. HTTP tests close the server in `@AfterEach` or try-with-resources. Card numbers
come from a seeded `Random` in service tests and `SecureRandom` in HTTP tests; no test
asserts a specific number.

## 9. Coverage and quality gates

None. No coverage plugin in `pom.xml`.

## 10. Known gaps

- No HTTP test for top-up.

## 11. Open questions

None.
