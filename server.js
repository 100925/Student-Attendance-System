'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {createStore} = require('./db');

const PUBLIC_DIR = path.join(__dirname, 'public');
const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/script.js': ['script.js', 'text/javascript; charset=utf-8']
};

function json(res, status, data) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024) {
      const error = new Error('Request too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function createApp(store = createStore()) {
  return http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && STATIC_FILES[pathname]) {
        const [filename, contentType] = STATIC_FILES[pathname];
        const file = fs.readFileSync(path.join(PUBLIC_DIR, filename));
        res.writeHead(200, {'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff'});
        res.end(file);
        return;
      }
      if (req.method === 'GET' && pathname === '/students') {
        return json(res, 200, store.list());
      }
      if (req.method === 'POST' && pathname === '/students') {
        const body = await readJson(req);
        const name = body?.name;
        const rollNo = body?.roll_no;
        if (typeof name !== 'string' || typeof rollNo !== 'string' ||
            !name.trim() || !rollNo.trim() || name.trim().length > 100 || rollNo.trim().length > 30) {
          return json(res, 400, {message: 'Enter a name (up to 100 characters) and roll number (up to 30 characters).'});
        }
        const result = store.add(name.trim(), rollNo.trim().toUpperCase());
        if (result.error === 'duplicate') return json(res, 409, {message: 'Roll number already exists'});
        return json(res, 201, {message: 'Student added', student: result.student});
      }
      const markMatch = /^\/(present|absent)\/([^/]+)$/.exec(pathname);
      if (req.method === 'PUT' && markMatch) {
        const id = parseId(markMatch[2]);
        if (id === null) return json(res, 400, {message: 'Invalid student ID'});
        const status = markMatch[1] === 'present' ? 'Present' : 'Absent';
        if (!store.mark(id, status)) return json(res, 404, {message: 'Student not found'});
        return json(res, 200, {message: `Marked ${status.toLowerCase()}`});
      }
      const deleteMatch = /^\/students\/([^/]+)$/.exec(pathname);
      if (req.method === 'DELETE' && deleteMatch) {
        const id = parseId(deleteMatch[1]);
        if (id === null) return json(res, 400, {message: 'Invalid student ID'});
        if (!store.delete(id)) return json(res, 404, {message: 'Student not found'});
        return json(res, 200, {message: 'Student deleted'});
      }
      if (req.method === 'GET' && pathname === '/health') {
        return json(res, 200, {status: 'ok', storage: 'local JSON'});
      }
      return json(res, 404, {message: 'Page not found'});
    } catch (error) {
      console.error('Request failed:', error.message);
      if (!res.headersSent) json(res, error.status || 500, {message: error.status ? error.message : 'Could not access local student data. Check the VS Code terminal.'});
      else res.end();
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  const server = createApp();
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other server with Ctrl+C, or run: $env:PORT=5001; npm start`);
    } else {
      console.error('Cannot start server:', error.message);
    }
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log('Student Attendance Management System (no Oracle required)');
    console.log(`Open http://127.0.0.1:${port}`);
    console.log('Student records are stored in data/students.json');
  });
}

module.exports = {createApp};
