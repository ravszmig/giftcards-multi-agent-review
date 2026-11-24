package com.example.giftcard.adapter.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.support.TestHttp.Reply;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class CardHandlerTest {

  private final HttpTestApp app = new HttpTestApp();

  @AfterEach
  void stop() {
    app.close();
  }

  @Test
  void issuingReturnsTheFullNumberOnce() {
    final Reply reply = app.http.post("/cards", "{\"amount\":\"25.00\"}");
    assertEquals(201, reply.status());
    assertTrue(((String) reply.body().get("number")).matches("\\d{16}"));
    assertEquals("25.00", reply.body().get("balance"));
  }

  @Test
  void balanceShowsTheMaskedNumber() {
    final String number = app.issue("25.00");
    final Reply reply = app.http.get("/cards/" + number);
    assertEquals(200, reply.status());
    assertEquals("************" + number.substring(12), reply.body().get("number"));
    assertEquals("2026-11-02", reply.body().get("issuedOn"));
  }

  @Test
  void redeemingReturnsTheRedemptionIdAndNewBalance() {
    final String number = app.issue("25.00");
    final Reply reply = app.http.post("/cards/" + number + "/redemptions",
        "{\"amount\":\"10.00\",\"storeId\":\"S-001\"}");
    assertEquals(201, reply.status());
    assertTrue(((Long) reply.body().get("redemptionId")) > 0);
    assertEquals("15.00", reply.body().get("balance"));
  }

  @Test
  void redeemingMoreThanTheBalanceIs422() {
    final String number = app.issue("5.00");
    final Reply reply = app.http.post("/cards/" + number + "/redemptions",
        "{\"amount\":\"5.01\",\"storeId\":\"S-001\"}");
    assertEquals(422, reply.status());
    assertEquals("INSUFFICIENT_BALANCE", reply.body().get("error"));
  }

  @Test
  void errorsMapToStatuses() {
    assertEquals(404, app.http.get("/cards/6000000000000000").status());
    assertEquals(400, app.http.post("/cards", "{\"amount\":\"ten\"}").status());
    assertEquals(400, app.http.get("/cards/123").status());
  }

  @Test
  void historyListsRedemptions() {
    final String number = app.issue("25.00");
    app.http.post("/cards/" + number + "/redemptions", "{\"amount\":\"1.00\",\"storeId\":\"S-7\"}");
    final Reply reply = app.http.get("/cards/" + number + "/redemptions");
    assertEquals(200, reply.status());
    assertTrue(reply.body().get("raw").toString().contains("\"storeId\":\"S-7\""));
  }
}
