package com.example.giftcard.proof;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** T2-A, M-1 and M-2: applied migrations are byte-identical; new ones only add. */
class AppliedMigrationsProofTest {

  private static final Path DIR = Path.of("src/main/resources/db/migration");

  // SHA-256 of each file at the fixture's base commit: what production recorded when it
  // applied them (MIGRATION_PATTERNS.md, M-1).
  private static final Map<String, String> APPLIED = Map.of(
      "V1__create_cards.sql",
      "344b62adb1bbb60eb3f4d6891541ac3db9a81f5b75bfb993f1ee4e3fa0a4ac33",
      "V2__create_ledger_entries.sql",
      "0f2ee3b01a9145f18da4af34dc1bf1988d85d94f1d63ba5744cf8ebae8e73c1e",
      "V3__add_store_to_ledger_entries.sql",
      "b5ebc7f6b992af2c301eab4979f9a1836192e4af41a5ffbf1c92da100698040d");

  private static final Pattern DESTRUCTIVE =
      Pattern.compile("\\b(DROP|TRUNCATE|RENAME)\\b|\\bDELETE\\s+FROM\\b", Pattern.CASE_INSENSITIVE);

  @Test
  void appliedMigrationsAreUnchangedAndNewOnesOnlyAdd() throws IOException {
    for (Map.Entry<String, String> applied : APPLIED.entrySet()) {
      assertEquals(applied.getValue(), sha256(Files.readString(DIR.resolve(applied.getKey()))),
          "M-1: applied migration " + applied.getKey() + " was edited; production refuses to start");
    }
    final List<Path> added;
    try (Stream<Path> files = Files.list(DIR)) {
      added = files.filter(f -> !APPLIED.containsKey(f.getFileName().toString())).toList();
    }
    for (Path file : added) {
      assertTrue(!DESTRUCTIVE.matcher(Files.readString(file)).find(),
          "M-2: " + file.getFileName() + " destroys data");
    }
    assertTrue(added.stream().anyMatch(f -> read(f).toLowerCase().contains("expires_on")),
        "M-1: no new migration adds expires_on: " + added);
  }

  private static String read(Path file) {
    try {
      return Files.readString(file);
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  private static String sha256(String text) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(text.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
