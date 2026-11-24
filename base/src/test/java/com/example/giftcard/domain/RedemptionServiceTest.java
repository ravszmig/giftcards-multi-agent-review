package com.example.giftcard.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.giftcard.adapter.jdbc.JdbcGiftCardRepository;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import java.util.Random;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class RedemptionServiceTest {

  private final DataSource db = TestDatabase.migrated();
  private final JdbcGiftCardRepository repository = new JdbcGiftCardRepository(db);
  private final CardService cards = new CardService(repository, new Random(7), Clocks.fixed());
  private final RedemptionService redemptions = new RedemptionService(repository, Clocks.fixed());

  @Test
  void redeemingTakesTheAmountOffAndRecordsAnEntry() {
    final CardNumber number = cards.issue(Money.parse("20.00")).number();
    final LedgerEntry entry = redemptions.redeem(number, Money.parse("7.50"), "S-001");
    assertEquals(EntryKind.REDEEM, entry.kind());
    assertEquals("S-001", entry.storeId());
    assertEquals(Money.parse("12.50"), redemptions.card(number).balance());
  }

  @Test
  void redeemingTheExactBalanceLeavesZero() {
    final CardNumber number = cards.issue(Money.parse("20.00")).number();
    redemptions.redeem(number, Money.parse("20.00"), "S-001");
    assertEquals(Money.ZERO, redemptions.card(number).balance());
  }

  @Test
  void redeemingMoreThanTheBalanceFailsAndLeavesTheBalance() {
    final CardNumber number = cards.issue(Money.parse("20.00")).number();
    assertThrows(InsufficientBalanceException.class,
        () -> redemptions.redeem(number, Money.parse("20.01"), "S-001"));
    assertEquals(Money.parse("20.00"), redemptions.card(number).balance());
  }

  @Test
  void redeemingFromAnUnknownCardFails() {
    assertThrows(UnknownCardException.class,
        () -> redemptions.redeem(CardNumber.of("6000000000000000"), Money.parse("1.00"), "S"));
  }
}
