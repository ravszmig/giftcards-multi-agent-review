package com.example.giftcard.proof;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.giftcard.app.GiftCardApplication;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * T2-C, BD-011, DISPUTED. Shows which reading the code follows: 14 days (BD-011) or 30
 * (the ticket). It passes on the 14-day reading. It does not decide the dispute.
 */
class GracePeriodProofTest {

  @Test
  void aCardIsRefusedFifteenDaysAfterItsExpiryDate() {
    final ProofSupport.MutableClock clock =
        new ProofSupport.MutableClock(Instant.parse("2026-01-15T10:00:00Z"));
    try (GiftCardApplication app = ProofSupport.start(clock)) {
      final String number = ProofSupport.issue(app, "20.00");
      clock.set(Instant.parse("2027-01-25T10:00:00Z"));
      assertEquals(201, ProofSupport.redeem(app, number, "1.00").status(),
          "10 days after expiry is inside every reading of the grace period");
      clock.set(Instant.parse("2027-01-30T10:00:00Z"));
      final ProofSupport.Reply late = ProofSupport.redeem(app, number, "1.00");
      assertEquals(422, late.status(),
          "BD-011: redeemed 15 days after the expiry date: " + late.body());
    }
  }
}
