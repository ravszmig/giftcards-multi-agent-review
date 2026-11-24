package com.example.giftcard.domain;

import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class GiftCardTest {

  private final GiftCard card = new GiftCard(CardNumber.of("6011000990134821"),
      Money.ofPence(2_000), LocalDate.of(2026, 11, 2), 3);

  @Test
  void redeemingMoreThanTheBalanceFails() {
    assertThrows(InsufficientBalanceException.class, () -> card.redeem(Money.ofPence(2_001)));
  }

}
