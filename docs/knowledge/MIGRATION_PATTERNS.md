# Migration patterns

Evidence: `gift-card-service`, the first commit on `main`.
Static inspection of that commit only.
Path shorthand: `M/` = `src/main/java/com/example/giftcard/`, `R/` = `src/main/resources/db/migration/`.

Read by: the Migrations reviewer. Rules carry an ID (`M-n`).

## 1. How the schema is applied

`MigrationRunner.migrate` runs on every start of the HTTP process
(`M/app/GiftCardApplication.java:55`). It reads `R/V<version>__<description>.sql` in
version order (`M/adapter/jdbc/MigrationRunner.java:84-102`), applies each version not
yet in `schema_version`, and records its SHA-256 (`M/adapter/jdbc/MigrationRunner.java:123-148`).
For every version already applied it compares the file's checksum with the recorded one,
and a difference stops the start with `Checksum mismatch for applied migration`
(`M/adapter/jdbc/MigrationRunner.java:64-71`).

| Version | File | Applied in production | Evidence |
|---|---|---|---|
| 1 | `V1__create_cards.sql` | 2024-02-19 | `R/V1__create_cards.sql:1-6` |
| 2 | `V2__create_ledger_entries.sql` | 2024-02-19 | `R/V2__create_ledger_entries.sql:1-8` |
| 3 | `V3__add_store_to_ledger_entries.sql` | 2025-09-15 | `R/V3__add_store_to_ledger_entries.sql:1-2` |

Production and staging hold live cards and ledger entries. No environment rebuilds its
database from the scripts.

## 2. Rules

- **M-1 Never edit an applied migration.** V1 to V3 are applied everywhere. Any byte change
  to them changes the checksum, and every environment then refuses to start. **CRITICAL**:
  the service is down on the next deploy, with no rollback short of reverting the file.
  A schema change is a new file with the next version.
- **M-2 Additive only.** A migration adds tables, columns or indexes. `DROP`, `TRUNCATE`,
  `RENAME` and `DELETE FROM` against a table with live data lose data. Dropping and
  recreating `cards` deletes every card and breaks the `ledger_entries` foreign key.
  **CRITICAL**.
- **M-3 Versions are contiguous.** The next file is `V4__...`. A gap stops the start
  (`M/adapter/jdbc/MigrationRunner.java:96-100`). **HIGH**.
- **M-4 A new column on a populated table is nullable or has a default.** Existing rows
  must stay valid. A `NOT NULL` column with no default fails on `cards` in production.
  **HIGH**.
- **M-5 One change per file, named for it:** `V4__add_<column>_to_<table>.sql`. **NIT**.
- **M-6 The runner splits on a semicolon at the end of a line**
  (`M/adapter/jdbc/MigrationRunner.java:127`). A semicolon inside a string literal at a line
  end splits the statement. **MEDIUM**.

## 3. Exemplar

`V3__add_store_to_ledger_entries.sql` added a nullable column and an index to a populated
table, as a new version (`R/V3__add_store_to_ledger_entries.sql:1-2`).

## 4. Checking a diff

1. List every file under `R/` that the diff adds, changes or deletes.
2. A changed or deleted V1 to V3: M-1.
3. For each added file: M-2 to M-6.
4. Code that reads a new column handles rows written before it existed, where the column
   is null.

## 5. Open questions

None.
