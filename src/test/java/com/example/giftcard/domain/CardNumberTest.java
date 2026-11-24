package com.example.giftcard.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class CardNumberTest {

  private static final String NUMBER = "6011000990134821";

  @Test
  void rejectsAnythingButSixteenDigits() {
    assertThrows(IllegalArgumentException.class, () -> CardNumber.of("601100099013482"));
    assertThrows(IllegalArgumentException.class, () -> CardNumber.of("60110009901348x1"));
  }

  @Test
  void maskedShowsOnlyTheLastFourDigits() {
    assertEquals("************4821", CardNumber.of(NUMBER).masked());
  }

  @Test
  void toStringIsMasked() {
    assertEquals("card ************4821", "card " + CardNumber.of(NUMBER));
  }
}
