-- =========================================================
-- SCHOOL MANAGEMENT SYSTEM DATABASE
-- Supports 5 schools
-- Classes: Creche to SS3
-- =========================================================


-- =========================================================
-- SCHOOLS
-- =========================================================

CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(150),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- STUDENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    student_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,

    gender VARCHAR(20),
    date_of_birth DATE,

    class_name VARCHAR(50) NOT NULL,

    parent_name VARCHAR(150),
    parent_phone VARCHAR(50),
    parent_email VARCHAR(150),

    address TEXT,

    status VARCHAR(30) DEFAULT 'Active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(school_id, student_id)
);


-- =========================================================
-- STAFF / TEACHERS
-- =========================================================

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    staff_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,

    gender VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(150),

    position VARCHAR(100),

    department VARCHAR(100),

    status VARCHAR(30) DEFAULT 'Active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(school_id, staff_id)
);


-- =========================================================
-- CLASSES
-- =========================================================

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    class_name VARCHAR(50) NOT NULL,

    class_teacher_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(school_id, class_name)
);


-- =========================================================
-- SUBJECTS
-- =========================================================

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    subject_name VARCHAR(150) NOT NULL,

    class_name VARCHAR(50) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(school_id, subject_name, class_name)
);


-- =========================================================
-- RESULTS
-- =========================================================

CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,

    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    class_name VARCHAR(50) NOT NULL,

    subject_name VARCHAR(150) NOT NULL,

    session VARCHAR(30) NOT NULL,

    term VARCHAR(30) NOT NULL,

    ca_score DECIMAL(5,2) DEFAULT 0,

    exam_score DECIMAL(5,2) DEFAULT 0,

    total_score DECIMAL(5,2) DEFAULT 0,

    grade VARCHAR(5),

    remark TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- ATTENDANCE
-- =========================================================

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,

    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    class_name VARCHAR(50) NOT NULL,

    attendance_date DATE NOT NULL,

    status VARCHAR(30) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, attendance_date)
);


-- =========================================================
-- PARENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS parents (
    id SERIAL PRIMARY KEY,

    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    full_name VARCHAR(150) NOT NULL,

    phone VARCHAR(50),

    email VARCHAR(150),

    address TEXT,

    occupation VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- FEES
-- =========================================================

CREATE TABLE IF NOT EXISTS fees (
    id SERIAL PRIMARY KEY,

    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    session VARCHAR(30) NOT NULL,

    term VARCHAR(30) NOT NULL,

    fee_type VARCHAR(100) NOT NULL,

    amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,

    balance DECIMAL(12,2) NOT NULL DEFAULT 0,

    payment_status VARCHAR(30) DEFAULT 'Pending',

    payment_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- SCHOOL SETTINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS school_settings (
    id SERIAL PRIMARY KEY,

    school_id INTEGER NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,

    school_motto VARCHAR(255),

    academic_session VARCHAR(50),

    current_term VARCHAR(50),

    principal_name VARCHAR(150),

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_students_school
ON students(school_id);

CREATE INDEX IF NOT EXISTS idx_students_class
ON students(school_id, class_name);

CREATE INDEX IF NOT EXISTS idx_staff_school
ON staff(school_id);

CREATE INDEX IF NOT EXISTS idx_classes_school
ON classes(school_id);

CREATE INDEX IF NOT EXISTS idx_subjects_school
ON subjects(school_id);

CREATE INDEX IF NOT EXISTS idx_results_school
ON results(school_id);

CREATE INDEX IF NOT EXISTS idx_results_student
ON results(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_school
ON attendance(school_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student
ON attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_parents_school
ON parents(school_id);

CREATE INDEX IF NOT EXISTS idx_fees_school
ON fees(school_id);

CREATE INDEX IF NOT EXISTS idx_fees_student
ON fees(student_id);


-- =========================================================
-- FIVE SCHOOLS
-- =========================================================

INSERT INTO schools (name)
VALUES
    ('School One'),
    ('School Two'),
    ('School Three'),
    ('School Four'),
    ('School Five')
ON CONFLICT (name) DO NOTHING;


-- =========================================================
-- CLASS LEVELS
-- CRECHE TO SS3
-- =========================================================

INSERT INTO classes (school_id, class_name)

SELECT
    s.id,
    c.class_name

FROM schools s

CROSS JOIN (
    VALUES
        ('Creche'),
        ('Nursery 1'),
        ('Nursery 2'),
        ('Nursery 3'),

        ('Primary 1'),
        ('Primary 2'),
        ('Primary 3'),
        ('Primary 4'),
        ('Primary 5'),
        ('Primary 6'),

        ('JSS 1'),
        ('JSS 2'),
        ('JSS 3'),

        ('SS 1'),
        ('SS 2'),
        ('SS 3')
) AS c(class_name)

ON CONFLICT (school_id, class_name) DO NOTHING;


-- =========================================================
-- DEFAULT SCHOOL SETTINGS
-- =========================================================

INSERT INTO school_settings (
    school_id,
    school_motto,
    academic_session,
    current_term
)

SELECT
    id,
    'Knowledge, Character and Excellence',
    '2026/2027',
    'First Term'

FROM schools

ON CONFLICT (school_id) DO NOTHING;