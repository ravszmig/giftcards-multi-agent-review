package com.example.giftcard.domain;

/**
 * A request that breaks a business rule. The web adapter answers 422 with {@link #code()}.
 * Messages carry masked card numbers only.
 */
public class DomainRuleException extends RuntimeException {

  private final String code;

  public DomainRuleException(String code, String message) {
    super(message);
    this.code = code;
  }

  public String code() {
    return code;
  }
}
