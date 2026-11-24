package com.example.giftcard.domain;

import java.util.regex.Pattern;

/** A gift card number: 16 digits. {@link #toString()} returns the masked form. */
public record CardNumber(String value) {

  private static final Pattern DIGITS = Pattern.compile("\\d{16}");

  public CardNumber {
    if (value == null || !DIGITS.matcher(value).matches()) {
      throw new IllegalArgumentException("A card number is 16 digits");
    }
  }

  public static CardNumber of(String value) {
    return new CardNumber(value);
  }

  /** Twelve asterisks and the last four digits: "************4821". */
  public String masked() {
    return "*".repeat(12) + value.substring(12);
  }

  @Override
  public String toString() {
    return masked();
  }
}
