"""Applies migrations/*.sql to DATABASE_URL, in filename order, exactly once each."""

import os
from pathlib import Path

import psycopg
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def _database_url() -> str:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


def main() -> None:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"), key=lambda p: p.name)

    with psycopg.connect(_database_url(), autocommit=True) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "  filename text PRIMARY KEY,"
            "  applied_at timestamptz NOT NULL DEFAULT now()"
            ")"
        )
        applied = {
            row[0]
            for row in conn.execute("SELECT filename FROM schema_migrations").fetchall()
        }

        for path in files:
            if path.name in applied:
                print(f"skip  {path.name} (already applied)")
                continue
            print(f"apply {path.name}")
            conn.execute(path.read_text())
            conn.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,)
            )

    print("done")


if __name__ == "__main__":
    main()
