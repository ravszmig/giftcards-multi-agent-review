package com.example.giftcard.adapter.web;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Handler;
import java.util.logging.LogRecord;
import java.util.logging.Logger;
import org.junit.jupiter.api.Test;

/** The redemption log line carries the masked number only. */
class RedemptionLoggingTest {

  @Test
  void theRedemptionLogLineIsMasked() {
    final List<String> lines = new ArrayList<>();
    final Handler capture = new Handler() {
      @Override
      public void publish(LogRecord record) {
        lines.add(record.getMessage());
      }

      @Override
      public void flush() {
      }

      @Override
      public void close() {
      }
    };
    final Logger logger = Logger.getLogger(CardHandler.class.getName());
    logger.addHandler(capture);
    try (HttpTestApp app = new HttpTestApp()) {
      final String number = app.issue("9.00");
      app.http.post("/cards/" + number + "/redemptions",
          "{\"amount\":\"1.00\",\"storeId\":\"S-001\"}");
      assertTrue(lines.stream().anyMatch(line -> line.startsWith("Redeemed 1.00")), lines.toString());
      assertFalse(lines.stream().anyMatch(line -> line.contains(number)), lines.toString());
    } finally {
      logger.removeHandler(capture);
    }
  }
}
