package com.example.giftcard.adapter.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The JSON this adapter needs and nothing more. Reads one flat object whose values are
 * strings, integers, booleans or null. Writes maps, lists, strings, numbers, booleans and null.
 */
public final class Json {

  private Json() {
  }

  public static Map<String, Object> parseObject(String text) {
    final Reader reader = new Reader(text == null ? "" : text);
    final Map<String, Object> object = reader.object();
    reader.end();
    return object;
  }

  public static String write(Object value) {
    final StringBuilder out = new StringBuilder();
    write(value, out);
    return out.toString();
  }

  private static void write(Object value, StringBuilder out) {
    switch (value) {
      case null -> out.append("null");
      case String text -> quote(text, out);
      case Number number -> out.append(number);
      case Boolean flag -> out.append(flag);
      case Map<?, ?> map -> {
        out.append('{');
        boolean first = true;
        for (Map.Entry<?, ?> entry : map.entrySet()) {
          if (!first) {
            out.append(',');
          }
          first = false;
          quote(String.valueOf(entry.getKey()), out);
          out.append(':');
          write(entry.getValue(), out);
        }
        out.append('}');
      }
      case List<?> list -> {
        out.append('[');
        for (int i = 0; i < list.size(); i++) {
          if (i > 0) {
            out.append(',');
          }
          write(list.get(i), out);
        }
        out.append(']');
      }
      default -> quote(value.toString(), out);
    }
  }

  private static void quote(String text, StringBuilder out) {
    out.append('"');
    for (char c : text.toCharArray()) {
      switch (c) {
        case '"' -> out.append("\\\"");
        case '\\' -> out.append("\\\\");
        case '\n' -> out.append("\\n");
        case '\r' -> out.append("\\r");
        case '\t' -> out.append("\\t");
        default -> {
          if (c < 0x20) {
            out.append(String.format("\\u%04x", (int) c));
          } else {
            out.append(c);
          }
        }
      }
    }
    out.append('"');
  }

  private static final class Reader {
    private final String text;
    private int at;

    Reader(String text) {
      this.text = text;
    }

    Map<String, Object> object() {
      final Map<String, Object> object = new LinkedHashMap<>();
      expect('{');
      if (peek() == '}') {
        at++;
        return object;
      }
      do {
        final String key = string();
        expect(':');
        object.put(key, value());
      } while (consume(','));
      expect('}');
      return object;
    }

    Object value() {
      final char c = peek();
      if (c == '"') {
        return string();
      }
      if (c == '-' || Character.isDigit(c)) {
        final int start = at;
        at++;
        while (at < text.length() && Character.isDigit(text.charAt(at))) {
          at++;
        }
        return Long.parseLong(text.substring(start, at));
      }
      for (String word : List.of("true", "false", "null")) {
        if (text.startsWith(word, at)) {
          at += word.length();
          return word.equals("null") ? null : Boolean.valueOf(word);
        }
      }
      throw new IllegalArgumentException("Unsupported JSON value at " + at);
    }

    String string() {
      expect('"');
      final StringBuilder out = new StringBuilder();
      while (at < text.length() && text.charAt(at) != '"') {
        char c = text.charAt(at++);
        if (c == '\\' && at < text.length()) {
          c = switch (text.charAt(at++)) {
            case 'n' -> '\n';
            case 't' -> '\t';
            case 'r' -> '\r';
            default -> text.charAt(at - 1);
          };
        }
        out.append(c);
      }
      expect('"');
      return out.toString();
    }

    char peek() {
      skipSpace();
      if (at >= text.length()) {
        throw new IllegalArgumentException("Unexpected end of JSON");
      }
      return text.charAt(at);
    }

    boolean consume(char c) {
      if (at < text.length() && peek() == c) {
        at++;
        return true;
      }
      return false;
    }

    void expect(char c) {
      if (peek() != c) {
        throw new IllegalArgumentException("Expected '" + c + "' at " + at);
      }
      at++;
    }

    void end() {
      skipSpace();
      if (at != text.length()) {
        throw new IllegalArgumentException("Trailing characters in JSON at " + at);
      }
    }

    private void skipSpace() {
      while (at < text.length() && Character.isWhitespace(text.charAt(at))) {
        at++;
      }
    }
  }
}
