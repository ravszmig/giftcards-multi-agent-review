package com.example.giftcard.proof;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.api.CardView;
import com.example.giftcard.api.GiftCards;
import java.io.IOException;
import java.lang.reflect.Modifier;
import java.lang.reflect.RecordComponent;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** T2-B, P-2 to P-4: a 1.x release keeps 1.4.0's signatures, not deprecated, and bumps. */
class ApiCompatibilityProofTest {

  private static final String D = "com.example.giftcard.domain.";
  private static final String A = "com.example.giftcard.api.";
  private static final Set<String> GIFT_CARDS_1_4_0 = Set.of(
      "GiftCards(" + D + "CardService," + D + "RedemptionService)",
      D + "CardNumber issue(" + D + "Money)",
      A + "CardView balance(" + D + "CardNumber)",
      A + "CardView redeem(" + D + "CardNumber," + D + "Money,java.lang.String)",
      A + "CardView topUp(" + D + "CardNumber," + D + "Money)");
  private static final String CARD_VIEW_1_4_0 = "maskedNumber,balance,issuedOn";

  @Test
  void aOneXReleaseKeepsEverySignatureAndBumpsForAdditions() throws IOException {
    final Set<String> now = Stream.concat(
        Arrays.stream(GiftCards.class.getConstructors())
            .map(c -> "GiftCards(" + params(c.getParameterTypes()) + ")"),
        Arrays.stream(GiftCards.class.getDeclaredMethods())
            .filter(m -> Modifier.isPublic(m.getModifiers()))
            .map(m -> m.getReturnType().getName() + " " + m.getName() + "("
                + params(m.getParameterTypes()) + ")"))
        .collect(Collectors.toCollection(TreeSet::new));
    final String view = Arrays.stream(CardView.class.getRecordComponents())
        .map(RecordComponent::getName).collect(Collectors.joining(","));
    if (GiftCards.VERSION.startsWith("1.")) {
      final Set<String> missing = new TreeSet<>(GIFT_CARDS_1_4_0);
      missing.removeAll(now);
      assertTrue(missing.isEmpty(), "P-2: version " + GiftCards.VERSION
          + " removed or changed 1.4.0 signatures " + missing);
      assertEquals(CARD_VIEW_1_4_0, view, "P-2: CardView's components changed in a 1.x release");
      final Set<String> deprecated = Arrays.stream(GiftCards.class.getDeclaredMethods())
          .filter(m -> m.isAnnotationPresent(Deprecated.class))
          .map(m -> m.getReturnType().getName() + " " + m.getName() + "("
              + params(m.getParameterTypes()) + ")")
          .filter(GIFT_CARDS_1_4_0::contains)
          .collect(Collectors.toCollection(TreeSet::new));
      assertTrue(deprecated.isEmpty(), "P-4: a 1.4.0 signature that stays was deprecated "
          + deprecated);
    }
    if (!now.equals(new TreeSet<>(GIFT_CARDS_1_4_0)) || !view.equals(CARD_VIEW_1_4_0)) {
      assertNotEquals("1.4.0", GiftCards.VERSION,
          "P-3: the public API changed and VERSION is still 1.4.0: " + now);
    }
    assertTrue(Files.readString(Path.of("pom.xml")).contains("<version>" + GiftCards.VERSION
        + "</version>"), "P-1: pom.xml and GiftCards.VERSION disagree");
  }

  private static String params(Class<?>[] types) {
    return Arrays.stream(types).map(Class::getName).collect(Collectors.joining(","));
  }
}
