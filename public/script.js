const table = document.getElementById('studentTable');
const message = document.getElementById('message');
let busy = false;
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: {'Content-Type': 'application/json'} });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
function report(text, error = false) {
  message.textContent = text;
  message.style.color = error ? '#b91c1c' : '#166534';
}
async function loadStudents() {
  const students = await api('/students');
  table.replaceChildren();
  if (!students.length) {
    const row = table.insertRow();
    const cell = row.insertCell(); cell.colSpan = 8;
    cell.textContent = 'No students yet. Add your first student above.';
  }
  for (const student of students) {
    const row = table.insertRow();
    const present = Number(student.present_count || 0);
    const absent = Number(student.absent_count || 0);
    const percentage = present + absent ? (100 * present / (present + absent)).toFixed(2) : '0.00';
    for (const value of [student.id, student.name, student.roll_no, present, absent, `${percentage}%`, student.status || 'Not Marked']) {
      row.insertCell().textContent = value;
    }
    const actions = row.insertCell();
    for (const [label, className, action] of [
      ['Present', 'present-btn', () => markAttendance(student.id, 'present')],
      ['Absent', 'absent-btn', () => markAttendance(student.id, 'absent')],
      ['Delete', 'delete-btn', () => deleteStudent(student.id)],
    ]) {
      const button = document.createElement('button');
      button.textContent = label; button.className = className;
      button.disabled = busy; button.addEventListener('click', action);
      actions.append(button);
    }
  }
}
async function perform(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(button => button.disabled = true);
  try { await action(); }
  catch (error) { report(error.message, true); }
  finally {
    busy = false;
    document.querySelectorAll('button').forEach(button => button.disabled = false);
  }
}
async function addStudent() {
  const nameInput = document.getElementById('name');
  const rollInput = document.getElementById('roll');
  const name = nameInput.value.trim(), roll_no = rollInput.value.trim();
  if (!name || !roll_no) return report('Please enter a student name and roll number.', true);
  await perform(async () => {
    await api('/students', {method: 'POST', body: JSON.stringify({name, roll_no})});
    nameInput.value = ''; rollInput.value = '';
    report('Student saved.'); await loadStudents();
  });
}
async function markAttendance(id, status) {
  await perform(async () => {
    await api(`/${status}/${id}`, {method: 'PUT'});
    report(`Attendance marked ${status}.`); await loadStudents();
  });
}
async function deleteStudent(id) {
  if (!confirm('Delete this student and their attendance counts?')) return;
  await perform(async () => {
    await api(`/students/${id}`, {method: 'DELETE'});
    report('Student deleted.'); await loadStudents();
  });
}
function refreshStudents() { return perform(loadStudents); }
refreshStudents();
