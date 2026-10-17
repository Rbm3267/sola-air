# @sola-air-ui/relay

A local data proxy for [Sola AIR](https://sola-air.dev)'s `createData`/`$data` primitive — keeps database credentials on your own machine (or server) instead of shipping them to the browser, and streams live query results to Sola components over a local connection.

## Install

```bash
npm install @sola-air-ui/relay
```

## Run

```bash
npx sola-relay --db postgres://user:pass@localhost:5432/mydb
```

By default this starts a local relay process that Sola's `createData()` calls connect to for real-time data sync — your Postgres/MySQL credentials never leave the process running the relay.

## Supported data sources

- **PostgreSQL** (via `pg`)
- **MySQL** (via `mysql2`)
- Live updates pushed to connected clients over WebSocket (`ws`)

## Usage from a component

```html
<script>
  let customers = $data('postgres-primary:customers', { sync: 'realtime' });
</script>

<Table rows={() => customers().data} />
```

`postgres-primary` refers to the connection alias configured when you start the relay — see `sola-relay --help` for connection/alias options.

## Security note

The relay is designed to run somewhere trusted (your dev machine, or a backend service you control) — never expose its port directly to the public internet without your own auth layer in front of it.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
