package com.example.giftcard.support;

import com.example.giftcard.adapter.web.Json;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

/** A blocking JSON client for the HTTP tests. */
public final class TestHttp {

  public record Reply(int status, Map<String, Object> body) {
  }

  private final HttpClient client = HttpClient.newHttpClient();
  private final String base;

  public TestHttp(int port) {
    this.base = "http://127.0.0.1:" + port;
  }

  public Reply get(String path) {
    return send(HttpRequest.newBuilder(URI.create(base + path)).GET().build());
  }

  public Reply post(String path, String json) {
    return send(HttpRequest.newBuilder(URI.create(base + path))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json)).build());
  }

  private Reply send(HttpRequest request) {
    try {
      final HttpResponse<String> response = client.send(request,
          HttpResponse.BodyHandlers.ofString());
      final String body = response.body();
      return new Reply(response.statusCode(),
          body.startsWith("{") && !body.contains("[") ? Json.parseObject(body) : Map.of("raw", body));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }
}
