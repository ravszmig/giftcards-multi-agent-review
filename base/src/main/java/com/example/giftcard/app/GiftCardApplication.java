package com.example.giftcard.app;

import com.example.giftcard.adapter.jdbc.JdbcGiftCardRepository;
import com.example.giftcard.adapter.jdbc.JdbcLedgerRepository;
import com.example.giftcard.adapter.jdbc.MigrationRunner;
import com.example.giftcard.adapter.web.CardHandler;
import com.example.giftcard.adapter.web.ReportHandler;
import com.example.giftcard.adapter.web.StoreWebhookNotifier;
import com.example.giftcard.api.GiftCards;
import com.example.giftcard.domain.CardService;
import com.example.giftcard.domain.RedemptionHistory;
import com.example.giftcard.domain.RedemptionService;
import com.example.giftcard.reporting.ReportingService;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.ZoneId;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.logging.Logger;
import javax.sql.DataSource;
import org.h2.jdbcx.JdbcDataSource;

/** The composition root: builds every object, migrates the database, starts the HTTP server. */
public final class GiftCardApplication implements AutoCloseable {

  /** Reports and day boundaries use UK time. */
  public static final ZoneId ZONE = ZoneId.of("Europe/London");

  /**
   * @param port 0 picks a free port
   * @param webhook the store system's webhook, or null to send nothing
   */
  public record Config(int port, String jdbcUrl, URI webhook, Clock clock) {
  }

  private static final Logger LOG = Logger.getLogger(GiftCardApplication.class.getName());

  private final HttpServer server;
  private final ExecutorService executor;
  private final GiftCards api;

  private GiftCardApplication(HttpServer server, ExecutorService executor, GiftCards api) {
    this.server = server;
    this.executor = executor;
    this.api = api;
  }

  public static GiftCardApplication start(Config config) {
    final DataSource dataSource = dataSource(config.jdbcUrl());
    new MigrationRunner(dataSource).migrate();

    final JdbcGiftCardRepository cardRepository = new JdbcGiftCardRepository(dataSource);
    final JdbcLedgerRepository ledger = new JdbcLedgerRepository(dataSource);
    final CardService cards = new CardService(cardRepository, new SecureRandom(),
        config.clock());
    final RedemptionService redemptions = new RedemptionService(cardRepository, config.clock());
    final RedemptionHistory history = new RedemptionHistory(ledger);
    final StoreWebhookNotifier notifier = new StoreWebhookNotifier(config.webhook());

    final HttpServer server;
    try {
      server = HttpServer.create(new InetSocketAddress("127.0.0.1", config.port()), 0);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    server.createContext("/cards", new CardHandler(cards, redemptions, history, notifier));
    server.createContext("/reports", new ReportHandler(new ReportingService(ledger), ZONE));
    final ExecutorService executor = Executors.newFixedThreadPool(4);
    server.setExecutor(executor);
    server.start();
    LOG.info(() -> "Gift card service listening on port " + server.getAddress().getPort());
    return new GiftCardApplication(server, executor, new GiftCards(cards, redemptions));
  }

  public static DataSource dataSource(String jdbcUrl) {
    final JdbcDataSource dataSource = new JdbcDataSource();
    dataSource.setURL(jdbcUrl);
    dataSource.setUser("sa");
    return dataSource;
  }

  public int port() {
    return server.getAddress().getPort();
  }

  /** The in-process API, wired to the same database. */
  public GiftCards api() {
    return api;
  }

  @Override
  public void close() {
    server.stop(0);
    executor.shutdownNow();
  }

  public static void main(String[] args) {
    final String webhook = System.getenv("GIFTCARD_WEBHOOK_URL");
    start(new Config(8080, "jdbc:h2:file:./data/giftcards", webhook == null ? null
        : URI.create(webhook), Clock.systemUTC()));
  }
}
