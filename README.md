# Student Attendance Management System — Works Without Oracle

This is the corrected version of the original Student Attendance System. It retains the HTML/CSS/JavaScript interface and Node.js backend, but **uses built-in local JSON file storage rather than Oracle**. No database installation, credentials, or `.env` file is needed. It also has no third-party Node dependencies.

## Run in VS Code on Windows

1. Extract this ZIP to your Downloads folder.
2. In VS Code, choose **File → Open Folder** and select the **student-attendance-system** folder containing `server.js` and `package.json`.
3. Open **Terminal → New Terminal**.
4. Run:

   ```powershell
   npm start
   ```

5. Open **http://127.0.0.1:5000/** in your browser.

If port 5000 is busy, stop the other server with `Ctrl+C` in its terminal, or run:

```powershell
$env:PORT=5001
npm start
```

Then open http://127.0.0.1:5001/.

`npm install` is optional because there are no external dependencies. You only need Node.js 18 or newer. **Do not run the older Oracle project server at the same time**; it might still serve the old database error message.

## Features
- Add student (name and unique roll number)
- Mark Present / Absent
- View present count, absent count, percentage and latest status
- Delete student with confirmation
- Refresh student records
- Data persists after page refresh and server restart in `data/students.json`
- Duplicate roll numbers are rejected

## Test API

```powershell
npm test
```

Visit http://127.0.0.1:5000/students to see the saved student data as JSON. If no students exist yet, it returns `[]`.

## Notes
- This project is for local learning/demo use, not for multi-user use over the internet.
- Every click on Present or Absent increments a count. It does not track attendance by date.
- Keep backups of `data/students.json` if you want to preserve records.
- `data/students.json` is ignored by Git to avoid publishing student information.
- The original Oracle SQL schema is retained for reference in `database/schema.sql`, but is **not used** by this version.
