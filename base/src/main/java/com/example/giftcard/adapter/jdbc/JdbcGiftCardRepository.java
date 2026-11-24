package com.example.giftcard.adapter.jdbc;

import com.example.giftcard.domain.CardNumber;
import com.example.giftcard.domain.GiftCard;
import com.example.giftcard.domain.GiftCardRepository;
import com.example.giftcard.domain.LedgerEntry;
import com.example.giftcard.domain.Money;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.ConcurrentModificationException;
import java.util.Optional;
import javax.sql.DataSource;

/** Cards in the {@code cards} table, written together with their ledger entries. */
public final class JdbcGiftCardRepository implements GiftCardRepository {

  private final DataSource dataSource;

  public JdbcGiftCardRepository(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  @Override
  public Optional<GiftCard> find(CardNumber number) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement select = connection.prepareStatement(
            "SELECT balance_pence, issued_on, version FROM cards WHERE number = ?")) {
      select.setString(1, number.value());
      try (ResultSet row = select.executeQuery()) {
        if (!row.next()) {
          return Optional.empty();
        }
        return Optional.of(new GiftCard(number, Money.ofPence(row.getLong(1)),
            row.getDate(2).toLocalDate(), row.getInt(3)));
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Could not read card " + number.masked(), e);
    }
  }

  @Override
  public LedgerEntry create(GiftCard card, LedgerEntry issue) {
    return inTransaction(connection -> {
      try (PreparedStatement insert = connection.prepareStatement(
          "INSERT INTO cards (number, balance_pence, issued_on, version) VALUES (?, ?, ?, 0)")) {
        insert.setString(1, card.number().value());
        insert.setLong(2, card.balance().pence());
        insert.setObject(3, card.issuedOn());
        insert.executeUpdate();
      }
      return append(connection, issue);
    });
  }

  @Override
  public LedgerEntry apply(GiftCard updated, LedgerEntry entry) {
    return inTransaction(connection -> {
      try (PreparedStatement update = connection.prepareStatement(
          "UPDATE cards SET balance_pence = ?, version = version + 1 "
              + "WHERE number = ? AND version = ?")) {
        update.setLong(1, updated.balance().pence());
        update.setString(2, updated.number().value());
        update.setInt(3, updated.version());
        if (update.executeUpdate() != 1) {
          throw new ConcurrentModificationException(
              "Card " + updated.number().masked() + " changed since it was read");
        }
      }
      return append(connection, entry);
    });
  }

  private static LedgerEntry append(Connection connection, LedgerEntry entry)
      throws SQLException {
    try (PreparedStatement insert = connection.prepareStatement(
        "INSERT INTO ledger_entries (card_number, kind, amount_pence, related_entry_id, "
            + "store_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        Statement.RETURN_GENERATED_KEYS)) {
      insert.setString(1, entry.card().value());
      insert.setString(2, entry.kind().name());
      insert.setLong(3, entry.amount().pence());
      if (entry.relatedEntryId() == null) {
        insert.setNull(4, Types.BIGINT);
      } else {
        insert.setLong(4, entry.relatedEntryId());
      }
      insert.setString(5, entry.storeId());
      insert.setTimestamp(6, Timestamp.from(entry.at()));
      insert.executeUpdate();
      try (ResultSet keys = insert.getGeneratedKeys()) {
        keys.next();
        return entry.withId(keys.getLong(1));
      }
    }
  }

  private interface Work<T> {
    T run(Connection connection) throws SQLException;
  }

  private <T> T inTransaction(Work<T> work) {
    try (Connection connection = dataSource.getConnection()) {
      connection.setAutoCommit(false);
      try {
        final T result = work.run(connection);
        connection.commit();
        return result;
      } catch (SQLException | RuntimeException e) {
        connection.rollback();
        throw e;
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Could not store card change", e);
    }
  }
}
