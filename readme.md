# postgres-triggers [![Build Status](https://travis-ci.org/klaemo/postgres-triggers.svg)](https://travis-ci.org/klaemo/postgres-triggers)
[![NPM](https://nodei.co/npm/postgres-triggers.png)](https://nodei.co/npm/postgres-triggers/)

Create trigger functions for changes (INSERT, UPDATE, DELETE) in tables.
The triggers will return a JSON object with some information and the changed row.

Heavily inspired by [this blog post](https://blog.andyet.com/2015/04/06/postgres-pubsub-with-json) by [@fritzy](https://github.com/fritzy).

Because of the use of `json_build_object()` you'll need Postgres **9.4** or higher.

**This module is in its early stages. Feedback and PRs welcome!**

## Install

```
npm i [-g] postgres-triggers
```

## Usage (CLI)

```
postgres-triggers postgres://foo@localhost:5432/db table1 tbl2Name:idColumn ...
```

## Usage (API)

```javascript
const triggers = require('postgres-triggers')

triggers({
    db: 'postgres://foo@localhost:5432/db',
    // three ways of specifying table name and id column
    // default idColumn: 'id'
    tables: [
      'tbl1', 'tblName:idColumn', { name: 'tableName', id: 'idColumn'}
    ],
    channel: 'table_update' // optional
}, function(err) {
  if (err) throw err
  console.log('done')
})
```

## Trigger Payload

```
{
  table: 'table-name',
  id: 'id-of-the-change-row',
  type: 'insert|update|delete',
  row: { id: 'baz', foo: 'bar', ... }
}
```

## TODO

- allow removal of triggers

## Tests

You need to give it a database connection string to be able to run the tests.
```
POSTGRES=postgres://postgres@localhost:5432/postgres npm test
```

## License
MIT
