# Business decisions

Read by: the Tester reviewer. Each decision has an ID, a date, an owner and the code that
implements it, where code exists. Path shorthand: `M/` = `src/main/java/com/example/giftcard/`.

## How a decision changes

1. The owner of a decision changes it by adding a new entry here that names the entry it
   supersedes. The old entry stays, marked superseded.
2. A ticket does not change a decision by itself. Code in the diff that breaks an entry
   here is a finding, whatever the ticket asked. Code that holds to an entry is not.
3. Severity of a diff that breaks a decision: what the decision protects, per entry below.
4. **Disputed.** When the code breaks an entry because it follows a ticket written by the
   decision's current owner after the decision's date, and no entry here supersedes it,
   the evidence supports both readings. Report the finding at the severity the decision gives, begin
   OBSERVED with `DISPUTED:`, and quote both sources with their dates and owners: the
   ticket line and the entry here. ACTION is "a human decides which rule holds", with the
   two outcomes. Do not pick one.
5. When the ticket's author does not own the decision, the decision holds. The finding is
   not disputed.
6. A decision recorded in `review/DECISIONS.md` settles the dispute for this change. Code
   that matches it gets no finding, and the dispute is not raised again.

## Decisions

| ID | Date | Owner | Decision | Protects | Severity if broken | Code |
|---|---|---|---|---|---|---|
| BD-001 | 2024-02-12 | Finance | Cards hold GBP only, in whole pence. | Ledger totals | HIGH | `M/domain/Money.java:9` |
| BD-002 | 2024-02-12 | Finance | Balances are never negative. | Customer balances | HIGH | `M/domain/Money.java:13-17` |
| BD-003 | 2024-02-12 | Finance | A card holds at most £500.00 at any time, including after a top-up or any credit. | E-money threshold | HIGH | `M/domain/GiftCard.java:11-12`, `M/domain/GiftCard.java:22-31` |
| BD-004 | 2024-05-20 | Stores PO | A redemption takes at most the balance. Redeeming the exact balance leaves zero. No partial authorisation. | Customer and store | HIGH | `M/domain/GiftCard.java:14-20` |
| BD-005 | 2024-05-20 | Finance | The ledger is append-only. A correction is a new entry that points at the entry it corrects (`related_entry_id`). | Audit trail | HIGH | `M/domain/LedgerEntry.java:5-9` |
| BD-006 | 2024-09-02 | Finance | Daily totals use UK time day boundaries. | Finance reports | MEDIUM | `M/app/GiftCardApplication.java:31-32` |
| BD-007 | 2025-06-18 | Finance | A refund puts money back onto the card it was redeemed from. The refunds against one redemption never add up to more than that redemption's amount. Goodwill is never a refund: Customer Services issues goodwill as a new card, which Finance books as a marketing cost. | Money is not created from nothing; goodwill is booked to the right account | HIGH | none yet |
| BD-008 | 2025-06-18 | Finance | A refund needs the id of the redemption it reverses. A refund with no redemption is refused. | Audit trail | HIGH | none yet |
| BD-011 | 2025-03-04 | Finance and Legal | Expiry grace period: a card past its expiry date stays redeemable up to and including the 14th day after that date. The same for every card. | Liability release dates in the accounts | HIGH | none yet |
| BD-014 | 2025-11-03 | Stores PO | Store ids are opaque text from the till. The service does not validate them. | Till compatibility | LOW | `M/adapter/web/CardHandler.java:100` |
| BD-018 | 2026-10-01 | Finance | From 2026-10-01 the Stores Product Owner owns redemption-window rules: expiry and grace periods. Refund and money rules stay with Finance. The owner records each change in this file. | Ownership | none | none |

Coverage: 11 entries. BD-009, BD-010, BD-012, BD-013, BD-015 to BD-017 are retired and not
listed.

## Reading the entries for a diff

- BD-003 applies to every credit, so a refund or a top-up that takes a card above £500.00
  breaks it.
- BD-005 means a refund is a new `REFUND` ledger entry with `related_entry_id` set to the
  redemption. Changing or deleting the redemption entry breaks it.
- BD-007: "never add up to more" counts every earlier refund against the same redemption,
  not only the one in the request.
- BD-011 is dated before expiry existed in code. It is the rule an expiry feature must
  implement unless a later entry here supersedes it.

## Open questions

- None recorded.
