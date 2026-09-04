# Calculador de Gastos

Aplicação web simples para registrar e acompanhar gastos diários, com visualização por semana, calendário mensal e um dashboard com totais, médias e projeção de gastos do mês.

## Funcionalidades

- Registro de múltiplos lançamentos por dia
- Visão semanal com navegação entre semanas
- Calendário mensal com totais por dia
- Dashboard com:
  - total da semana e do mês
  - variação em relação ao mês anterior
  - média de gasto por dia
  - dia de maior gasto no mês
  - projeção de gasto para o fim do mês
  - histórico dos últimos 6 meses

## Stack

- **Backend:** FastAPI + SQLite
- **Frontend:** HTML/CSS/JS estáticos servidos pelo próprio backend
- **Deploy:** Docker / Docker Compose

## Como rodar

### Com Docker Compose

```bash
docker compose up --build
```

A aplicação fica disponível em `http://localhost:8001`.

Os dados ficam persistidos em `./app/data`.

### Local (sem Docker)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

A aplicação fica disponível em `http://localhost:8000`.

## Estrutura

```
app/
  main.py           # rotas da API e lógica de agregação
  db.py             # conexão e schema do SQLite
  static/           # frontend (HTML/CSS/JS)
Dockerfile
docker-compose.yml
requirements.txt
```

## API

| Método | Rota                | Descrição                              |
|--------|---------------------|-----------------------------------------|
| GET    | `/api/week`         | Lançamentos e totais da semana          |
| GET    | `/api/month`         | Calendário mensal com totais por dia    |
| GET    | `/api/dashboard`    | Métricas e projeções do mês             |
| POST   | `/api/gasto`        | Cria um lançamento (`data`, `valor`)    |
| DELETE | `/api/gasto/{id}`   | Remove um lançamento                    |
