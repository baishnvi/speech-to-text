import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { detectLanguage, formatDate, formatDuration } from '../utils.js';

const PAGE_SIZE = 6;

export default function History({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', text: '' });
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list({ page, limit: PAGE_SIZE, search: debounced });
      setItems(res.data);
      setPagination(res.pagination);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setDraft({ title: item.title, text: item.text });
  };

  const saveEdit = async () => {
    try {
      await api.update(editingId, {
        title: draft.title,
        text: draft.text,
        language: detectLanguage(draft.text),
      });
      setEditingId(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm('Delete this transcript? This cannot be undone.')) return;
    try {
      await api.remove(item.id);
      // step back a page if we just emptied the last one
      if (items.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (e) {
      setError(e.message);
    }
  };

  const copy = async (item) => {
    await navigator.clipboard.writeText(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const addManual = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const text = String(fd.get('text') || '').trim();
    if (!text) return;
    try {
      await api.create({
        title: String(fd.get('title') || ''),
        text,
        language: detectLanguage(text),
      });
      setAdding(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="history" aria-labelledby="hist-title">
      <div className="history-head">
        <h2 id="hist-title">
          History <span className="count">{pagination.total}</span>
        </h2>
        <div className="history-tools">
          <input
            type="search"
            placeholder="Search transcripts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search transcripts"
          />
          <button className="btn" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cancel' : 'Add transcript'}
          </button>
        </div>
      </div>

      {adding && (
        <form className="card editor" onSubmit={addManual}>
          <input name="title" placeholder="Title (optional)" maxLength={200} />
          <textarea name="text" placeholder="Type or paste a transcript" rows={3} required />
          <div className="row-actions">
            <button className="btn btn-primary" type="submit">
              Save transcript
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!loading && items.length === 0 && (
        <p className="empty">
          {debounced
            ? `No transcripts match “${debounced}”.`
            : 'No transcripts yet. Record something with the mic.'}
        </p>
      )}

      <ul className="list">
        {items.map((item) => (
          <li key={item.id} className="card">
            {editingId === item.id ? (
              <div className="editor">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Title (optional)"
                  maxLength={200}
                />
                <textarea
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  rows={4}
                />
                <div className="row-actions">
                  <button className="btn" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={saveEdit}
                    disabled={!draft.text.trim()}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="meta">
                  <strong>{item.title || formatDate(item.created_at)}</strong>
                  <span>
                    {item.title ? `${formatDate(item.created_at)} · ` : ''}
                    {item.language}
                    {item.duration_seconds > 0 && ` · ${formatDuration(item.duration_seconds)}`}
                  </span>
                </div>
                <p className="text">{item.text}</p>
                <div className="row-actions">
                  <button className="btn" onClick={() => copy(item)}>
                    {copiedId === item.id ? 'Copied' : 'Copy'}
                  </button>
                  <button className="btn" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => remove(item)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {pagination.totalPages > 1 && (
        <nav className="pager" aria-label="Pagination">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="btn"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
