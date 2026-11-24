package com.example.giftcard.domain;

/** No card has this number. The web adapter answers 404. */
public class UnknownCardException extends RuntimeException {

  public UnknownCardException(CardNumber card) {
    super("No card " + card.masked());
  }
}
