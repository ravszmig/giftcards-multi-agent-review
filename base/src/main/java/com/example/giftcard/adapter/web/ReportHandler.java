package com.example.giftcard.adapter.web;

import com.example.giftcard.reporting.ReportingService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** {@code GET /reports/daily?date=YYYY-MM-DD}: one day's totals for Finance. */
public final class ReportHandler implements HttpHandler {

  private final ReportingService reporting;
  private final ZoneId zone;

  public ReportHandler(ReportingService reporting, ZoneId zone) {
    this.reporting = reporting;
    this.zone = zone;
  }

  @Override
  public void handle(HttpExchange exchange) throws IOException {
    try (exchange) {
      if (!exchange.getRequestMethod().equals("GET")
          || !CardHandler.segments(exchange).equals(List.of("daily"))) {
        CardHandler.respond(exchange, 404, Map.of("error", "NOT_FOUND"));
        return;
      }
      final String query = exchange.getRequestURI().getQuery();
      final LocalDate date;
      try {
        date = LocalDate.parse(query == null ? "" : query.replaceFirst("^date=", ""));
      } catch (DateTimeParseException e) {
        CardHandler.respond(exchange, 400,
            Map.of("error", "INVALID_REQUEST", "message", "date=YYYY-MM-DD is required"));
        return;
      }
      final ReportingService.DailyTotals totals = reporting.daily(date, zone);
      final Map<String, Object> body = new LinkedHashMap<>();
      body.put("date", totals.date().toString());
      body.put("issued", totals.issued().format());
      body.put("redeemed", totals.redeemed().format());
      body.put("toppedUp", totals.toppedUp().format());
      body.put("entries", totals.entries());
      CardHandler.respond(exchange, 200, body);
    }
  }
}
