package com.example.giftcard.proof;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** T1-C, A-1: domain and reporting depend on nothing outside themselves and the JDK. */
class LayeringProofTest {

  private static final Pattern OUTWARD =
      Pattern.compile("com\\.example\\.giftcard\\.(adapter|app|api)\\b");

  @Test
  void domainAndReportingImportNoAdapter() throws IOException {
    final List<String> offenders;
    try (Stream<Path> files = Stream.of("domain", "reporting")
        .map(pkg -> Path.of("src/main/java/com/example/giftcard", pkg))
        .filter(Files::isDirectory)
        .flatMap(LayeringProofTest::walk)) {
      offenders = files.filter(file -> file.toString().endsWith(".java"))
          .flatMap(file -> lines(file).stream()
              .filter(line -> OUTWARD.matcher(line).find())
              .map(line -> file + ": " + line.trim()))
          .toList();
    }
    assertTrue(offenders.isEmpty(), "A-1: inward-only dependencies broken by " + offenders);
  }

  private static Stream<Path> walk(Path dir) {
    try {
      return Files.walk(dir);
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  private static List<String> lines(Path file) {
    try {
      return Files.readAllLines(file);
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }
}
