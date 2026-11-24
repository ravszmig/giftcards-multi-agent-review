package com.example.giftcard.reporting;

import com.example.giftcard.domain.LedgerEntry;
import com.example.giftcard.domain.LedgerRepository;
import com.example.giftcard.domain.Money;
import java.time.LocalDate;
import java.time.ZoneId;

/** Daily totals for Finance. Reads the ledger; changes nothing. */
public final class ReportingService {

  /** One day's totals, by entry kind. */
  public record DailyTotals(LocalDate date, Money issued, Money redeemed, Money toppedUp,
      int entries) {
  }

  private final LedgerRepository ledger;

  public ReportingService(LedgerRepository ledger) {
    this.ledger = ledger;
  }

  /** Totals for entries made on {@code date} in {@code zone}. */
  public DailyTotals daily(LocalDate date, ZoneId zone) {
    Money issued = Money.ZERO;
    Money redeemed = Money.ZERO;
    Money toppedUp = Money.ZERO;
    int entries = 0;
    for (LedgerEntry entry : ledger.between(date.atStartOfDay(zone).toInstant(),
        date.plusDays(1).atStartOfDay(zone).toInstant())) {
      entries++;
      switch (entry.kind()) {
        case ISSUE -> issued = issued.plus(entry.amount());
        case REDEEM -> redeemed = redeemed.plus(entry.amount());
        case TOP_UP -> toppedUp = toppedUp.plus(entry.amount());
      }
    }
    return new DailyTotals(date, issued, redeemed, toppedUp, entries);
  }
}
