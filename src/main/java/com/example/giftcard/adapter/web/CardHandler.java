package com.example.giftcard.adapter.web;

import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.CardService;
import com.example.giftcard.domain.GiftCard;
import com.example.giftcard.domain.LedgerEntry;
import com.example.giftcard.domain.Money;
import com.example.giftcard.domain.RedemptionHistory;
import com.example.giftcard.domain.RedemptionService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * The {@code /cards} routes.
 *
 * <pre>
 * POST /cards                          {"amount"}            201 {"number", "balance"}
 * GET  /cards/{number}                                       200 {"number", "balance", "issuedOn"}
 * POST /cards/{number}/redemptions     {"amount", "storeId"} 201 {"redemptionId", "balance"}
 * GET  /cards/{number}/redemptions                           200 {"redemptions": [...]}
 * POST /cards/{number}/top-ups         {"amount"}            201 {"balance"}
 * </pre>
 *
 * The issue response is the only one that carries the full card number.
 */
public final class CardHandler implements HttpHandler {

  private static final Logger LOG = Logger.getLogger(CardHandler.class.getName());

  private final CardService cards;
  private final RedemptionService redemptions;
  private final RedemptionHistory history;
  private final StoreWebhookNotifier notifier;

  public CardHandler(CardService cards, RedemptionService redemptions,
      RedemptionHistory history, StoreWebhookNotifier notifier) {
    this.cards = cards;
    this.redemptions = redemptions;
    this.history = history;
    this.notifier = notifier;
  }

  @Override
  public void handle(HttpExchange exchange) throws IOException {
    try (exchange) {
      final List<String> path = segments(exchange);
      final String method = exchange.getRequestMethod();
      try {
        if (path.isEmpty() && method.equals("POST")) {
          issue(exchange);
        } else if (path.size() == 1 && method.equals("GET")) {
          balance(exchange, CardNumber.of(path.get(0)));
        } else if (path.size() == 2 && path.get(1).equals("redemptions")
            && method.equals("POST")) {
          redeem(exchange, CardNumber.of(path.get(0)));
        } else if (path.size() == 2 && path.get(1).equals("redemptions")
            && method.equals("GET")) {
          redemptions(exchange, CardNumber.of(path.get(0)));
        } else if (path.size() == 2 && path.get(1).equals("top-ups") && method.equals("POST")) {
          topUp(exchange, CardNumber.of(path.get(0)));
        } else {
          respond(exchange, 404, Map.of("error", "NOT_FOUND", "message", "No such route"));
        }
      } catch (RuntimeException e) {
        final ErrorMapper.Error error = ErrorMapper.map(e);
        respond(exchange, error.status(), error.body());
      }
    }
  }

  private void issue(HttpExchange exchange) throws IOException {
    final Money amount = Money.parse(string(body(exchange), "amount"));
    final GiftCard card = cards.issue(amount);
    LOG.info(() -> "Issued card " + card.number().masked() + " with " + amount.format());
    final Map<String, Object> response = new LinkedHashMap<>();
    response.put("number", card.number().value());
    response.put("balance", card.balance().format());
    respond(exchange, 201, response);
  }

  private void balance(HttpExchange exchange, CardNumber number) throws IOException {
    final GiftCard card = cards.balance(number);
    final Map<String, Object> response = new LinkedHashMap<>();
    response.put("number", card.number().masked());
    response.put("balance", card.balance().format());
    response.put("issuedOn", card.issuedOn().toString());
    respond(exchange, 200, response);
  }

  private void redeem(HttpExchange exchange, CardNumber number) throws IOException {
    final Map<String, Object> request = body(exchange);
    final Money amount = Money.parse(string(request, "amount"));
    final String storeId = string(request, "storeId");
    final LedgerEntry entry = redemptions.redeem(number, amount, storeId);
    LOG.info(() -> "Redeemed " + amount.format() + " from card " + number.masked()
        + " at store " + storeId);
    notifier.redemption(entry);
    final Map<String, Object> response = new LinkedHashMap<>();
    response.put("redemptionId", entry.id());
    response.put("balance", redemptions.card(number).balance().format());
    respond(exchange, 201, response);
  }

  private void redemptions(HttpExchange exchange, CardNumber number) throws IOException {
    cards.balance(number);
    final List<Map<String, Object>> items = history.redemptions(number).stream()
        .map(entry -> {
          final Map<String, Object> item = new LinkedHashMap<>();
          item.put("id", entry.id());
          item.put("amount", entry.amount().format());
          item.put("storeId", entry.storeId());
          item.put("at", entry.at().toString());
          return item;
        })
        .toList();
    respond(exchange, 200, Map.of("redemptions", items));
  }

  private void topUp(HttpExchange exchange, CardNumber number) throws IOException {
    final Money amount = Money.parse(string(body(exchange), "amount"));
    final GiftCard card = cards.topUp(number, amount);
    LOG.info(() -> "Topped up card " + number.masked() + " with " + amount.format());
    respond(exchange, 201, Map.of("balance", card.balance().format()));
  }

  static List<String> segments(HttpExchange exchange) {
    final String path = exchange.getRequestURI().getPath();
    final String rest = path.substring(exchange.getHttpContext().getPath().length());
    return List.of(rest.split("/")).stream().filter(part -> !part.isEmpty()).toList();
  }

  static Map<String, Object> body(HttpExchange exchange) throws IOException {
    return Json.parseObject(
        new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
  }

  static String string(Map<String, Object> request, String field) {
    final Object value = request.get(field);
    if (!(value instanceof String text) || text.isBlank()) {
      throw new IllegalArgumentException("Field '" + field + "' is required");
    }
    return text;
  }

  static void respond(HttpExchange exchange, int status, Object body) throws IOException {
    final byte[] bytes = Json.write(body).getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().set("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, bytes.length);
    try (OutputStream out = exchange.getResponseBody()) {
      out.write(bytes);
    }
  }
}
