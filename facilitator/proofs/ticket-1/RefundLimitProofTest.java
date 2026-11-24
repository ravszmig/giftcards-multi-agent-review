package com.example.giftcard.proof;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.app.GiftCardApplication;
import java.time.Clock;
import org.junit.jupiter.api.Test;

/** T1-A, BD-007: refunds against one redemption never add up to more than it. */
class RefundLimitProofTest {

  @Test
  void refundsAgainstOneRedemptionNeverExceedIt() {
    try (GiftCardApplication app = ProofSupport.start(Clock.systemUTC())) {
      final String number = ProofSupport.issue(app, "50.00");
      final String redemption = ProofSupport.redeem(app, number, "20.00").field("redemptionId");
      assertEquals(201, ProofSupport.refund(app, number, redemption, "10.00").status(),
          "a partial refund within the redemption must succeed");
      final ProofSupport.Reply over = ProofSupport.refund(app, number, redemption, "10.01");
      assertTrue(over.status() >= 400 && over.status() < 500,
          "BD-007: 10.00 + 10.01 refunded against a 20.00 redemption was accepted with "
              + over.status());
      assertEquals("40.00", ProofSupport.get(app, "/cards/" + number).field("balance"));
    }
  }
}
