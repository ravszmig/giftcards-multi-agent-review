# GC-207 · Partial refund to a gift card

| Field | Value |
| --- | --- |
| Reporter | Priya Shah, Product Owner, Stores |
| Date | 2026-11-09 |
| Priority | High |
| Labels | stores, refunds |

## Story

As a store assistant, I want to refund part of a gift card redemption back onto the same
card, so that a customer who returns one item from a basket gets the money back on the card
they paid with.

## Background

Today a store that takes back an item paid for by gift card issues a new card for the
value. Customers end up holding several cards with small balances. Stores asked for refunds
onto the original card in the September retro.

## Acceptance criteria

1. `POST /cards/{number}/refunds` with `{"redemptionId": <id>, "amount": "<decimal>", "storeId": "<store>"}` puts the amount back on the card and returns `201` with `{"refundId": <id>, "balance": "<decimal>"}`.
2. A refund is stored as a ledger entry of kind `REFUND`, with `related_entry_id` set to the redemption it refunds. The `ledger_entries` table already has that column, so no schema change is needed.
3. Several partial refunds against the same redemption are allowed.
4. Goodwill: a store may refund up to £50.00 more than the original redemption, so that a customer who had a bad experience leaves happy. The total refunded against one redemption is capped at the redemption amount plus £50.00.
5. Audit: Finance matches refunds against the till roll. Every refund writes one log line with the full card number, the amount, the store and the redemption id.
6. The store system must hear about every refund straight away, whichever entry point made it. Call `StoreWebhookNotifier` directly from the refund logic in the domain (a new `RefundService`). Add a `refund` event to `StoreWebhookNotifier` next to `redemption`.
7. A refund for an unknown card returns `404`. A `redemptionId` that is not a redemption on this card returns `422` with error `UNKNOWN_REDEMPTION`.
8. Internal only. Store staff use the HTTP route. Do not add refunds to the partner API (`GiftCards`) in this ticket; partners get it in a later release.
9. A refund that would take the card above £500.00 is refused with `422` and error `BALANCE_LIMIT`, as a top-up is.

## Out of scope

- Refunds onto a different card, or to cash.
- A refund total in the daily report (GC-215).

## Definition of done

- Tests for the new route and the new service.
- `mvn -o -q test` passes.
