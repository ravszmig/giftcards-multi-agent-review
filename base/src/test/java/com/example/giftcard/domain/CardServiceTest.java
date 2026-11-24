package com.example.giftcard.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.giftcard.adapter.jdbc.JdbcGiftCardRepository;
import com.example.giftcard.adapter.jdbc.JdbcLedgerRepository;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import java.time.LocalDate;
import java.util.List;
import java.util.Random;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class CardServiceTest {

  private final DataSource db = TestDatabase.migrated();
  private final CardService cards = new CardService(new JdbcGiftCardRepository(db),
      new Random(7), Clocks.fixed());

  @Test
  void issuingStoresTheCardAndAnIssueEntry() {
    final GiftCard card = cards.issue(Money.parse("25.00"));
    assertEquals(Money.parse("25.00"), cards.balance(card.number()).balance());
    assertEquals(LocalDate.of(2026, 11, 2), card.issuedOn());
    final List<LedgerEntry> entries = new JdbcLedgerRepository(db).forCard(card.number());
    assertEquals(List.of(EntryKind.ISSUE), entries.stream().map(LedgerEntry::kind).toList());
  }

  @Test
  void issuingAboveTheCapFails() {
    final DomainRuleException e = assertThrows(DomainRuleException.class,
        () -> cards.issue(Money.parse("500.01")));
    assertEquals("BALANCE_LIMIT", e.code());
  }

  @Test
  void topUpAddsToTheBalance() {
    final GiftCard card = cards.issue(Money.parse("10.00"));
    assertEquals(Money.parse("15.50"), cards.topUp(card.number(), Money.parse("5.50")).balance());
  }

  @Test
  void topUpAboveTheCapFailsAndLeavesTheBalance() {
    final GiftCard card = cards.issue(Money.parse("495.00"));
    assertThrows(DomainRuleException.class, () -> cards.topUp(card.number(), Money.parse("6.00")));
    assertEquals(Money.parse("495.00"), cards.balance(card.number()).balance());
  }

  @Test
  void anUnknownCardHasNoBalance() {
    assertThrows(UnknownCardException.class,
        () -> cards.balance(CardNumber.of("6000000000000000")));
  }
}
