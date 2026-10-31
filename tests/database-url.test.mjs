import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {databaseUrl} from '../lib/database-url.mjs';

test('default pg aliases retain TLS verification and connection parameters', () => {
  for (const mode of ['require','prefer','verify-ca']) {
    const source = 'postgres://user:p%40ss@localhost/sample?application_name=a%2Bb&sslmode=' + mode;
    const normalized = databaseUrl(source);
    assert.equal(new URL(normalized).searchParams.get('sslmode'), 'verify-full');
    const params = url => new pg.Client({connectionString:url}).connectionParameters;
    for (const key of ['user','password','host','database','application_name','ssl']) {
      assert.deepEqual(params(normalized)[key], params(source)[key]);
    }
  }
});

test('explicit modes, local sockets and libpq compatibility pass through', () => {
  for (const suffix of ['', '?sslmode=disable', '?sslmode=verify-full', '?sslmode=require&uselibpqcompat=true']) {
    const source = 'postgres://localhost/test' + suffix;
    assert.equal(databaseUrl(source), source);
  }
  assert.equal(databaseUrl('/tmp/postgres'), '/tmp/postgres');
});
