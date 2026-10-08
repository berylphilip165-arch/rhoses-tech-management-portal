const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "CHANGE_THIS_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

/*
==================================================
AUTHENTICATION
==================================================
*/

async function authenticateUser(username, password) {
  const result = await pool.query(
    `
    SELECT
      id,
      username,
      password_hash,
      role,
      school_id,
      full_name
    FROM users
    WHERE username = $1
    AND active = TRUE
    `,
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  const validPassword = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!validPassword) {
    return null;
  }

  return user;
}

/*
==================================================
AUTH MIDDLEWARE
==================================================
*/

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "You must log in first."
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "You must log in first."
    });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Rhoses Tech Admin only."
    });
  }

  next();
}

function requireStaff(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "You must log in first."
    });
  }

  if (
    req.session.user.role !== "staff" &&
    req.session.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Staff access required."
    });
  }

  next();
}

function requireParent(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "You must log in first."
    });
  }

  if (
    req.session.user.role !== "parent" &&
    req.session.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Parent access required."
    });
  }

  next();
}

/*
==================================================
LOGIN
==================================================
*/

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required."
      });
    }

    const user = await authenticateUser(username, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      school_id: user.school_id,
      full_name: user.full_name
    };

    let redirect = "/";

    if (user.role === "admin") {
      redirect = "/admin";
    }

    if (user.role === "staff") {
      redirect = "/staff";
    }

    if (user.role === "parent") {
      redirect = "/parent";
    }

    res.json({
      success: true,
      redirect
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
});

/*
==================================================
CURRENT USER
==================================================
*/

app.get("/api/me", requireLogin, (req, res) => {
  res.json({
    success: true,
    user: req.session.user
  });
});

/*
==================================================
LOGOUT
==================================================
*/

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true
    });
  });
});

/*
==================================================
ADMIN DASHBOARD
==================================================
*/

app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    const schools = await pool.query(`
      SELECT
        id,
        name,
        code,
        active
      FROM schools
      ORDER BY id
    `);

    const students = await pool.query(`
      SELECT COUNT(*) AS total
      FROM students
    `);

    const staff = await pool.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'staff'
    `);

    const parents = await pool.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'parent'
    `);

    res.json({
      success: true,
      schools: schools.rows,
      totals: {
        students: Number(students.rows[0].total),
        staff: Number(staff.rows[0].total),
        parents: Number(parents.rows[0].total)
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to load admin dashboard."
    });
  }
});

/*
==================================================
ADMIN - ALL STUDENTS
==================================================
*/

app.get("/api/admin/students", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        students.id,
        students.admission_number,
        students.first_name,
        students.last_name,
        students.class_name,
        schools.name AS school_name
      FROM students
      JOIN schools
        ON schools.id = students.school_id
      ORDER BY schools.id, students.last_name
    `);

    res.json({
      success: true,
      students: result.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to load students."
    });
  }
});

/*
==================================================
STAFF DASHBOARD
==================================================
*/

app.get("/api/staff/dashboard", requireStaff, async (req, res) => {
  try {
    const schoolId = req.session.user.school_id;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Staff account is not assigned to a school."
      });
    }

    const school = await pool.query(
      `
      SELECT id, name, code
      FROM schools
      WHERE id = $1
      `,
      [schoolId]
    );

    const students = await pool.query(
      `
      SELECT
        id,
        admission_number,
        first_name,
        last_name,
        class_name
      FROM students
      WHERE school_id = $1
      ORDER BY last_name
      `,
      [schoolId]
    );

    res.json({
      success: true,
      school: school.rows[0],
      students: students.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to load staff dashboard."
    });
  }
});

/*
==================================================
PARENT DASHBOARD
==================================================
*/

app.get("/api/parent/dashboard", requireParent, async (req, res) => {
  try {
    const parentId = req.session.user.id;

    const children = await pool.query(
      `
      SELECT
        students.id,
        students.admission_number,
        students.first_name,
        students.last_name,
        students.class_name,
        schools.name AS school_name
      FROM students
      JOIN schools
        ON schools.id = students.school_id
      JOIN parent_students
        ON parent_students.student_id = students.id
      WHERE parent_students.parent_id = $1
      `,
      [parentId]
    );

    res.json({
      success: true,
      children: children.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to load parent dashboard."
    });
  }
});

/*
==================================================
PROTECTED HTML PAGES
==================================================
*/

app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/staff", requireStaff, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "staff.html"));
});

app.get("/parent", requireParent, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "parent.html"));
});

/*
==================================================
PUBLIC LOGIN PAGE
==================================================
*/

app.use(express.static(path.join(__dirname, "public")));

/*
==================================================
BLOCK ADMIN DIRECTORY BYPASS
==================================================
*/

app.use("/admin", (req, res) => {
  res.status(403).send("Access denied.");
});

/*
==================================================
SERVER
==================================================
*/

app.listen(PORT, () => {
  console.log(`Rhoses Tech Management running on port ${PORT}`);
});
