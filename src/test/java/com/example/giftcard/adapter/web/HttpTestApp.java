package com.example.giftcard.adapter.web;

import com.example.giftcard.app.GiftCardApplication;
import com.example.giftcard.support.Clocks;
import com.example.giftcard.support.TestDatabase;
import com.example.giftcard.support.TestHttp;
import java.net.URI;

/** Starts the whole application on a free port with a fresh database. */
final class HttpTestApp implements AutoCloseable {

  final GiftCardApplication app;
  final TestHttp http;

  HttpTestApp() {
    this(null);
  }

  HttpTestApp(URI webhook) {
    app = GiftCardApplication.start(new GiftCardApplication.Config(0, TestDatabase.freshUrl(),
        webhook, Clocks.fixed()));
    http = new TestHttp(app.port());
  }

  String issue(String amount) {
    return (String) http.post("/cards", "{\"amount\":\"" + amount + "\"}").body().get("number");
  }

  @Override
  public void close() {
    app.close();
  }
}
