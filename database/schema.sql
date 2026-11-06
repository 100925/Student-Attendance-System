-- Run as your application user in the XEPDB1 database.
-- For a fresh installation only; this does not migrate an existing STUDENTS table.
CREATE TABLE students (
  id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR2(100 CHAR) NOT NULL,
  roll_no VARCHAR2(30 CHAR) NOT NULL UNIQUE,
  present_count NUMBER DEFAULT 0 NOT NULL CHECK (present_count >= 0),
  absent_count NUMBER DEFAULT 0 NOT NULL CHECK (absent_count >= 0),
  status VARCHAR2(20 CHAR) DEFAULT 'Not Marked' NOT NULL
    CHECK (status IN ('Not Marked', 'Present', 'Absent'))
);
