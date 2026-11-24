package com.example.giftcard.adapter.web;

import com.example.giftcard.domain.DomainRuleException;
import com.example.giftcard.domain.UnknownCardException;
import java.util.ConcurrentModificationException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Turns an exception into an HTTP status and a JSON error body. */
public final class ErrorMapper {

  public record Error(int status, String code, String message) {

    public Map<String, Object> body() {
      final Map<String, Object> body = new LinkedHashMap<>();
      body.put("error", code);
      body.put("message", message);
      return body;
    }
  }

  private static final Logger LOG = Logger.getLogger(ErrorMapper.class.getName());

  private ErrorMapper() {
  }

  public static Error map(Exception exception) {
    return switch (exception) {
      case UnknownCardException e -> new Error(404, "UNKNOWN_CARD", e.getMessage());
      case DomainRuleException e -> new Error(422, e.code(), e.getMessage());
      case IllegalArgumentException e -> new Error(400, "INVALID_REQUEST", e.getMessage());
      case ConcurrentModificationException e -> new Error(409, "CONFLICT", e.getMessage());
      default -> {
        LOG.log(Level.SEVERE, "Unhandled error", exception);
        yield new Error(500, "INTERNAL", "Internal error");
      }
    };
  }
}
