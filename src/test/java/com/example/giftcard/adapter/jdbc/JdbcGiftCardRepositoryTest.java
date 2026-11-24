package com.example.giftcard.adapter.jdbc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.EntryKind;
import com.example.giftcard.domain.GiftCard;
import com.example.giftcard.domain.LedgerEntry;
import com.example.giftcard.domain.Money;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import java.time.LocalDate;
import java.util.ConcurrentModificationException;
import org.junit.jupiter.api.Test;

class JdbcGiftCardRepositoryTest {

  private static final CardNumber NUMBER = CardNumber.of("6011000990134821");

  private final JdbcGiftCardRepository repository =
      new JdbcGiftCardRepository(TestDatabase.migrated());

  private void create() {
    final GiftCard card = new GiftCard(NUMBER, Money.parse("10.00"), LocalDate.of(2026, 11, 2), 0);
    repository.create(card, LedgerEntry.unsaved(NUMBER, EntryKind.ISSUE, card.balance(), null,
        Clocks.NOON_2026_11_02));
  }

  @Test
  void eachChangeIncrementsTheStoredVersion() {
    create();
    final GiftCard read = repository.find(NUMBER).orElseThrow();
    repository.apply(read.redeem(Money.parse("1.00")), LedgerEntry.unsaved(NUMBER,
        EntryKind.REDEEM, Money.parse("1.00"), "S", Clocks.NOON_2026_11_02));
    assertEquals(1, repository.find(NUMBER).orElseThrow().version());
  }

  @Test
  void aStaleWriteIsRejectedAndChangesNothing() {
    create();
    final GiftCard stale = repository.find(NUMBER).orElseThrow();
    repository.apply(stale.redeem(Money.parse("1.00")), LedgerEntry.unsaved(NUMBER,
        EntryKind.REDEEM, Money.parse("1.00"), "S", Clocks.NOON_2026_11_02));
    assertThrows(ConcurrentModificationException.class, () -> repository.apply(
        stale.redeem(Money.parse("2.00")), LedgerEntry.unsaved(NUMBER, EntryKind.REDEEM,
            Money.parse("2.00"), "S", Clocks.NOON_2026_11_02)));
    assertEquals(Money.parse("9.00"), repository.find(NUMBER).orElseThrow().balance());
  }
}
