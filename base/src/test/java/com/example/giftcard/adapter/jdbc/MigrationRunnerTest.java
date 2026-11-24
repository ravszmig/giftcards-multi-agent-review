package com.example.giftcard.adapter.jdbc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.giftcard.app.GiftCardApplication;
import com.example.giftcard.support.TestDatabase;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class MigrationRunnerTest {

  private final DataSource db = GiftCardApplication.dataSource(TestDatabase.freshUrl());

  @Test
  void appliesEveryVersionInOrderAndRecordsItsChecksum() throws SQLException {
    final List<Integer> applied = new MigrationRunner(db).migrate();
    assertEquals(List.of(1, 2, 3), applied.subList(0, 3));
    final List<String> rows = new ArrayList<>();
    try (Connection connection = db.getConnection();
        Statement statement = connection.createStatement();
        ResultSet result = statement.executeQuery(
            "SELECT version, description, checksum FROM schema_version ORDER BY version")) {
      while (result.next()) {
        rows.add(result.getInt(1) + " " + result.getString(2));
        assertEquals(64, result.getString(3).length());
      }
    }
    assertEquals(applied.size(), rows.size());
    assertEquals(List.of("1 create_cards", "2 create_ledger_entries",
        "3 add_store_to_ledger_entries"), rows.subList(0, 3));
  }

  @Test
  void aSecondRunAppliesNothing() {
    new MigrationRunner(db).migrate();
    assertEquals(List.of(), new MigrationRunner(db).migrate());
  }

  @Test
  void anEditedAppliedMigrationStopsTheStart() throws SQLException {
    new MigrationRunner(db).migrate();
    try (Connection connection = db.getConnection();
        Statement statement = connection.createStatement()) {
      statement.executeUpdate("UPDATE schema_version SET checksum = 'edited' WHERE version = 2");
    }
    final IllegalStateException e = assertThrows(IllegalStateException.class,
        () -> new MigrationRunner(db).migrate());
    assertTrue(e.getMessage().contains("V2__create_ledger_entries"), e.getMessage());
  }

}
