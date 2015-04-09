'use strict'

const pg = require('pg')
const assert = require('assert')

function buildQuery (triggers, opts = {}) {
  opts.channel = typeof opts.channel === 'string' ? opts.channel : 'table_update'
  assert.equal(typeof triggers, 'string')

  return `
    CREATE OR REPLACE FUNCTION table_update_notify() RETURNS trigger AS $$
    DECLARE
      id BIGINT;
      row RECORD;
    BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        EXECUTE 'SELECT ($1).' || TG_ARGV[0] INTO id USING NEW;
        row = NEW;
      ELSE
        EXECUTE 'SELECT ($1).' || TG_ARGV[0] INTO id USING OLD;
        row = OLD;
      END IF;
      PERFORM pg_notify('${opts.channel}', json_build_object('table', TG_TABLE_NAME, 'id', id, 'type', lower(TG_OP), 'row', row_to_json(row))::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    ${triggers}
  `
}

function parseTables (tables) {
  // tableName:idColumn -> { name: 'tableName', id: 'idColumn' }
  return tables.map(function (table) {
    if (typeof table === 'string') {
      let split = table.split(':')
      return { name: split[0], id: split[1] || 'id' }
    } else {
      return table
    }
  })
}

function buildTriggers (tables) {
  return parseTables(tables).map(function(table) {
    return `
      DROP TRIGGER IF EXISTS ${table.name}_notify_update ON ${table.name};
      CREATE TRIGGER ${table.name}_notify_update AFTER UPDATE ON ${table.name} FOR EACH ROW EXECUTE PROCEDURE table_update_notify('${table.id}');

      DROP TRIGGER IF EXISTS ${table.name}_notify_insert ON ${table.name};
      CREATE TRIGGER ${table.name}_notify_insert AFTER INSERT ON ${table.name} FOR EACH ROW EXECUTE PROCEDURE table_update_notify('${table.id}');

      DROP TRIGGER IF EXISTS ${table.name}_notify_delete ON ${table.name};
      CREATE TRIGGER ${table.name}_notify_delete AFTER DELETE ON ${table.name} FOR EACH ROW EXECUTE PROCEDURE table_update_notify('${table.id}');
    `
  }).join('')
}

module.exports = function (opts, cb) {
  assert(Array.isArray(opts.tables), 'opts.tables should be an array.')
  assert.ok(opts.db, 'need db connection string')

  // nothing to do
  if (!opts.tables.length) return cb(null, { message: 'nothing to do' })

  pg.connect(opts.db, function(err, client, done) {
    if (err) return cb(err)

    const triggers = buildTriggers(opts.tables)
    const query = client.query(buildQuery(triggers, opts))

    // query.on('row', function(row) {
    //   console.log(row)
    // })

    query.on('error', function(queryErr) {
      done(queryErr)
      cb(queryErr)
    })

    query.on('end', function () {
      client.end()
      cb(null, { message: 'done' })
    })
  })
}

module.exports.buildQuery = buildQuery
module.exports.buildTriggers = buildTriggers
