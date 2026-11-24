package com.example.giftcard.adapter.jdbc;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.EntryKind;
import com.example.giftcard.domain.GiftCard;
import com.example.giftcard.domain.LedgerEntry;
import com.example.giftcard.domain.Money;
import com.example.giftcard.support.TestDatabase;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class JdbcLedgerRepositoryTest {

  private static final CardNumber NUMBER = CardNumber.of("6011000990134821");
  private static final Instant T0 = Instant.parse("2026-11-02T09:00:00Z");

  private final DataSource db = TestDatabase.migrated();
  private final JdbcGiftCardRepository cards = new JdbcGiftCardRepository(db);
  private final JdbcLedgerRepository ledger = new JdbcLedgerRepository(db);

  private LedgerEntry seed() {
    final GiftCard card = new GiftCard(NUMBER, Money.parse("10.00"), LocalDate.of(2026, 11, 2), 0);
    final LedgerEntry issue = cards.create(card, LedgerEntry.unsaved(NUMBER, EntryKind.ISSUE,
        card.balance(), null, T0));
    cards.apply(card.redeem(Money.parse("4.00")), LedgerEntry.unsaved(NUMBER, EntryKind.REDEEM,
        Money.parse("4.00"), "S-9", T0.plusSeconds(3_600)));
    return issue;
  }

  @Test
  void readsBackEveryFieldOldestFirst() {
    final LedgerEntry issue = seed();
    final List<LedgerEntry> entries = ledger.forCard(NUMBER);
    assertEquals(List.of(EntryKind.ISSUE, EntryKind.REDEEM),
        entries.stream().map(LedgerEntry::kind).toList());
    assertEquals(issue, entries.get(0));
    assertEquals("S-9", entries.get(1).storeId());
    assertEquals(null, entries.get(1).relatedEntryId());
  }

  @Test
  void betweenIncludesTheStartAndExcludesTheEnd() {
    seed();
    assertEquals(1, ledger.between(T0, T0.plusSeconds(3_600)).size());
  }
}
