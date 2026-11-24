package com.example.giftcard.app;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.giftcard.adapter.jdbc.JdbcGiftCardRepository;
import com.example.giftcard.domain.CardService;
import com.example.giftcard.domain.Money;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import java.time.LocalDate;
import java.util.Random;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class ReportingJobTest {

  @Test
  void printsOneLineOfTotals() {
    final DataSource db = TestDatabase.migrated();
    new CardService(new JdbcGiftCardRepository(db), new Random(3), Clocks.fixed())
        .issue(Money.parse("8.00"));
    assertEquals("2026-11-02 issued 8.00 redeemed 0.00 topped-up 0.00 entries 1",
        ReportingJob.run(db, LocalDate.of(2026, 11, 2)));
  }
}
