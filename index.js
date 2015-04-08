'use strict'

const pg = require('pg')
const assert = require('assert')

function buildQuery (triggers) {
  assert.equal(typeof triggers, 'string')

  return `
    CREATE OR REPLACE FUNCTION table_update_notify() RETURNS trigger AS $$
    DECLARE
      id BIGINT;
      row RECORD;
    BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        id = NEW.id;
        row = NEW;
      ELSE
        id = OLD.id;
        row = OLD;
      END IF;
      PERFORM pg_notify('table_update', json_build_object('table', TG_TABLE_NAME, 'id', id, 'type', TG_OP, 'row', row_to_json(row))::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    ${triggers}
  `
}

function buildTriggers (tables) {
  return tables.map(function(tableName) {
    return `
      DROP TRIGGER IF EXISTS ${tableName}_notify_update ON ${tableName};
      CREATE TRIGGER ${tableName}_notify_update AFTER UPDATE ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE table_update_notify();

      DROP TRIGGER IF EXISTS ${tableName}_notify_insert ON ${tableName};
      CREATE TRIGGER ${tableName}_notify_insert AFTER INSERT ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE table_update_notify();

      DROP TRIGGER IF EXISTS ${tableName}_notify_delete ON ${tableName};
      CREATE TRIGGER ${tableName}_notify_delete AFTER DELETE ON ${tableName} FOR EACH ROW EXECUTE PROCEDURE table_update_notify();
    `
  }).join('')
}

module.exports = function (opts, cb) {
  assert(Array.isArray(opts.tables), 'opts.tables should be an array.')

  pg.connect(opts.db, function(err, client, done) {
    if (err) return cb(err)

    const triggers = buildTriggers(opts.tables)
    const query = client.query(buildQuery(triggers))

    // query.on('row', function(row) {
    //   console.log(row)
    // })

    query.on('error', function(queryErr) {
      done(queryErr)
      cb(queryErr)
    })

    query.on('end', function () {
      client.end()
      cb()
    })
  })
}

module.exports.buildQuery = buildQuery
module.exports.buildTriggers = buildTriggers
