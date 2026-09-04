import calendar
from datetime import date, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .db import get_conn, init_db

app = FastAPI(title="Contador de Gastos")

init_db()

WEEKDAY_LABELS = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
]
WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]


class GastoIn(BaseModel):
    data: str
    valor: float


def week_start(d: date) -> date:
    offset = (d.weekday() + 1) % 7
    return d - timedelta(days=offset)


def get_entries(date_from: str, date_to: str) -> dict[str, list[dict]]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, data, valor FROM gastos WHERE data BETWEEN ? AND ? ORDER BY id",
        (date_from, date_to),
    ).fetchall()
    conn.close()
    by_day: dict[str, list[dict]] = {}
    for r in rows:
        by_day.setdefault(r["data"], []).append({"id": r["id"], "valor": r["valor"]})
    return by_day


def get_totals(date_from: str, date_to: str) -> dict[str, float]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT data, SUM(valor) as total FROM gastos WHERE data BETWEEN ? AND ? GROUP BY data",
        (date_from, date_to),
    ).fetchall()
    conn.close()
    return {r["data"]: r["total"] for r in rows}


def month_bounds(year: int, month: int) -> tuple[date, date]:
    n_days = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, n_days)


def sum_range(date_from: str, date_to: str) -> float:
    conn = get_conn()
    row = conn.execute(
        "SELECT COALESCE(SUM(valor), 0) as total FROM gastos WHERE data BETWEEN ? AND ?",
        (date_from, date_to),
    ).fetchone()
    conn.close()
    return row["total"]


@app.get("/api/week")
def api_week(offset: int = 0):
    today = date.today()
    start = week_start(today) + timedelta(weeks=offset)
    days = [start + timedelta(days=i) for i in range(7)]
    date_strs = [d.isoformat() for d in days]
    entries = get_entries(date_strs[0], date_strs[-1])

    result = []
    total = 0.0
    for i, d in enumerate(days):
        iso = d.isoformat()
        day_entries = entries.get(iso, [])
        day_total = sum(e["valor"] for e in day_entries)
        total += day_total
        result.append(
            {
                "data": iso,
                "dia": d.day,
                "weekday": WEEKDAY_LABELS[i],
                "lancamentos": day_entries,
                "total": day_total,
                "hoje": d == today,
            }
        )

    return {
        "start": date_strs[0],
        "end": date_strs[-1],
        "dias": result,
        "total": total,
    }


@app.get("/api/month")
def api_month(year: int | None = None, month: int | None = None):
    today = date.today()
    year = year or today.year
    month = month or today.month

    first_day, last_day = month_bounds(year, month)
    grid_start = week_start(first_day)
    grid_end = week_start(last_day) + timedelta(days=6)

    n_weeks = ((grid_end - grid_start).days + 1) // 7
    totals = get_totals(grid_start.isoformat(), grid_end.isoformat())

    weeks = []
    cursor = grid_start
    for _ in range(n_weeks):
        week = []
        for i in range(7):
            iso = cursor.isoformat()
            week.append(
                {
                    "data": iso,
                    "dia": cursor.day,
                    "weekday": WEEKDAY_SHORT[i],
                    "valor": totals.get(iso, 0),
                    "hoje": cursor == today,
                    "no_mes": cursor.month == month,
                }
            )
            cursor += timedelta(days=1)
        weeks.append(week)

    month_total = sum_range(first_day.isoformat(), last_day.isoformat())

    return {
        "year": year,
        "month": month,
        "month_name": MONTH_NAMES[month - 1],
        "weekday_labels": WEEKDAY_SHORT,
        "weeks": weeks,
        "total": month_total,
    }


@app.post("/api/gasto")
def add_gasto(gasto: GastoIn):
    if gasto.valor <= 0:
        raise HTTPException(400, "Valor deve ser maior que zero")
    conn = get_conn()
    cur = conn.execute(
        "INSERT INTO gastos (data, valor) VALUES (?, ?)", (gasto.data, gasto.valor)
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"ok": True, "id": new_id}


@app.delete("/api/gasto/{gasto_id}")
def delete_gasto(gasto_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM gastos WHERE id = ?", (gasto_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/api/dashboard")
def api_dashboard():
    today = date.today()

    start = week_start(today)
    week_total = sum_range(start.isoformat(), (start + timedelta(days=6)).isoformat())

    first_day, last_day = month_bounds(today.year, today.month)
    month_total = sum_range(first_day.isoformat(), last_day.isoformat())

    days_elapsed = (today - first_day).days + 1
    avg_per_day = month_total / days_elapsed if days_elapsed else 0

    # últimos 6 meses (incluindo o atual)
    meses = []
    y, m = today.year, today.month
    for i in range(5, -1, -1):
        mm = m - i
        yy = y
        while mm < 1:
            mm += 12
            yy -= 1
        f, l = month_bounds(yy, mm)
        total = sum_range(f.isoformat(), l.isoformat())
        meses.append({"year": yy, "month": mm, "label": MONTH_NAMES[mm - 1][:3], "total": total, "projetado": 0})

    dias_no_mes = (last_day - first_day).days + 1
    dias_restantes = max(dias_no_mes - days_elapsed, 0)
    projecao_resto = avg_per_day * dias_restantes
    projecao_mes = month_total + projecao_resto
    meses[-1]["projetado"] = projecao_resto

    mes_atual_total = meses[-1]["total"]
    mes_anterior_total = meses[-2]["total"] if len(meses) > 1 else 0
    if mes_anterior_total > 0:
        variacao_pct = ((mes_atual_total - mes_anterior_total) / mes_anterior_total) * 100
    else:
        variacao_pct = None

    # dia de maior gasto no mês atual
    totals_mes = get_totals(first_day.isoformat(), last_day.isoformat())
    maior_dia = None
    if totals_mes:
        data_max = max(totals_mes, key=totals_mes.get)
        maior_dia = {"data": data_max, "valor": totals_mes[data_max]}

    return {
        "hoje": today.isoformat(),
        "semana_total": week_total,
        "mes_total": month_total,
        "mes_anterior_total": mes_anterior_total,
        "variacao_pct": variacao_pct,
        "media_dia": avg_per_day,
        "maior_dia": maior_dia,
        "dias_restantes": dias_restantes,
        "projecao_resto": projecao_resto,
        "projecao_mes": projecao_mes,
        "meses": meses,
    }


app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
