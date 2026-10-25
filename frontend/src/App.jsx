import { useEffect, useState } from 'react';
import axios from 'axios';
import { Waves, Upload, ShieldCheck, History, BarChart3, LoaderCircle, Trash2, Image as ImageIcon } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const imageSrc = (value) => value ? `data:image/png;base64,${value}` : '';

export default function App() {
  const [page, setPage] = useState('detect');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => { if (page === 'history') loadHistory(); if (page === 'analytics') loadAnalytics(); }, [page]);

  function chooseFile(next) {
    setError(''); setResult(null);
    if (!next) return;
    if (!['image/jpeg', 'image/png'].includes(next.type)) { setError('Please choose a JPG, JPEG, or PNG image.'); return; }
    if (next.size > 20 * 1024 * 1024) { setError('Image must be 20 MB or smaller.'); return; }
    setFile(next); setPreview(URL.createObjectURL(next));
  }

  async function runDetection(event) {
    event.preventDefault();
    if (!file) { setError('Choose an image first.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const form = new FormData(); form.append('file', file);
      const response = await axios.post(`${API}/detect`, form, { timeout: 130000 });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Could not run detection. Check that the Python API and Node backend are running.');
    } finally { setBusy(false); }
  }

  async function loadHistory() {
    try { const r = await axios.get(`${API}/history`); setHistory(r.data.history || []); }
    catch (e) { setError(e.response?.data?.error || 'Could not load history. Is the backend running?'); }
  }
  async function loadAnalytics() {
    try { const r = await axios.get(`${API}/analytics`); setAnalytics(r.data); }
    catch (e) { setError(e.response?.data?.error || 'Could not load analytics. Is the backend running?'); }
  }
  async function clearHistory() {
    if (!window.confirm('Delete all detection history?')) return;
    try { await axios.delete(`${API}/history`); setHistory([]); await loadAnalytics(); }
    catch { setError('Could not clear history.'); }
  }

  const nav = [
    { id: 'detect', label: 'Detection', icon: Upload },
    { id: 'history', label: 'History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-icon"><Waves size={24}/></span><div><strong>AI SpillGuard</strong><small>Oil spill detection & segmentation</small></div></div><div className="local-badge"><span/> Local AI service</div></header>
    <div className="layout">
      <aside className="sidebar"><div className="side-label">WORKSPACE</div>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => {setError(''); setPage(item.id);}}><Icon size={18}/>{item.label}</button>; })}<div className="sidebar-note"><ShieldCheck size={20}/><strong>Private by design</strong><p>Images are processed by the AI service running on your computer.</p></div></aside>
      <main className="content">
        {error && <div className="error-box" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
        {page === 'detect' && <>
          <div className="page-heading"><div><p className="eyebrow">AI ANALYSIS</p><h1>Oil spill detection</h1><p className="muted">Upload a satellite or aerial image to generate a segmentation result.</p></div><span className="model-pill"><span/> Model API</span></div>
          <div className="main-grid">
            <section className="panel upload-panel"><div className="panel-heading"><div><h2>Input image</h2><p>JPG or PNG · Maximum 20 MB</p></div><ImageIcon size={20}/></div>
              <form onSubmit={runDetection}>
                <label className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => {e.preventDefault();setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault();setDragging(false);chooseFile(e.dataTransfer.files?.[0]);}}>
                  <input type="file" accept="image/png,image/jpeg,.jpg,.jpeg,.png" onChange={e => chooseFile(e.target.files?.[0])}/>
                  {preview ? <img className="preview-image" src={preview} alt="Selected satellite image"/> : <><span className="upload-icon"><Upload size={24}/></span><strong>Drop your image here</strong><span>or click to browse files</span></>}
                </label>
                {file && <div className="file-line"><span>{file.name}</span><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>}
                <button className="primary-button" disabled={!file || busy}>{busy ? <><LoaderCircle className="spin" size={18}/> Analysing image…</> : <><Waves size={18}/> Detect oil spill</>}</button>
              </form><p className="fine-print">The model resizes the image to 256 × 256 pixels before inference.</p>
            </section>
            <section className="panel result-panel"><div className="panel-heading"><div><h2>Detection result</h2><p>Segmentation and risk assessment</p></div><ShieldCheck size={20}/></div>
              {!result ? <div className="empty-result"><div className="empty-icon"><BarChart3 size={28}/></div><strong>Your results will appear here</strong><p>Choose an image and run detection to view the mask, probability map, and spill coverage.</p></div> : <>
                <div className="result-summary"><div><span className="metric-label">Estimated spill coverage</span><strong className="coverage">{result.spill_percentage}%</strong></div><span className={`risk-chip risk-${String(result.risk_level).toLowerCase()}`}>{result.risk_level}</span></div>
                <p className="risk-message">{String(result.risk_message).replace(/^[^A-Z]*\s*/, '')}</p>
                <div className="image-results">{[['overlay','Overlay'],['mask','Segmentation mask'],['probability_map','Probability map']].map(([key,label]) => <div className="result-image-card" key={key}><img src={imageSrc(result.images?.[key])} alt={label}/><span>{label}</span></div>)}</div>
                <a className="download-link" href={imageSrc(result.images?.mask)} download="spillguard-mask.png">Download segmentation mask</a>
              </>}
            </section>
          </div>
        </>}
        {page === 'history' && <section className="panel wide-panel"><div className="page-heading"><div><p className="eyebrow">RECORDS</p><h1>Detection history</h1><p className="muted">Past predictions saved in your local SQLite database.</p></div><button className="secondary-button" onClick={loadHistory}>Refresh</button></div>{history.length === 0 ? <div className="empty-result"><strong>No detections saved yet</strong><p>Run your first detection to create a history record.</p></div> : <><div className="table-wrap"><table><thead><tr><th>Image</th><th>Result</th><th>Risk</th><th>Coverage</th><th>Date</th></tr></thead><tbody>{history.map(row => <tr key={row.id}><td>{row.filename}</td><td>{row.result}</td><td><span className={`risk-chip risk-${String(row.risk_level).toLowerCase()}`}>{row.risk_level}</span></td><td>{Number(row.spill_percentage).toFixed(2)}%</td><td>{row.created_at}</td></tr>)}</tbody></table></div><button className="danger-button" onClick={clearHistory}><Trash2 size={16}/> Clear history</button></>}</section>}
        {page === 'analytics' && <><div className="page-heading"><div><p className="eyebrow">OVERVIEW</p><h1>Analytics</h1><p className="muted">Summary of predictions saved in the local database.</p></div><button className="secondary-button" onClick={loadAnalytics}>Refresh</button></div><div className="stat-grid">{[['Total detections',analytics?.summary?.total ?? '—'],['Spill detections',analytics?.summary?.spill_detections ?? '—'],['Clean detections',analytics?.summary?.clean_detections ?? '—'],['Average coverage',analytics ? `${Number(analytics.summary.average_spill_percentage).toFixed(2)}%` : '—']].map(([label,value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><section className="panel wide-panel"><h2>Risk distribution</h2>{!analytics || !analytics.risks?.length ? <p className="muted">No analytics available yet. Run some detections first.</p> : analytics.risks.map(item => <div className="risk-bar-row" key={item.risk_level}><span>{item.risk_level}</span><div className="bar-track"><div className="bar-fill" style={{width: `${Math.min(100, Number(item.count) / Math.max(1, Number(analytics.summary.total)) * 100)}%`}}/></div><strong>{item.count}</strong></div>)}</section></>}
        <footer>AI SpillGuard · Local development build · Verify model predictions before operational use.</footer>
      </main>
    </div>
  </div>;
}
