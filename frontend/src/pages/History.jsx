import {useEffect,useMemo,useState} from 'react';
import {Search,Trash2} from 'lucide-react';
import {deleteHistory,fetchHistory} from '../services/api.js';
import SeverityBadge,{severityLabel} from '../components/SeverityBadge.jsx';
import StateMessage from '../components/StateMessage.jsx';
export default function HistoryPage(){
 const [history,setHistory]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[severity,setSeverity]=useState('all');
 async function loadHistory(){setLoading(true);try{setHistory(await fetchHistory());setError('')}catch(err){setError(err.response?.data?.error||'Could not load history. Is the backend running?')}finally{setLoading(false)}}
 useEffect(()=>{loadHistory()},[]);
 const filtered=useMemo(()=>history.filter(row=>String(row.filename||'').toLowerCase().includes(search.toLowerCase())&&(severity==='all'||severityLabel(row.risk_level).toLowerCase()===severity)),[history,search,severity]);
 async function clearHistory(){if(!window.confirm('Delete all detection history?'))return;try{await deleteHistory();setHistory([])}catch{setError('Could not clear history.')}}
 return <><StateMessage error={error} onDismiss={()=>setError('')}/><section className="panel wide-panel"><div className="page-heading"><div><p className="eyebrow">RECORDS</p><h1>Detection history</h1><p className="muted">Past predictions saved in your local SQLite database.</p></div><button className="secondary-button" onClick={loadHistory} disabled={loading}>{loading?'Loading…':'Refresh'}</button></div>
 <div className="filters-row"><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by filename"/></label><select value={severity} onChange={e=>setSeverity(e.target.value)} aria-label="Filter by severity"><option value="all">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
 {loading?<div className="empty-result"><strong>Loading history…</strong></div>:!filtered.length?<div className="empty-result"><strong>No matching detections</strong><p>Try changing the search or severity filter, or run a new detection.</p></div>:<><div className="table-wrap"><table><thead><tr><th>Image</th><th>Result</th><th>Risk</th><th>Coverage</th><th>Date</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td className="filename-cell">{row.filename}</td><td>{Number(row.spill_percentage)>=1?'Spill detected':'No significant spill'}</td><td><SeverityBadge value={row.risk_level}/></td><td>{Number(row.spill_percentage).toFixed(2)}%</td><td>{row.created_at||'—'}</td></tr>)}</tbody></table></div><div className="table-footer"><span>{filtered.length} of {history.length} records</span><button className="danger-button" onClick={clearHistory}><Trash2 size={16}/> Clear history</button></div></>}</section></>;
}
