package com.example.giftcard.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.giftcard.adapter.jdbc.JdbcGiftCardRepository;
import com.example.giftcard.adapter.jdbc.JdbcLedgerRepository;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import java.util.List;
import java.util.Random;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class RedemptionHistoryTest {

  private final DataSource db = TestDatabase.migrated();
  private final JdbcGiftCardRepository repository = new JdbcGiftCardRepository(db);
  private final CardService cards = new CardService(repository, new Random(7), Clocks.fixed());
  private final RedemptionService redemptions = new RedemptionService(repository, Clocks.fixed());
  private final RedemptionHistory history = new RedemptionHistory(new JdbcLedgerRepository(db));

  @Test
  void listsOnlyRedemptionsOldestFirst() {
    final CardNumber number = cards.issue(Money.parse("30.00")).number();
    redemptions.redeem(number, Money.parse("5.00"), "S-001");
    cards.topUp(number, Money.parse("10.00"));
    redemptions.redeem(number, Money.parse("2.00"), "S-002");
    assertEquals(List.of("S-001", "S-002"),
        history.redemptions(number).stream().map(LedgerEntry::storeId).toList());
  }

  @Test
  void aNewCardHasNoRedemptions() {
    assertEquals(List.of(), history.redemptions(cards.issue(Money.parse("5.00")).number()));
  }
}
