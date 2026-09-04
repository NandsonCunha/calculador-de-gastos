import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "gastos.db"
DB_PATH.parent.mkdir(exist_ok=True)


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()

    # tabela antiga (uma linha por dia) -> migra para múltiplos lançamentos por dia
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(gastos)").fetchall()]
    if cols and "id" not in cols:
        conn.execute("ALTER TABLE gastos RENAME TO gastos_old")
        conn.execute(
            """
            CREATE TABLE gastos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                valor REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            "INSERT INTO gastos (data, valor) SELECT data, valor FROM gastos_old WHERE valor > 0"
        )
        conn.execute("DROP TABLE gastos_old")
    else:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS gastos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                valor REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )

    conn.execute("CREATE INDEX IF NOT EXISTS idx_gastos_data ON gastos(data)")
    conn.commit()
    conn.close()
