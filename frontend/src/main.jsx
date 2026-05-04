import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const emptyForm = {
  company: '',
  role: '',
  location: '',
  status: 'Saved',
  priority: 'Medium',
  notes: '',
};

function App() {
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadApplications() {
    setLoading(true);
    const query = filter === 'All' ? '' : `?status=${encodeURIComponent(filter)}`;
    const response = await fetch(`${API_URL}/api/applications${query}`);
    const data = await response.json();
    setApplications(data);
    setLoading(false);
  }

  useEffect(() => {
    loadApplications().catch(() => {
      setMessage('Could not connect to the API. Check Docker Compose or backend server.');
      setLoading(false);
    });
  }, [filter]);

  const stats = useMemo(() => {
    return applications.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: 0 }
    );
  }, [applications]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitApplication(event) {
    event.preventDefault();
    setMessage('');

    const url = editingId ? `${API_URL}/api/applications/${editingId}` : `${API_URL}/api/applications`;
    const method = editingId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      setMessage(payload?.error || 'Something went wrong.');
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    setMessage(editingId ? 'Application updated.' : 'Application added.');
    await loadApplications();
  }

  function startEditing(application) {
    setEditingId(application.id);
    setForm({
      company: application.company,
      role: application.role,
      location: application.location,
      status: application.status,
      priority: application.priority,
      notes: application.notes,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteApplication(id) {
    await fetch(`${API_URL}/api/applications/${id}`, { method: 'DELETE' });
    setMessage('Application deleted.');
    await loadApplications();
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">DevOps Portfolio Project</p>
          <h1>Cloud-Native Job Tracker</h1>
          <p className="hero-text">A full-stack app packaged with Docker, PostgreSQL, an API health check, and CI documentation.</p>
        </div>
        <div className="status-pill">API: {API_URL}</div>
      </section>

      <section className="stats-grid" aria-label="Application statistics">
        {['total', 'Saved', 'Applied', 'Interview', 'Offer', 'Rejected'].map((label) => (
          <article className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{stats[label] || 0}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <form className="panel form-panel" onSubmit={submitApplication}>
          <h2>{editingId ? 'Edit application' : 'Add application'}</h2>
          <label>
            Company
            <input name="company" value={form.company} onChange={updateForm} placeholder="Example: Shopify" required />
          </label>
          <label>
            Role
            <input name="role" value={form.role} onChange={updateForm} placeholder="Example: Junior DevOps Engineer" required />
          </label>
          <label>
            Location
            <input name="location" value={form.location} onChange={updateForm} placeholder="Ottawa / London / Remote" />
          </label>
          <div className="two-col">
            <label>
              Status
              <select name="status" value={form.status} onChange={updateForm}>
                <option>Saved</option>
                <option>Applied</option>
                <option>Interview</option>
                <option>Offer</option>
                <option>Rejected</option>
              </select>
            </label>
            <label>
              Priority
              <select name="priority" value={form.priority} onChange={updateForm}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" value={form.notes} onChange={updateForm} placeholder="Follow-up date, recruiter name, requirements..." />
          </label>
          <button type="submit">{editingId ? 'Save changes' : 'Add application'}</button>
          {editingId && <button className="secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</button>}
          {message && <p className="message" role="status">{message}</p>}
        </form>

        <section className="panel list-panel">
          <div className="list-header">
            <h2>Applications</h2>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter applications by status">
              <option>All</option>
              <option>Saved</option>
              <option>Applied</option>
              <option>Interview</option>
              <option>Offer</option>
              <option>Rejected</option>
            </select>
          </div>

          {loading ? <p>Loading applications...</p> : null}
          {!loading && applications.length === 0 ? <p>No applications yet. Add your first one.</p> : null}

          <div className="cards-list">
            {applications.map((application) => (
              <article className="application-card" key={application.id}>
                <div>
                  <h3>{application.role}</h3>
                  <p>{application.company} · {application.location || 'Location not added'}</p>
                  <p className="notes">{application.notes || 'No notes yet.'}</p>
                </div>
                <div className="card-actions">
                  <span className={`tag ${application.priority.toLowerCase()}`}>{application.priority}</span>
                  <span className="tag">{application.status}</span>
                  <button type="button" onClick={() => startEditing(application)}>Edit</button>
                  <button className="danger" type="button" onClick={() => deleteApplication(application.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
