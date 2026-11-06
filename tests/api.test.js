'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createApp} = require('../server');
const {createStore} = require('../db');

test('homepage and attendance CRUD persist to disk without Oracle', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-test-'));
  const dataFile = path.join(folder, 'data', 'students.json');
  const server = createApp(createStore(dataFile));
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (route, method = 'GET', body) => fetch(base + route, {
    method, headers: {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  try {
    const home = await send('/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Student Attendance Management System/);
    assert.equal((await send('/style.css')).status, 200);
    assert.equal((await send('/script.js')).status, 200);
    assert.deepEqual(await (await send('/students')).json(), []);
    assert.equal((await send('/students', 'POST', {name: ' ', roll_no: 'a1'})).status, 400);
    assert.equal((await send('/students', 'POST', {name: 'Test Student', roll_no: 'a1'})).status, 201);
    assert.equal((await send('/students', 'POST', {name: 'Duplicate', roll_no: 'A1'})).status, 409);
    assert.equal((await send('/present/1', 'PUT')).status, 200);
    assert.equal((await send('/present/1', 'PUT')).status, 200);
    assert.equal((await send('/absent/1', 'PUT')).status, 200);
    assert.equal((await send('/present/abc', 'PUT')).status, 400);
    assert.equal((await send('/absent/999', 'PUT')).status, 404);
    const rows = await (await send('/students')).json();
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      id: 1, name: 'Test Student', roll_no: 'A1',
      present_count: 2, absent_count: 1, status: 'Absent'
    });
    const storeAfterRestart = createStore(dataFile);
    assert.equal(storeAfterRestart.list()[0].present_count, 2);
    assert.equal((await send('/students/1', 'DELETE')).status, 200);
    assert.equal((await send('/students/1', 'DELETE')).status, 404);
    assert.deepEqual(await (await send('/students')).json(), []);
    assert.equal((await send('/students', 'POST', {name: 'Another', roll_no: 'b2'})).status, 201);
    assert.equal(createStore(dataFile).list()[0].id, 2);
    assert.equal((await send('/health')).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(folder, {recursive: true, force: true});
  }
});

test('invalid request payload returns a helpful error', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-test-'));
  const server = createApp(createStore(path.join(dir, 'students.json')));
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const invalid = await fetch(base + '/students', {method: 'POST', body: '{', headers: {'Content-Type': 'application/json'}});
    assert.equal(invalid.status, 400);
    const invalidId = await fetch(base + '/students/-4', {method: 'DELETE'});
    assert.equal(invalidId.status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
