package com.example.giftcard.support;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

public final class Clocks {

  public static final Instant NOON_2026_11_02 = Instant.parse("2026-11-02T12:00:00Z");

  private Clocks() {
  }

  public static Clock fixed() {
    return Clock.fixed(NOON_2026_11_02, ZoneOffset.UTC);
  }
}
