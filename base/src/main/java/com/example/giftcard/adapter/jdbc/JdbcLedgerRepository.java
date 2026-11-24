package com.example.giftcard.adapter.jdbc;

import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.EntryKind;
import com.example.giftcard.domain.LedgerEntry;
import com.example.giftcard.domain.LedgerRepository;
import com.example.giftcard.domain.Money;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.sql.DataSource;

/** The {@code ledger_entries} table, read-only. */
public final class JdbcLedgerRepository implements LedgerRepository {

  private static final String COLUMNS =
      "SELECT id, card_number, kind, amount_pence, related_entry_id, store_id, created_at "
          + "FROM ledger_entries ";

  private final DataSource dataSource;

  public JdbcLedgerRepository(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  @Override
  public Optional<LedgerEntry> find(long id) {
    return query(COLUMNS + "WHERE id = ?", id).stream().findFirst();
  }

  @Override
  public List<LedgerEntry> forCard(CardNumber card) {
    return query(COLUMNS + "WHERE card_number = ? ORDER BY created_at, id", card.value());
  }

  @Override
  public List<LedgerEntry> between(Instant from, Instant to) {
    return query(COLUMNS + "WHERE created_at >= ? AND created_at < ? ORDER BY created_at, id",
        Timestamp.from(from), Timestamp.from(to));
  }

  private List<LedgerEntry> query(String sql, Object... parameters) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement select = connection.prepareStatement(sql)) {
      for (int i = 0; i < parameters.length; i++) {
        select.setObject(i + 1, parameters[i]);
      }
      final List<LedgerEntry> entries = new ArrayList<>();
      try (ResultSet row = select.executeQuery()) {
        while (row.next()) {
          final long related = row.getLong(5);
          final Long relatedId = row.wasNull() ? null : related;
          entries.add(new LedgerEntry(row.getLong(1), new CardNumber(row.getString(2)),
              EntryKind.valueOf(row.getString(3)), Money.ofPence(row.getLong(4)),
              relatedId, row.getString(6),
              row.getTimestamp(7).toInstant()));
        }
      }
      return entries;
    } catch (SQLException e) {
      throw new IllegalStateException("Could not read the ledger", e);
    }
  }
}
