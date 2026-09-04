const state = {
  weekOffset: 0,
  monthYear: null,
  monthMonth: null,
};

function fmtMoney(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateBr(iso) {
  return iso.split("-").reverse().join("/");
}

// ---------- Dashboard ----------

async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  document.getElementById("dash-semana").textContent = fmtMoney(data.semana_total);
  document.getElementById("dash-mes").textContent = fmtMoney(data.mes_total);
  document.getElementById("dash-media").textContent = fmtMoney(data.media_dia);

  const variacaoEl = document.getElementById("dash-variacao");
  if (data.variacao_pct === null) {
    variacaoEl.textContent = "—";
    variacaoEl.className = "value";
  } else {
    const sinal = data.variacao_pct >= 0 ? "+" : "";
    variacaoEl.textContent = `${sinal}${data.variacao_pct.toFixed(1)}%`;
    variacaoEl.className = "value " + (data.variacao_pct > 0 ? "up" : data.variacao_pct < 0 ? "down" : "");
  }

  document.getElementById("dash-projecao").textContent = fmtMoney(data.projecao_mes);

  const chart = document.getElementById("dash-chart");
  chart.innerHTML = "";
  const max = Math.max(...data.meses.map((m) => m.total + (m.projetado || 0)), 1);
  for (const mes of data.meses) {
    const col = document.createElement("div");
    col.className = "bar-col";

    const barWrap = document.createElement("div");
    barWrap.className = "bar-wrap";

    const stack = document.createElement("div");
    stack.className = "bar-stack";
    stack.style.height = `${Math.max(((mes.total + (mes.projetado || 0)) / max) * 100, mes.total + (mes.projetado || 0) > 0 ? 4 : 0)}%`;

    if (mes.projetado > 0) {
      const previsto = document.createElement("div");
      previsto.className = "bar-seg bar-previsto";
      previsto.style.flex = mes.projetado;
      previsto.title = `Previsto: ${fmtMoney(mes.projetado)}`;
      stack.appendChild(previsto);
    }

    const gasto = document.createElement("div");
    gasto.className = "bar-seg bar-gasto";
    gasto.style.flex = mes.total > 0 ? mes.total : 0.001;
    gasto.title = `Gasto: ${fmtMoney(mes.total)}`;
    stack.appendChild(gasto);

    barWrap.appendChild(stack);

    const val = document.createElement("span");
    val.className = "bar-value";
    const totalComPrevisao = mes.total + (mes.projetado || 0);
    val.textContent = totalComPrevisao > 0 ? fmtMoney(totalComPrevisao) : "";

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = mes.label;

    col.append(val, barWrap, label);
    chart.appendChild(col);
  }

  const maiorEl = document.getElementById("dash-maior");
  if (data.maior_dia) {
    maiorEl.innerHTML = `<strong>${fmtDateBr(data.maior_dia.data)}</strong> — ${fmtMoney(data.maior_dia.valor)}`;
  } else {
    maiorEl.innerHTML = `<span class="dim">Nenhum lançamento este mês</span>`;
  }
}

// ---------- Semana ----------

async function loadWeek() {
  const grid = document.getElementById("week-grid");
  let data;
  try {
    const res = await fetch(`/api/week?offset=${state.weekOffset}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    grid.innerHTML = `<p class="error">Erro ao carregar a semana: ${err.message}</p>`;
    return;
  }

  document.getElementById("week-range").textContent =
    `${fmtDateBr(data.start)} - ${fmtDateBr(data.end)}  (Total: ${fmtMoney(data.total)})`;

  grid.innerHTML = "";

  for (const dia of data.dias) {
    const card = document.createElement("div");
    card.className = "day-card" + (dia.hoje ? " today" : "");

    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = dia.weekday;

    const dayNum = document.createElement("div");
    dayNum.className = "day-num";
    dayNum.textContent = dia.dia;

    const dayTotal = document.createElement("div");
    dayTotal.className = "day-total";
    dayTotal.textContent = dia.total > 0 ? fmtMoney(dia.total) : "";

    const list = document.createElement("div");
    list.className = "entry-list";
    for (const lanc of dia.lancamentos) {
      const row = document.createElement("div");
      row.className = "entry-row";

      const span = document.createElement("span");
      span.textContent = fmtMoney(lanc.valor);

      const del = document.createElement("button");
      del.className = "entry-del";
      del.textContent = "×";
      del.title = "Remover";
      del.addEventListener("click", async () => {
        await fetch(`/api/gasto/${lanc.id}`, { method: "DELETE" });
        await loadWeek();
        await loadDashboard();
      });

      row.append(span, del);
      list.appendChild(row);
    }

    const inputRow = document.createElement("div");
    inputRow.className = "input-row";

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.min = "0";
    input.placeholder = "R$ 0,00";

    const btn = document.createElement("button");
    btn.textContent = "Confirmar";

    const confirm = async () => {
      const valor = parseFloat(input.value);
      if (!valor || valor <= 0) return;
      await fetch("/api/gasto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dia.data, valor }),
      });
      await loadWeek();
      await loadDashboard();
    };

    btn.addEventListener("click", confirm);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirm();
    });

    inputRow.append(input, btn);

    card.append(weekday, dayNum, dayTotal, list, inputRow);
    grid.appendChild(card);
  }
}

// ---------- Mês (calendário) ----------

async function loadMonth() {
  const params = new URLSearchParams();
  if (state.monthYear) params.set("year", state.monthYear);
  if (state.monthMonth) params.set("month", state.monthMonth);

  const res = await fetch(`/api/month?${params}`);
  const data = await res.json();
  state.monthYear = data.year;
  state.monthMonth = data.month;

  document.getElementById("month-range").textContent = `${data.month_name} ${data.year}`;
  document.getElementById("month-total").innerHTML =
    `Total do mês: <strong>${fmtMoney(data.total)}</strong>`;

  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  const headRow = document.createElement("div");
  headRow.className = "calendar-row calendar-head";
  for (const label of data.weekday_labels) {
    const cell = document.createElement("div");
    cell.className = "calendar-headcell";
    cell.textContent = label;
    headRow.appendChild(cell);
  }
  cal.appendChild(headRow);

  for (const week of data.weeks) {
    const row = document.createElement("div");
    row.className = "calendar-row";
    for (const dia of week) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      if (!dia.no_mes) cell.classList.add("out-month");
      if (dia.hoje) cell.classList.add("today");

      const num = document.createElement("div");
      num.className = "cal-daynum";
      num.textContent = dia.dia;

      const val = document.createElement("div");
      val.className = "cal-value";
      val.textContent = dia.valor > 0 ? fmtMoney(dia.valor) : "";

      cell.append(num, val);
      row.appendChild(cell);
    }
    cal.appendChild(row);
  }
}

// ---------- Tabs & nav ----------

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

document.getElementById("week-prev").addEventListener("click", () => {
  state.weekOffset -= 1;
  loadWeek();
});
document.getElementById("week-next").addEventListener("click", () => {
  state.weekOffset += 1;
  loadWeek();
});

document.getElementById("month-prev").addEventListener("click", () => {
  let m = state.monthMonth - 1;
  let y = state.monthYear;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  state.monthMonth = m;
  state.monthYear = y;
  loadMonth();
});
document.getElementById("month-next").addEventListener("click", () => {
  let m = state.monthMonth + 1;
  let y = state.monthYear;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  state.monthMonth = m;
  state.monthYear = y;
  loadMonth();
});

loadDashboard();
loadWeek();
loadMonth();
