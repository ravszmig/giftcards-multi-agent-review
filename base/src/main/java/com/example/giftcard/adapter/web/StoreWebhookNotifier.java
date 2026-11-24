package com.example.giftcard.adapter.web;

import com.example.giftcard.domain.LedgerEntry;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Logger;

/**
 * Tells the store system about money movements, by POSTing JSON to its webhook. Fire and
 * forget: a failed delivery is logged and not retried. With no endpoint configured, every
 * call is a no-op.
 */
public final class StoreWebhookNotifier {

  private static final Logger LOG = Logger.getLogger(StoreWebhookNotifier.class.getName());
  private static final Duration TIMEOUT = Duration.ofSeconds(2);

  private final URI endpoint;
  private final HttpClient client;

  public StoreWebhookNotifier(URI endpoint) {
    this.endpoint = endpoint;
    this.client = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
  }

  /** Sends a REDEMPTION event. Completes with the HTTP status, or -1 when nothing was sent. */
  public CompletableFuture<Integer> redemption(LedgerEntry entry) {
    final Map<String, Object> event = new LinkedHashMap<>();
    event.put("event", "REDEMPTION");
    event.put("card", entry.card().masked());
    event.put("amount", entry.amount().format());
    event.put("storeId", entry.storeId());
    event.put("entryId", entry.id());
    return send(event);
  }

  private CompletableFuture<Integer> send(Map<String, Object> event) {
    if (endpoint == null) {
      return CompletableFuture.completedFuture(-1);
    }
    final HttpRequest request = HttpRequest.newBuilder(endpoint)
        .timeout(TIMEOUT)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(Json.write(event)))
        .build();
    return client.sendAsync(request, HttpResponse.BodyHandlers.discarding())
        .thenApply(HttpResponse::statusCode)
        .exceptionally(failure -> {
          LOG.warning(() -> "Store webhook failed for " + event.get("event") + ": " + failure);
          return -1;
        });
  }
}
