package com.example.giftcard.proof;

import com.example.giftcard.app.GiftCardApplication;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Facilitator-only. Proofs talk to the application over HTTP, using only the routes and
 * fields the tickets name, so they compile against any implementation that keeps
 * {@code GiftCardApplication.start(Config)}.
 */
final class ProofSupport {

  record Reply(int status, String body) {

    String field(String name) {
      final Matcher m = Pattern.compile("\"" + name + "\"\\s*:\\s*(\"([^\"]*)\"|(-?\\d+))")
          .matcher(body);
      return m.find() ? (m.group(2) != null ? m.group(2) : m.group(3)) : null;
    }
  }

  static final class MutableClock extends Clock {
    private volatile Instant now;

    MutableClock(Instant now) {
      this.now = now;
    }

    void set(Instant instant) {
      now = instant;
    }

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return now;
    }
  }

  private static final HttpClient CLIENT = HttpClient.newHttpClient();

  private ProofSupport() {
  }

  static GiftCardApplication start(Clock clock) {
    return GiftCardApplication.start(new GiftCardApplication.Config(0,
        "jdbc:h2:mem:proof-" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", null, clock));
  }

  static Reply get(GiftCardApplication app, String path) {
    return send(HttpRequest.newBuilder(uri(app, path)).GET().build());
  }

  static Reply post(GiftCardApplication app, String path, String json) {
    return send(HttpRequest.newBuilder(uri(app, path)).header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json)).build());
  }

  static String issue(GiftCardApplication app, String amount) {
    return post(app, "/cards", "{\"amount\":\"" + amount + "\"}").field("number");
  }

  static Reply redeem(GiftCardApplication app, String number, String amount) {
    return post(app, "/cards/" + number + "/redemptions",
        "{\"amount\":\"" + amount + "\",\"storeId\":\"S-PROOF\"}");
  }

  static Reply refund(GiftCardApplication app, String number, String redemptionId,
      String amount) {
    return post(app, "/cards/" + number + "/refunds", "{\"redemptionId\":" + redemptionId
        + ",\"amount\":\"" + amount + "\",\"storeId\":\"S-PROOF\"}");
  }

  private static URI uri(GiftCardApplication app, String path) {
    return URI.create("http://127.0.0.1:" + app.port() + path);
  }

  private static Reply send(HttpRequest request) {
    try {
      final HttpResponse<String> response = CLIENT.send(request,
          HttpResponse.BodyHandlers.ofString());
      return new Reply(response.statusCode(), response.body());
    } catch (IOException e) {
      throw new IllegalStateException(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }
}
