package com.example.giftcard.proof;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.app.GiftCardApplication;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;
import java.util.logging.SimpleFormatter;
import org.junit.jupiter.api.Test;

/**
 * T1-B, S-2: no full card number in any log line at INFO or above, the production level, or
 * on the console. Refunds included. Below INFO the JDK's HTTP server logs request lines,
 * which carry the number in the path (SECURITY.md, S-5).
 */
class RefundLoggingProofTest {

  @Test
  void noLogLineCarriesTheFullCardNumber() {
    final List<String> lines = new CopyOnWriteArrayList<>();
    final SimpleFormatter formatter = new SimpleFormatter();
    final Handler capture = new Handler() {
      @Override
      public void publish(LogRecord record) {
        lines.add(formatter.format(record));
      }

      @Override
      public void flush() {
      }

      @Override
      public void close() {
      }
    };
    capture.setLevel(Level.INFO);
    final Logger rootLogger = Logger.getLogger("");
    final Level level = rootLogger.getLevel();
    final PrintStream out = System.out;
    final PrintStream err = System.err;
    final ByteArrayOutputStream console = new ByteArrayOutputStream();
    rootLogger.setLevel(Level.INFO);
    rootLogger.addHandler(capture);
    System.setOut(new PrintStream(console, true, StandardCharsets.UTF_8));
    System.setErr(new PrintStream(console, true, StandardCharsets.UTF_8));
    String number;
    try (GiftCardApplication app = ProofSupport.start(Clock.systemUTC())) {
      number = ProofSupport.issue(app, "30.00");
      final String redemption = ProofSupport.redeem(app, number, "10.00").field("redemptionId");
      assertEquals(201, ProofSupport.refund(app, number, redemption, "5.00").status(),
          "the refund must succeed for the proof to mean anything");
    } finally {
      rootLogger.removeHandler(capture);
      rootLogger.setLevel(level);
      System.setOut(out);
      System.setErr(err);
    }
    final String printed = console.toString(StandardCharsets.UTF_8);
    final String full = number;
    final List<String> leaks = lines.stream().filter(line -> line.contains(full)).toList();
    assertTrue(leaks.isEmpty() && !printed.contains(full),
        "S-2: the full card number reached a log line: " + leaks + " console: "
            + printed.lines().filter(l -> l.contains(full)).toList());
  }
}
