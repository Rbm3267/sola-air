# @sola-air-ui/relay

A local data proxy for [Sola AIR](https://sola-air.dev)'s `createData`/`$data` primitive. It keeps database credentials on your own machine (or server) instead of shipping them to the browser, and answers Sola components' queries over a local HTTP endpoint.

## Install

```bash
npm install @sola-air-ui/relay
```

## Configure

The relay reads `sola-relay.json` from the directory you start it in. Each entry under `connections` is a name you choose plus its settings:

```json
{
  "connections": {
    "postgres-primary": { "type": "postgres", "connectionString": "postgres://user:pass@localhost:5432/mydb" },
    "orders-db": { "type": "mysql", "host": "localhost", "user": "reader", "password": "…", "database": "shop" }
  }
}
```

`postgres` settings go to `pg`'s `Pool`, and `mysql` settings to `mysql2`'s `createPool`. Give the relay a read-only database user.

## Run

```bash
npx sola-relay --port 4040
```

`--port` is the only option (default `4040`). The relay serves `POST /api/query`, `GET /api/schema?source=…` and `GET /api/status`, which lists each connection and whether it connected.

## Supported data sources

- **PostgreSQL** (via `pg`)
- **MySQL** (via `mysql2`)
- **Google Sheets** (`type: "sheet"` with a `sheetId`): reads a sheet that is shared publicly, as CSV.

## Usage from a component

```html
<script>
  let customers = $data('postgres-primary:customers', { refresh: '30s' });
</script>

<Table rows={() => customers().data} />
```

The source is `connection:table`. `postgres-primary` is a name from `sola-relay.json`, and `customers` is a table in that database (`schema.table` works too). Connection names may use letters, digits, `_` and `-`. Table names must be plain identifiers, because they go into the query. With no `:table`, the connection name is used as the table name. `refresh` re-runs the query on that interval.

## Security note

- SQL connections run a single read-only `SELECT`; anything else gets a 400.
- Every query is appended to `sola-relay-audit.log` in the working directory.
- The relay has no authentication of its own. Run it somewhere trusted (your dev machine, or a backend service you control), and never expose its port to the public internet without your own auth layer in front of it.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
