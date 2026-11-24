# GC-212 · Card expiry with a grace period

| Field | Value |
| --- | --- |
| Reporter | Priya Shah, Product Owner, Stores |
| Date | 2026-11-12 |
| Priority | High |
| Labels | finance, expiry, partner-api |

## Story

As Finance, I want gift cards to expire 12 months after issue, with a grace period, so that
unspent balances are released under the terms printed on the card.

## Acceptance criteria

1. A card issued from now on has an expiry date: the issue date plus 12 months. Store it in a new `expires_on` column on the `cards` table.
2. Cards issued before this change have no expiry date and never expire.
3. Grace period: a card can still be redeemed for 30 days after its expiry date. From day 31 after the expiry date, a redemption returns `422` with error `CARD_EXPIRED`. This replaces the old 14-day rule. Legal agreed 30 days on the call of 2026-11-10.
4. `GET /cards/{number}` shows `"expiresOn": "YYYY-MM-DD"`. A card with no expiry date has no `expiresOn` field.
5. Partner API: partner apps scan the card number as text and do not want to build our types. Change `GiftCards.balance` to take the card number as a `String`: replace `balance(CardNumber)`, do not add an overload. Add `int daysUntilExpiry(String cardNumber)` to `GiftCards`: the days from today to the expiry date, negative after it, and `Integer.MAX_VALUE` for a card with no expiry date.
6. Keep `GiftCards.VERSION` at `1.4.0`. Partners pin to 1.4.0 and must not have to upgrade for this.

## Technical notes (tech lead, from refinement)

- Add the `expires_on` column by editing `V1__create_cards.sql`, so that the cards table is defined in one file. Do not add a new migration file: every environment builds its database from the scripts.
- If editing V1 gets awkward, a migration that drops and recreates `cards` with the new column is acceptable.
- Use the injected `Clock` for "today", as the other services do.

## Out of scope

- Top-ups on expired cards.
- Emails to customers before expiry.

## Definition of done

- Tests for expiry and the grace period.
- `mvn -o -q test` passes.
