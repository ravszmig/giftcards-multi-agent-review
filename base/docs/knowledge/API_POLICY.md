# API policy

Evidence: `gift-card-service`, branch `main`, the commit tagged `base`.
Static inspection of that commit only.
Path shorthand: `M/` = `src/main/java/com/example/giftcard/`, `T/` = `src/test/java/com/example/giftcard/`.

Read by: the API compatibility reviewer. Rules carry an ID (`P-n`).

## 1. What is published

Everything public in `M/api/`: today `GiftCards` (`M/api/GiftCards.java:12-43`) and
`CardView` (`M/api/CardView.java:8-13`), and the domain types their signatures name
(`Money`, `CardNumber`). Partner teams depend on `com.example:gift-card-service` and
compile against these signatures.

| Signature at 1.4.0 | Evidence |
|---|---|
| `GiftCards(CardService, RedemptionService)` | `M/api/GiftCards.java:20` |
| `CardNumber issue(Money)` | `M/api/GiftCards.java:26` |
| `CardView balance(CardNumber)` | `M/api/GiftCards.java:30` |
| `CardView redeem(CardNumber, Money, String)` | `M/api/GiftCards.java:34` |
| `CardView topUp(CardNumber, Money)` | `M/api/GiftCards.java:39` |
| `record CardView(String maskedNumber, Money balance, LocalDate issuedOn)` | `M/api/CardView.java:8` |
| `static final String VERSION = "1.4.0"` | `M/api/GiftCards.java:15` |

## 2. Known consumers

| Consumer | Pins | How it links |
|---|---|---|
| Kiosk app team | `1.4.0` | compiled against the jar, upgraded by version range `[1.4,2)` |
| Loyalty team | `1.4.0` | the same |

A consumer on `[1.4,2)` picks up any 1.x release with no code change. A changed 1.x
signature reaches it at runtime as `NoSuchMethodError`.

## 3. Rules

- **P-1 One version.** `GiftCards.VERSION` equals `<version>` in `pom.xml`. Guarded by
  `T/api/GiftCardsTest.java:43-48` `theVersionConstantMatchesThePom`.
- **P-2 No breaking change inside 1.x.** Every public type, constructor, method and record
  component in `api` keeps its exact name, parameter types and return type in every 1.x
  release. Changing a parameter type, removing a method or changing a record's components
  is a breaking change. A breaking change in a 1.x release is **HIGH**: every consumer in
  section 2 fails at runtime on its next build. The fix in 1.x restores the published
  signature exactly, for example `balance(CardNumber)`. A new overload beside it is not
  part of that fix: it is a new public method under P-3, with its own review.
- **P-3 Additions are a minor release.** A new public method, constructor or type in `api`
  moves `VERSION` and `pom.xml` to the next minor, 1.5.0 from 1.4.0. An `api` change with
  `VERSION` unchanged is **HIGH**: consumers cannot tell which API a 1.4.0 jar has, and two
  different jars carry the same coordinates.
- **P-4 Deprecate before removing.** A signature to be removed is marked
  `@Deprecated(since = "1.n")` for at least one minor release before the 2.0.0 that
  removes it. Removing without that is **MEDIUM** on top of P-2. Its ACTION is to keep the
  signature. A signature that stays, or that a fix restores, is never deprecated by that fix.
- **P-5 A ticket cannot waive P-2 or P-3.** "Partners must not upgrade" is met by keeping
  every 1.4.0 signature, not by keeping the version number.

## 4. Checking a diff

1. List every changed line under `M/api/`.
2. For each removed or changed public signature, apply P-2.
3. For each added public member, apply P-3.
4. Compare `VERSION` and `pom.xml` before and after.

## 5. Open questions

None.
