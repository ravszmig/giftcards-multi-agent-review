package com.example.giftcard.support;

import com.example.giftcard.adapter.jdbc.MigrationRunner;
import com.example.giftcard.app.GiftCardApplication;
import java.util.UUID;
import javax.sql.DataSource;

/** A fresh, migrated in-memory H2 database per call. */
public final class TestDatabase {

  private TestDatabase() {
  }

  public static String freshUrl() {
    return "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
  }

  public static DataSource migrated() {
    final DataSource dataSource = GiftCardApplication.dataSource(freshUrl());
    new MigrationRunner(dataSource).migrate();
    return dataSource;
  }
}
