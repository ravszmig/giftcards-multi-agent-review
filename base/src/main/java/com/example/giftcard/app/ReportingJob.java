package com.example.giftcard.app;

import com.example.giftcard.adapter.jdbc.JdbcLedgerRepository;
import com.example.giftcard.reporting.ReportingService;
import java.time.LocalDate;
import javax.sql.DataSource;

/**
 * The nightly Finance job. Runs as its own process against the same database, with no HTTP
 * server and no store webhook: {@code java ... ReportingJob <jdbc-url> <date>}.
 */
public final class ReportingJob {

  private ReportingJob() {
  }

  public static String run(DataSource dataSource, LocalDate date) {
    final ReportingService.DailyTotals totals = new ReportingService(
        new JdbcLedgerRepository(dataSource)).daily(date, GiftCardApplication.ZONE);
    return totals.date() + " issued " + totals.issued().format()
        + " redeemed " + totals.redeemed().format()
        + " topped-up " + totals.toppedUp().format()
        + " entries " + totals.entries();
  }

  public static void main(String[] args) {
    System.out.println(run(GiftCardApplication.dataSource(args[0]), LocalDate.parse(args[1])));
  }
}
