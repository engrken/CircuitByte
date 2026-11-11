import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {databaseUrl,runtimeDatabaseUrl,migrationDatabaseUrl} from '../lib/database-url.mjs';

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

test('production uses a restricted runtime connection and a separate direct migration connection',()=>{
 const runtime='postgres://restricted@localhost/test?sslmode=verify-full';
 const migration='postgres://owner@localhost/test?sslmode=verify-full';
 const env={VERCEL_ENV:'production',CIRCUITBYTE_RUNTIME_DATABASE_URL:runtime,circuitbyte_DATABASE_URL_UNPOOLED:migration};
 assert.equal(runtimeDatabaseUrl(env),runtime);
 assert.equal(migrationDatabaseUrl(env),migration);
 assert.throws(()=>runtimeDatabaseUrl({...env,CIRCUITBYTE_RUNTIME_DATABASE_URL:undefined}),/runtime database/);
});

test('Vercel previews require their own explicitly configured database',()=>{
 const owner='postgres://owner@localhost/production';
 const preview='postgres://preview@localhost/synthetic';
 const env={VERCEL_ENV:'preview',DATABASE_URL:owner,circuitbyte_DATABASE_URL:owner,CIRCUITBYTE_RUNTIME_DATABASE_URL:owner};
 assert.throws(()=>runtimeDatabaseUrl(env),/Preview database/);
 assert.equal(runtimeDatabaseUrl({...env,CIRCUITBYTE_PREVIEW_DATABASE_URL:preview}),preview);
});
