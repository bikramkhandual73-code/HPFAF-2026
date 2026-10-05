// ======================================================
// HPFAF-2026 - PUBLIC HELPER
// Backend - Express + SQLite
// ======================================================

const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve HPFAF index.html and other frontend files
app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// DATABASE
// ======================================================

const db = new Database(
    path.join(__dirname, "hpfaf.db")
);

db.pragma("journal_mode = WAL");

// ======================================================
// CREATE TABLES
// ======================================================

// PROVIDERS
db.prepare(`
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    registration_id TEXT UNIQUE,

    name TEXT NOT NULL,
    address TEXT,
    type TEXT,
    doctor TEXT,
    phone TEXT,
    whatsapp TEXT,
    city TEXT,
    license TEXT,
    specialty TEXT,

    icu INTEGER DEFAULT 0,
    ccu INTEGER DEFAULT 0,
    nicu INTEGER DEFAULT 0,
    general_beds INTEGER DEFAULT 0,

    ot INTEGER DEFAULT 0,
    pathology INTEGER DEFAULT 0,
    radiology INTEGER DEFAULT 0,
    billing INTEGER DEFAULT 0,
    tpa INTEGER DEFAULT 0,

    status TEXT DEFAULT 'Pending',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();


// ======================================================
// BEDS
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER NOT NULL,

    general_total INTEGER DEFAULT 0,
    general_available INTEGER DEFAULT 0,

    icu_total INTEGER DEFAULT 0,
    icu_available INTEGER DEFAULT 0,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// BLOOD
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS blood (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER NOT NULL,

    blood_group TEXT NOT NULL,
    units INTEGER DEFAULT 0,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// MEDICINES
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER NOT NULL,

    medicine_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// REQUESTS
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER,

    patient_name TEXT,
    patient_phone TEXT,

    request_type TEXT,
    message TEXT,

    status TEXT DEFAULT 'Pending',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// PATIENT STATUS
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS patient_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER,

    patient_name TEXT,
    patient_phone TEXT,

    status TEXT,
    details TEXT,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// COSTS
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER,

    consultation REAL DEFAULT 0,
    general REAL DEFAULT 0,
    icu REAL DEFAULT 0,
    ccu REAL DEFAULT 0,
    nicu REAL DEFAULT 0,
    ot REAL DEFAULT 0,
    pathology REAL DEFAULT 0,
    radiology REAL DEFAULT 0,
    medicine REAL DEFAULT 0,
    other REAL DEFAULT 0,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// SECOND OPINION
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS second_opinions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER,

    patient_name TEXT,
    patient_phone TEXT,

    details TEXT,

    status TEXT DEFAULT 'Pending',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// GRIEVANCES
// ======================================================

db.prepare(`
CREATE TABLE IF NOT EXISTS grievances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    provider_id INTEGER,

    patient_name TEXT,
    patient_phone TEXT,

    subject TEXT,
    message TEXT,

    status TEXT DEFAULT 'Pending',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(provider_id)
    REFERENCES providers(id)
)
`).run();


// ======================================================
// HOME / ROOT
// ======================================================



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================
// API STATUS
// ======================================================

app.get("/api/status", (req, res) => {

    try {

        res.json({
            success: true,
            app: "HPFAF - Public Helper",
            project: "HPFAF-2026",
            backend: "online",
            database: "connected",
            version: "2026"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// DATABASE TEST
// ======================================================

app.get("/api/database-test", (req, res) => {

    try {

        const tables = db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
        `).all();

        res.json({
            success: true,
            database: "SQLite",
            tables: tables
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// GET APPROVED PROVIDERS
// ======================================================

app.get("/api/providers", (req, res) => {

    try {

        const providers = db.prepare(`
            SELECT *
            FROM providers
            ORDER BY id DESC
        `).all();

        res.json({
            success: true,
            providers: providers.length,providers
        });

    } catch (error) {

console.error("providers api error:",error);

        res.status(500).json({
            success: false,
            error: "Failed to load provider" 
        });

    }

});

// REGISTER PROVIDER
app.post("/api/providers", (req, res) => {
  try {
    const {
      name,
      address,
      type,
      doctor,
      phone,
      whatsapp,
      city,
      license,
      specialty,
      icu,
      ccu,
      nicu,
      general,
      ot,
      pathology,
      radiology,
      billing,
      tpa
    } = req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({
        success: false,
        error: "Provider name, address and phone are required"
      });
    }

    const duplicate = db.prepare(`
      SELECT id FROM providers
      WHERE LOWER(name) = LOWER(?)
      AND LOWER(address) = LOWER(?)
    `).get(name, address);

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: "Provider already registered"
      });
    }

    const result = db.prepare(`
      INSERT INTO providers (
        name, address, type, doctor, phone, whatsapp,
        city, license, specialty, icu, ccu, nicu,
        general, ot, pathology, radiology, billing, tpa,
        status
      )
      VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
      )
    `).run(
      name,
      address,
      type || "",
      doctor || "",
      phone,
      whatsapp || "",
      city || "",
      license || "",
      specialty || "",
      icu || 0,
      ccu || 0,
      nicu || 0,
      general || 0,
      ot || 0,
      pathology || 0,
      radiology || 0,
      billing || "",
      tpa || "",
      "Pending"
    );

    res.json({
      success: true,
      message: "Provider registered successfully",
      providerId: result.lastInsertRowid
    });

  } catch (error) {
    console.error("Provider Registration Error:", error);

    res.status(500).json({
      success: false,
      error: "Provider registration failed"
    });
  }
});


// ======================================================
// GET ALL PROVIDERS
// FOUNDER / ADMIN
// ======================================================

app.get("/api/founder/providers", (req, res) => {

    try {

        const providers = db.prepare(`
            SELECT *
            FROM providers
            ORDER BY id DESC
        `).all();

        res.json({
            success: true,
            providers: providers
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// GET SINGLE PROVIDER
// ======================================================

app.get("/api/providers/:id", (req, res) => {

    try {

        const provider = db.prepare(`
            SELECT *
            FROM providers
            WHERE id = ?
        `).get(req.params.id);

        if (!provider) {

            return res.status(404).json({
                success: false,
                error: "Provider not found"
            });

        }

        res.json({
            success: true,
            provider: provider
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// REGISTER PROVIDER
// ======================================================

app.post("/api/providers", (req, res) => {

    try {

        const {
            registration_id,
            name,
            address,
            type,
            doctor,
            phone,
            whatsapp,
            city,
            license,
            specialty,
            icu,
            ccu,
            nicu,
            general_beds,
            ot,
            pathology,
            radiology,
            billing,
            tpa
        } = req.body;


        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                error: "Provider name is required"
            });

        }


        // Duplicate provider check
        const duplicate = db.prepare(`
            SELECT id
            FROM providers
            WHERE LOWER(name) = LOWER(?)
            AND LOWER(COALESCE(address,'')) = LOWER(?)
            AND status != 'Rejected'
        `).get(
            name.trim(),
            (address || "").trim()
        );


        if (duplicate) {

            return res.status(409).json({
                success: false,
                error:
                    "A provider with the same name and address already exists."
            });

        }


        // Registration ID
        let registrationId = registration_id;

        if (!registrationId) {

            const rows = db.prepare(`
                SELECT registration_id
                FROM providers
                WHERE status != 'Rejected'
            `).all();

            const used = rows
                .map(row =>
                    Number(
                        String(row.registration_id || "")
                            .replace(/\D/g, "")
                    )
                )
                .filter(Boolean);

            let number = 1;

            while (used.includes(number)) {
                number++;
            }

            registrationId =
                "HPFAF-PRV-" +
                String(number).padStart(4, "0");
        }


        const result = db.prepare(`
            INSERT INTO providers (
                registration_id,
                name,
                address,
                type,
                doctor,
                phone,
                whatsapp,
                city,
                license,
                specialty,
                icu,
                ccu,
                nicu,
                general_beds,
                ot,
                pathology,
                radiology,
                billing,
                tpa,
                status
            )

            VALUES (
                ?,?,?,?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,?,?,?
            )
        `).run(

            registrationId,
            name.trim(),
            address || "",
            type || "Hospital",
            doctor || "",
            phone || "",
            whatsapp || "",
            city || "",
            license || "",
            specialty || "",

            Number(icu) || 0,
            Number(ccu) || 0,
            Number(nicu) || 0,
            Number(general_beds) || 0,

            Number(ot) || 0,
            Number(pathology) || 0,
            Number(radiology) || 0,
            Number(billing) || 0,
            Number(tpa) || 0,

            "Pending"
        );


        res.json({
            success: true,
            message: "Provider registered successfully",
            provider_id: result.lastInsertRowid,
            registration_id: registrationId,
            status: "Pending"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// UPDATE PROVIDER STATUS
// FOUNDER / ADMIN
// ======================================================

app.patch("/api/providers/:id/status", (req, res) => {

    try {

        const { status } = req.body;

        const allowed = [
            "Pending",
            "Approved",
            "Rejected"
        ];

        if (!allowed.includes(status)) {

            return res.status(400).json({
                success: false,
                error: "Invalid provider status"
            });

        }


        const provider = db.prepare(`
            SELECT *
            FROM providers
            WHERE id = ?
        `).get(req.params.id);


        if (!provider) {

            return res.status(404).json({
                success: false,
                error: "Provider not found"
            });

        }


        db.prepare(`
            UPDATE providers

            SET status = ?,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = ?
        `).run(
            status,
            req.params.id
        );


        res.json({
            success: true,
            message: "Provider status updated",
            provider_id: req.params.id,
            status: status
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// BED DATA
// ======================================================

app.get("/api/beds", (req, res) => {

    try {

        const beds = db.prepare(`
            SELECT
                beds.*,
                providers.name AS provider_name,
                providers.registration_id
            FROM beds

            JOIN providers
            ON providers.id = beds.provider_id

            WHERE providers.status = 'Approved'

            ORDER BY beds.updated_at DESC
        `).all();

        res.json({
            success: true,
            beds: beds
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// BLOOD DATA
// ======================================================

app.get("/api/blood", (req, res) => {

    try {

        const blood = db.prepare(`
            SELECT
                blood.*,
                providers.name AS provider_name,
                providers.registration_id
            FROM blood

            JOIN providers
            ON providers.id = blood.provider_id

            WHERE providers.status = 'Approved'

            ORDER BY blood.blood_group
        `).all();

        res.json({
            success: true,
            blood: blood
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// MEDICINE DATA
// ======================================================

app.get("/api/medicines", (req, res) => {

    try {

        const medicines = db.prepare(`
            SELECT
                medicines.*,
                providers.name AS provider_name,
                providers.registration_id
            FROM medicines

            JOIN providers
            ON providers.id = medicines.provider_id

            WHERE providers.status = 'Approved'

            ORDER BY medicines.medicine_name
        `).all();

        res.json({
            success: true,
            medicines: medicines
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ======================================================
// 404 API HANDLER
// ======================================================

app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        error: "HPFAF API route not found"
    });

});


// ======================================================
// ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {

    console.error("SERVER ERROR:", error);

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });

});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("      HPFAF-2026 PUBLIC HELPER");
    console.log("======================================");
    console.log("Backend : ONLINE");
    console.log("Database: SQLite");
    console.log("Server  : http://localhost:" + PORT);
    console.log("======================================");
    console.log("");

});