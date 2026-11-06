'use strict';

// Local JSON storage. No database server, account or password required.
const fs = require('node:fs');
const path = require('node:path');

function createStore(dataFile = path.join(__dirname, 'data', 'students.json')) {
  const file = path.resolve(dataFile);

  function read() {
    if (!fs.existsSync(file)) return {nextId: 1, students: []};
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      throw new Error(`Cannot read attendance data at ${file}: ${error.message}`);
    }
    // Also accept an older format containing just an array of students.
    const students = Array.isArray(raw) ? raw : raw?.students;
    if (!Array.isArray(students)) {
      throw new Error(`Invalid attendance data file: ${file}`);
    }
    const maxId = students.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0);
    const nextId = Math.max(maxId + 1, Number(raw?.nextId) || 1);
    return {nextId, students};
  }

  function write(data) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    const tmp = `${file}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, {encoding: 'utf8', mode: 0o600});
      fs.renameSync(tmp, file);
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }

  return {
    file,
    list() {
      return read().students.map(student => ({...student}));
    },
    add(name, rollNo) {
      const data = read();
      if (data.students.some(student => String(student.roll_no).toUpperCase() === rollNo)) {
        return {error: 'duplicate'};
      }
      const student = {
        id: data.nextId++, name, roll_no: rollNo,
        present_count: 0, absent_count: 0, status: 'Not Marked'
      };
      data.students.push(student);
      write(data);
      return {student};
    },
    mark(id, status) {
      const data = read();
      const student = data.students.find(student => student.id === id);
      if (!student) return false;
      const field = status === 'Present' ? 'present_count' : 'absent_count';
      student[field] = Number(student[field] || 0) + 1;
      student.status = status;
      write(data);
      return true;
    },
    delete(id) {
      const data = read();
      const index = data.students.findIndex(student => student.id === id);
      if (index === -1) return false;
      data.students.splice(index, 1);
      write(data);
      return true;
    }
  };
}

module.exports = {createStore};
