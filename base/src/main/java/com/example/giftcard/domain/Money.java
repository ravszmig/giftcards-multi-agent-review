package com.example.giftcard.domain;

import java.math.BigDecimal;

/**
 * An amount of money in pence. Every card holds GBP, so there is no currency field.
 * Never negative.
 */
public record Money(long pence) implements Comparable<Money> {

  public static final Money ZERO = new Money(0);

  public Money {
    if (pence < 0) {
      throw new IllegalArgumentException("Amount cannot be negative: " + pence);
    }
  }

  public static Money ofPence(long pence) {
    return new Money(pence);
  }

  /** Parses a decimal amount such as "12.50" or "12". At most two decimal places. */
  public static Money parse(String text) {
    if (text == null || text.isBlank()) {
      throw new IllegalArgumentException("Amount is required");
    }
    final BigDecimal value;
    try {
      value = new BigDecimal(text.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("Not an amount");
    }
    if (value.scale() > 2) {
      throw new IllegalArgumentException("At most two decimal places");
    }
    return new Money(value.movePointRight(2).longValueExact());
  }

  public Money plus(Money other) {
    return new Money(Math.addExact(pence, other.pence));
  }

  public Money minus(Money other) {
    return new Money(Math.subtractExact(pence, other.pence));
  }

  public boolean isZero() {
    return pence == 0;
  }

  public boolean isGreaterThan(Money other) {
    return pence > other.pence;
  }

  /** "12.50". */
  public String format() {
    return BigDecimal.valueOf(pence, 2).toPlainString();
  }

  @Override
  public int compareTo(Money other) {
    return Long.compare(pence, other.pence);
  }
}
