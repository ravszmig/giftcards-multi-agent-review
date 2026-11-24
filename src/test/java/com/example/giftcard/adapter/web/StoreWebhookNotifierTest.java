package com.example.giftcard.adapter.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.EntryKind;
import com.example.giftcard.domain.LedgerEntry;
import com.example.giftcard.domain.Money;
import com.example.giftcard.support.Clocks;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;

class StoreWebhookNotifierTest {

  private static final LedgerEntry ENTRY = new LedgerEntry(41, CardNumber.of("6011000990134821"),
      EntryKind.REDEEM, Money.parse("3.00"), null, "S-001", Clocks.NOON_2026_11_02);

  @Test
  void postsTheEventWithAMaskedNumber() throws IOException {
    final CompletableFuture<String> received = new CompletableFuture<>();
    final HttpServer store = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    store.createContext("/hook", exchange -> {
      received.complete(new String(exchange.getRequestBody().readAllBytes(),
          StandardCharsets.UTF_8));
      exchange.sendResponseHeaders(204, -1);
      exchange.close();
    });
    store.start();
    try {
      final URI hook = URI.create("http://127.0.0.1:" + store.getAddress().getPort() + "/hook");
      assertEquals(204, new StoreWebhookNotifier(hook).redemption(ENTRY).join());
      final String body = received.join();
      assertTrue(body.contains("\"card\":\"************4821\""), body);
      assertFalse(body.contains("6011000990134821"), body);
    } finally {
      store.stop(0);
    }
  }

  @Test
  void withNoEndpointNothingIsSent() {
    assertEquals(-1, new StoreWebhookNotifier(null).redemption(ENTRY).join());
  }
}
