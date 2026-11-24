package com.example.giftcard.reporting;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.giftcard.adapter.jdbc.JdbcGiftCardRepository;
import com.example.giftcard.adapter.jdbc.JdbcLedgerRepository;
import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.CardService;
import com.example.giftcard.domain.Money;
import com.example.giftcard.domain.RedemptionService;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Random;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class ReportingServiceTest {

  private static final ZoneId LONDON = ZoneId.of("Europe/London");

  private final DataSource db = TestDatabase.migrated();
  private final JdbcGiftCardRepository repository = new JdbcGiftCardRepository(db);
  private final ReportingService reporting = new ReportingService(new JdbcLedgerRepository(db));

  @Test
  void sumsEachKindForTheDay() {
    final CardService cards = new CardService(repository, new Random(1), Clocks.fixed());
    final CardNumber number = cards.issue(Money.parse("40.00")).number();
    new RedemptionService(repository, Clocks.fixed()).redeem(number, Money.parse("15.00"), "S");
    cards.topUp(number, Money.parse("5.00"));

    final ReportingService.DailyTotals totals = reporting.daily(LocalDate.of(2026, 11, 2), LONDON);
    assertEquals(Money.parse("40.00"), totals.issued());
    assertEquals(Money.parse("15.00"), totals.redeemed());
    assertEquals(Money.parse("5.00"), totals.toppedUp());
    assertEquals(3, totals.entries());
  }

  @Test
  void otherDaysAreNotCounted() {
    new CardService(repository, new Random(1), Clocks.fixed()).issue(Money.parse("40.00"));
    assertEquals(0, reporting.daily(LocalDate.of(2026, 11, 3), LONDON).entries());
  }
}
