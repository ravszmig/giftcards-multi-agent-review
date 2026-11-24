package com.example.giftcard.adapter.web;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class JsonTest {

  @Test
  void readsAFlatObject() {
    final Map<String, Object> object = Json.parseObject(
        " {\"amount\": \"5.00\", \"redemptionId\": 42, \"gift\": true, \"note\": null} ");
    assertEquals("5.00", object.get("amount"));
    assertEquals(42L, object.get("redemptionId"));
    assertEquals(true, object.get("gift"));
    assertEquals(null, object.get("note"));
  }


  @Test
  void writesNestedValuesAndEscapes() {
    final Map<String, Object> value = new LinkedHashMap<>();
    value.put("items", List.of(1, "a\"b"));
    value.put("none", null);
    assertEquals("{\"items\":[1,\"a\\\"b\"],\"none\":null}", Json.write(value));
  }
}
