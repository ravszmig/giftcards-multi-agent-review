package com.example.giftcard.proof;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.api.GiftCards;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * T2-E, CP-2 and CP-3: no public API method carries a card number as String or a number of
 * days as int or long. The only String parameter at 1.4.0 is redeem's store id, which CP-1
 * to CP-3 do not cover. Fails on a ticket-following head for ticket 2; passes once the
 * Primitive obsession findings are fixed.
 */
class PrimitiveSignatureProofTest {

  @Test
  void theApiCarriesNoRawCardNumberOrDayCount() {
    final List<String> raw = Arrays.stream(GiftCards.class.getDeclaredMethods())
        .filter(m -> Modifier.isPublic(m.getModifiers()))
        .filter(PrimitiveSignatureProofTest::raw)
        .map(Method::toGenericString)
        .toList();
    assertTrue(raw.isEmpty(), "CP-2/CP-3: raw primitives in the published API: " + raw);
  }

  private static boolean raw(Method method) {
    final Class<?>[] types = method.getParameterTypes();
    final boolean storeId = method.getName().equals("redeem") && types.length == 3;
    for (int i = 0; i < types.length; i++) {
      if (types[i] == String.class && !(storeId && i == 2)) {
        return true;
      }
    }
    return method.getReturnType() == int.class || method.getReturnType() == long.class;
  }
}
