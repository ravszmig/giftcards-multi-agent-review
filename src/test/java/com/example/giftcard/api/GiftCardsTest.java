package com.example.giftcard.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.app.GiftCardApplication;
import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.Money;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class GiftCardsTest {

  private final GiftCardApplication app = GiftCardApplication.start(
      new GiftCardApplication.Config(0, TestDatabase.freshUrl(), null, Clocks.fixed()));
  private final GiftCards api = app.api();

  @AfterEach
  void stop() {
    app.close();
  }

  @Test
  void aViewCarriesTheMaskedNumberOnly() {
    final CardNumber number = api.issue(Money.parse("30.00"));
    final CardView view = api.balance(number);
    assertEquals(number.masked(), view.maskedNumber());
    assertEquals(Money.parse("30.00"), view.balance());
  }

  @Test
  void redeemAndTopUpReturnTheNewBalance() {
    final CardNumber number = api.issue(Money.parse("30.00"));
    assertEquals(Money.parse("20.00"), api.redeem(number, Money.parse("10.00"), "P-1").balance());
    assertEquals(Money.parse("25.00"), api.topUp(number, Money.parse("5.00")).balance());
  }

  @Test
  void theVersionConstantMatchesThePom() throws IOException {
    final String pom = Files.readString(Path.of("pom.xml"));
    assertTrue(pom.contains("<version>" + GiftCards.VERSION + "</version>"),
        "pom.xml does not carry version " + GiftCards.VERSION);
  }
}
