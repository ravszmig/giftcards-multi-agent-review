package com.example.giftcard.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class MoneyTest {

  @Test
  void parsesPoundsAndPence() {
    assertEquals(Money.ofPence(1250), Money.parse("12.50"));
    assertEquals(Money.ofPence(1200), Money.parse("12"));
  }

  @Test
  void rejectsMoreThanTwoDecimalPlaces() {
    assertThrows(IllegalArgumentException.class, () -> Money.parse("1.005"));
  }

  @Test
  void rejectsNegativeAmounts() {
    assertThrows(IllegalArgumentException.class, () -> Money.ofPence(-1));
    assertThrows(IllegalArgumentException.class, () -> Money.parse("-3.00"));
  }


  @Test
  void formatsWithTwoDecimalPlaces() {
    assertEquals("0.05", Money.ofPence(5).format());
    assertEquals("120.00", Money.ofPence(12_000).format());
  }
}
