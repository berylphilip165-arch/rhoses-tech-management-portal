const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8158;

// ======================================================
// DATABASE CONNECTION
// ======================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// DATABASE TEST
// ======================================================

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "School Management System is running",
            database: "Connected",
            time: result.rows[0].now
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});


// ======================================================
// GET ALL SCHOOLS
// ======================================================

app.get("/api/schools", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT *
            FROM schools
            ORDER BY id ASC
        `);

        res.json({
            success: true,
            schools: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load schools"
        });

    }

});


// ======================================================
// GET ONE SCHOOL
// ======================================================

app.get("/api/schools/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM schools
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "School not found"
            });

        }

        res.json({
            success: true,
            school: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load school"
        });

    }

});


// ======================================================
// ADD SCHOOL
// ======================================================

app.post("/api/schools", async (req, res) => {

    try {

        const {
            name,
            address,
            phone,
            email
        } = req.body;

        if (!name) {

            return res.status(400).json({
                success: false,
                message: "School name is required"
            });

        }

        const result = await pool.query(`
            INSERT INTO schools
            (name, address, phone, email)

            VALUES
            ($1, $2, $3, $4)

            RETURNING *
        `, [
            name,
            address || null,
            phone || null,
            email || null
        ]);

        res.status(201).json({
            success: true,
            school: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to create school"
        });

    }

});


// ======================================================
// GET SCHOOL DASHBOARD
// ======================================================

app.get("/api/schools/:schoolId/dashboard", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const students = await pool.query(`
            SELECT COUNT(*)::int AS total
            FROM students
            WHERE school_id = $1
        `, [schoolId]);

        const staff = await pool.query(`
            SELECT COUNT(*)::int AS total
            FROM staff
            WHERE school_id = $1
        `, [schoolId]);

        const classes = await pool.query(`
            SELECT COUNT(*)::int AS total
            FROM classes
            WHERE school_id = $1
        `, [schoolId]);

        const parents = await pool.query(`
            SELECT COUNT(*)::int AS total
            FROM parents
            WHERE school_id = $1
        `, [schoolId]);

        res.json({
            success: true,

            dashboard: {
                students: students.rows[0].total,
                staff: staff.rows[0].total,
                classes: classes.rows[0].total,
                parents: parents.rows[0].total
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load dashboard"
        });

    }

});


// ======================================================
// GET SCHOOL CLASSES
// ======================================================

app.get("/api/schools/:schoolId/classes", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM classes
            WHERE school_id = $1
            ORDER BY id ASC
        `, [schoolId]);

        res.json({
            success: true,
            classes: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load classes"
        });

    }

});


// ======================================================
// GET STUDENTS
// ======================================================

app.get("/api/schools/:schoolId/students", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM students
            WHERE school_id = $1
            ORDER BY id DESC
        `, [schoolId]);

        res.json({
            success: true,
            students: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load students"
        });

    }

});


// ======================================================
// ADD STUDENT
// ======================================================

app.post("/api/schools/:schoolId/students", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const {
            student_id,
            first_name,
            middle_name,
            last_name,
            gender,
            date_of_birth,
            class_name,
            parent_name,
            parent_phone,
            parent_email,
            address
        } = req.body;

        if (
            !student_id ||
            !first_name ||
            !last_name ||
            !class_name
        ) {

            return res.status(400).json({
                success: false,
                message: "Student ID, name and class are required"
            });

        }

        const result = await pool.query(`
            INSERT INTO students (

                school_id,
                student_id,
                first_name,
                middle_name,
                last_name,
                gender,
                date_of_birth,
                class_name,
                parent_name,
                parent_phone,
                parent_email,
                address

            )

            VALUES (

                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12

            )

            RETURNING *
        `, [

            schoolId,
            student_id,
            first_name,
            middle_name || null,
            last_name,
            gender || null,
            date_of_birth || null,
            class_name,
            parent_name || null,
            parent_phone || null,
            parent_email || null,
            address || null

        ]);

        res.status(201).json({
            success: true,
            student: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to add student"
        });

    }

});


// ======================================================
// DELETE STUDENT
// ======================================================

app.delete("/api/schools/:schoolId/students/:studentId", async (req, res) => {

    try {

        const {
            schoolId,
            studentId
        } = req.params;

        const result = await pool.query(`
            DELETE FROM students

            WHERE
                id = $1
                AND school_id = $2

            RETURNING *
        `, [
            studentId,
            schoolId
        ]);

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        }

        res.json({
            success: true,
            message: "Student deleted successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to delete student"
        });

    }

});


// ======================================================
// GET SCHOOL STAFF
// ======================================================

app.get("/api/schools/:schoolId/staff", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM staff
            WHERE school_id = $1
            ORDER BY id DESC
        `, [schoolId]);

        res.json({
            success: true,
            staff: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load staff"
        });

    }

});


// ======================================================
// ADD STAFF
// ======================================================

app.post("/api/schools/:schoolId/staff", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const {
            staff_id,
            full_name,
            gender,
            phone,
            email,
            position,
            department
        } = req.body;

        if (!staff_id || !full_name) {

            return res.status(400).json({
                success: false,
                message: "Staff ID and full name are required"
            });

        }

        const result = await pool.query(`
            INSERT INTO staff (

                school_id,
                staff_id,
                full_name,
                gender,
                phone,
                email,
                position,
                department

            )

            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8
            )

            RETURNING *
        `, [

            schoolId,
            staff_id,
            full_name,
            gender || null,
            phone || null,
            email || null,
            position || null,
            department || null

        ]);

        res.status(201).json({
            success: true,
            staff: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to add staff"
        });

    }

});


// ======================================================
// GET SCHOOL PARENTS
// ======================================================

app.get("/api/schools/:schoolId/parents", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM parents
            WHERE school_id = $1
            ORDER BY id DESC
        `, [schoolId]);

        res.json({
            success: true,
            parents: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load parents"
        });

    }

});


// ======================================================
// GET SCHOOL RESULTS
// ======================================================

app.get("/api/schools/:schoolId/results", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM results
            WHERE school_id = $1
            ORDER BY id DESC
        `, [schoolId]);

        res.json({
            success: true,
            results: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load results"
        });

    }

});


// ======================================================
// GET SCHOOL ATTENDANCE
// ======================================================

app.get("/api/schools/:schoolId/attendance", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM attendance
            WHERE school_id = $1
            ORDER BY attendance_date DESC
        `, [schoolId]);

        res.json({
            success: true,
            attendance: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load attendance"
        });

    }

});


// ======================================================
// GET SCHOOL FEES
// ======================================================

app.get("/api/schools/:schoolId/fees", async (req, res) => {

    try {

        const { schoolId } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM fees
            WHERE school_id = $1
            ORDER BY id DESC
        `, [schoolId]);

        res.json({
            success: true,
            fees: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load fees"
        });

    }

});


// ======================================================
// FRONTEND FALLBACK
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log(`
========================================
 SCHOOL MANAGEMENT SYSTEM
========================================

 Server running on port: ${PORT}

 Local:
 http://localhost:${PORT}

========================================
`);

});