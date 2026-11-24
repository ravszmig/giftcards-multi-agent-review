package com.example.giftcard.adapter.web;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.giftcard.support.TestHttp.Reply;
import org.junit.jupiter.api.Test;

class ReportHandlerTest {

  @Test
  void dailyReportTotalsTheDay() {
    try (HttpTestApp app = new HttpTestApp()) {
      app.issue("12.00");
      final Reply reply = app.http.get("/reports/daily?date=2026-11-02");
      assertEquals(200, reply.status());
      assertEquals("12.00", reply.body().get("issued"));
      assertEquals(400, app.http.get("/reports/daily?date=yesterday").status());
    }
  }
}
