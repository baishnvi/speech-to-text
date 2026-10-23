import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');
  return id;
}

/** Validates body fields. `partial` = PUT (fields optional). */
function validate(body, { partial = false } = {}) {
  const out = {};
  const { text, title, language, duration_seconds } = body ?? {};

  if (text !== undefined || !partial) {
    if (typeof text !== 'string' || !text.trim())
      throw new HttpError(400, 'text is required');
    if (text.length > 20000)
      throw new HttpError(400, 'text must be at most 20000 characters');
    out.text = text.trim();
  }
  if (title !== undefined) {
    if (typeof title !== 'string' || title.length > 200)
      throw new HttpError(400, 'title must be a string up to 200 characters');
    out.title = title.trim();
  }
  if (language !== undefined) {
    if (typeof language !== 'string' || language.length > 50)
      throw new HttpError(400, 'language must be a string up to 50 characters');
    out.language = language.trim();
  }
  if (duration_seconds !== undefined) {
    const d = Number(duration_seconds);
    if (!Number.isInteger(d) || d < 0)
      throw new HttpError(400, 'duration_seconds must be a non-negative integer');
    out.duration_seconds = d;
  }
  return out;
}

// LIST  GET /api/transcriptions?page=1&limit=10&search=hello
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || '').trim();
    const offset = (page - 1) * limit;

    const where = search ? 'WHERE text ILIKE $1 OR title ILIKE $1' : '';
    const params = search ? [`%${search}%`] : [];

    const count = await query(
      `SELECT COUNT(*)::int AS total FROM transcriptions ${where}`,
      params
    );
    const rows = await query(
      `SELECT * FROM transcriptions ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = count.rows[0].total;
    res.json({
      data: rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// READ  GET /api/transcriptions/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await query('SELECT * FROM transcriptions WHERE id = $1', [id]);
    if (!rows[0]) throw new HttpError(404, 'Transcription not found');
    res.json(rows[0]);
  })
);

// CREATE  POST /api/transcriptions
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const v = validate(req.body);
    const { rows } = await query(
      `INSERT INTO transcriptions (title, text, language, duration_seconds)
       VALUES ($1, $2, COALESCE($3, 'Multilingual'), COALESCE($4, 0))
       RETURNING *`,
      [v.title ?? '', v.text, v.language ?? null, v.duration_seconds ?? null]
    );
    res.status(201).json(rows[0]);
  })
);

// UPDATE  PUT /api/transcriptions/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const v = validate(req.body, { partial: true });
    const { rows } = await query(
      `UPDATE transcriptions SET
         title = COALESCE($1, title),
         text = COALESCE($2, text),
         language = COALESCE($3, language),
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [v.title ?? null, v.text ?? null, v.language ?? null, id]
    );
    if (!rows[0]) throw new HttpError(404, 'Transcription not found');
    res.json(rows[0]);
  })
);

// DELETE  DELETE /api/transcriptions/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { rowCount } = await query('DELETE FROM transcriptions WHERE id = $1', [id]);
    if (!rowCount) throw new HttpError(404, 'Transcription not found');
    res.status(204).end();
  })
);

export default router;
