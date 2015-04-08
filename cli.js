#!/usr/bin/env node
'use strict'

const program = require('commander')
const triggers = require('./')

program
  .usage('[options] connection-string <table ...>')
  .version(require('./package.json').version)
  .parse(process.argv)

const db = program.args[0]
const tables = program.args.slice(1)

triggers({ db: db, tables: tables }, function (err, res) {
  if (err) throw err
  console.log(res.message)
})
