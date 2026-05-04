import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.API_PORT || 8080);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(helmet());
app.use(cors());
app.use(express.json());

const allowedStatuses = new Set(['Saved', 'Applied', 'Interview', 'Offer', 'Rejected']);
const allowedPriorities = new Set(['Low', 'Medium', 'High']);

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Saved',
      priority TEXT NOT NULL DEFAULT 'Medium',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function normalizeApplication(input) {
  const company = String(input.company || '').trim();
  const role = String(input.role || '').trim();
  const location = String(input.location || '').trim();
  const status = String(input.status || 'Saved').trim();
  const priority = String(input.priority || 'Medium').trim();
  const notes = String(input.notes || '').trim();

  if (!company) throw new Error('Company is required.');
  if (!role) throw new Error('Role is required.');
  if (!allowedStatuses.has(status)) throw new Error('Invalid status.');
  if (!allowedPriorities.has(priority)) throw new Error('Invalid priority.');

  return { company, role, location, status, priority, notes };
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'job-tracker-api', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.get('/api/applications', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const params = [];
    let sql = 'SELECT * FROM applications';

    if (status && allowedStatuses.has(status)) {
      params.push(status);
      sql += ' WHERE status = $1';
    }

    sql += ' ORDER BY updated_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/applications', async (req, res, next) => {
  try {
    const appData = normalizeApplication(req.body);
    const result = await pool.query(
      `INSERT INTO applications (company, role, location, status, priority, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [appData.company, appData.role, appData.location, appData.status, appData.priority, appData.notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/applications/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });

    const appData = normalizeApplication(req.body);
    const result = await pool.query(
      `UPDATE applications
       SET company = $1, role = $2, location = $3, status = $4, priority = $5, notes = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [appData.company, appData.role, appData.location, appData.status, appData.priority, appData.notes, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Application not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/applications/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });

    const result = await pool.query('DELETE FROM applications WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Application not found.' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.message?.includes('required') || error.message?.includes('Invalid') ? 400 : 500;
  res.status(status).json({ error: error.message || 'Unexpected server error.' });
});

initDb()
  .then(() => app.listen(port, () => console.log(`Job Tracker API running on port ${port}`)))
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
