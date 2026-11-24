package com.example.giftcard.adapter.jdbc;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.jar.JarFile;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import javax.sql.DataSource;

/**
 * Applies the versioned SQL files in {@code db/migration} in version order. A file is named
 * {@code V<version>__<description>.sql}. Each applied version is recorded in
 * {@code schema_version} with the SHA-256 of the file. On every start, the checksum of each
 * applied file is compared with the recorded one, and a difference stops the start.
 */
public final class MigrationRunner {

  public record Migration(int version, String description, String sql, String checksum) {
  }

  public static final String LOCATION = "db/migration";

  private static final Pattern NAME = Pattern.compile("V(\\d+)__(\\w+)\\.sql");

  private final DataSource dataSource;
  private final String location;

  public MigrationRunner(DataSource dataSource) {
    this(dataSource, LOCATION);
  }

  public MigrationRunner(DataSource dataSource, String location) {
    this.dataSource = dataSource;
    this.location = location;
  }

  /** Applies every pending migration. Returns the versions applied by this call. */
  public List<Integer> migrate() {
    final List<Migration> migrations = load();
    try (Connection connection = dataSource.getConnection()) {
      createVersionTable(connection);
      final Map<Integer, String> applied = applied(connection);
      final List<Integer> done = new ArrayList<>();
      for (Migration migration : migrations) {
        final String recorded = applied.get(migration.version());
        if (recorded != null) {
          if (!recorded.equals(migration.checksum())) {
            throw new IllegalStateException("Checksum mismatch for applied migration V"
                + migration.version() + "__" + migration.description()
                + ": an applied migration was edited");
          }
          continue;
        }
        apply(connection, migration);
        done.add(migration.version());
      }
      return done;
    } catch (SQLException e) {
      throw new IllegalStateException("Migration failed", e);
    }
  }

  /** The migrations on the classpath, in version order. */
  public List<Migration> load() {
    final List<Migration> found = new ArrayList<>();
    for (String name : fileNames()) {
      final Matcher matcher = NAME.matcher(name);
      if (!matcher.matches()) {
        continue;
      }
      final String sql = read(location + "/" + name);
      found.add(new Migration(Integer.parseInt(matcher.group(1)), matcher.group(2), sql,
          checksum(sql)));
    }
    found.sort(Comparator.comparingInt(Migration::version));
    for (int i = 0; i < found.size(); i++) {
      if (found.get(i).version() != i + 1) {
        throw new IllegalStateException("Migration versions must run 1, 2, 3 without gaps");
      }
    }
    return found;
  }

  private static void createVersionTable(Connection connection) throws SQLException {
    try (Statement statement = connection.createStatement()) {
      statement.execute("CREATE TABLE IF NOT EXISTS schema_version ("
          + "version INT PRIMARY KEY, description VARCHAR(200) NOT NULL, "
          + "checksum VARCHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    }
  }

  private static Map<Integer, String> applied(Connection connection) throws SQLException {
    final Map<Integer, String> applied = new LinkedHashMap<>();
    try (Statement statement = connection.createStatement();
        ResultSet rows = statement.executeQuery(
            "SELECT version, checksum FROM schema_version ORDER BY version")) {
      while (rows.next()) {
        applied.put(rows.getInt(1), rows.getString(2));
      }
    }
    return applied;
  }

  private static void apply(Connection connection, Migration migration) throws SQLException {
    connection.setAutoCommit(false);
    try (Statement statement = connection.createStatement()) {
      for (String sql : migration.sql().split(";\\s*(\\r?\\n|$)")) {
        if (!sql.isBlank()) {
          statement.execute(sql);
        }
      }
      try (PreparedStatement insert = connection.prepareStatement(
          "INSERT INTO schema_version (version, description, checksum) VALUES (?, ?, ?)")) {
        insert.setInt(1, migration.version());
        insert.setString(2, migration.description());
        insert.setString(3, migration.checksum());
        insert.executeUpdate();
      }
      connection.commit();
    } catch (SQLException e) {
      connection.rollback();
      throw e;
    } finally {
      connection.setAutoCommit(true);
    }
  }

  private List<String> fileNames() {
    final URL url = MigrationRunner.class.getClassLoader().getResource(location);
    if (url == null) {
      return List.of();
    }
    try {
      if ("jar".equals(url.getProtocol())) {
        final String path = url.getPath();
        final String jar = path.substring("file:".length(), path.indexOf('!'));
        try (JarFile file = new JarFile(jar)) {
          return file.stream().map(entry -> entry.getName())
              .filter(name -> name.startsWith(location + "/"))
              .map(name -> name.substring(location.length() + 1))
              .toList();
        }
      }
      try (Stream<Path> files = Files.list(Path.of(url.toURI()))) {
        return files.map(file -> file.getFileName().toString()).toList();
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    } catch (URISyntaxException e) {
      throw new IllegalStateException(e);
    }
  }

  private static String read(String resource) {
    try (InputStream in = MigrationRunner.class.getClassLoader().getResourceAsStream(resource)) {
      return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  static String checksum(String sql) {
    try {
      final byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(sql.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
