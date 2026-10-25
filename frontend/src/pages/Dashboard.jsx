import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Activity,Droplets,Images,ShieldAlert,Waves} from 'lucide-react';
import {fetchAnalytics,fetchHistory} from '../services/api.js';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StateMessage from '../components/StateMessage.jsx';
export default function Dashboard(){
 const [analytics,setAnalytics]=useState(null),[history,setHistory]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;(async()=>{try{const [a,h]=await Promise.all([fetchAnalytics(),fetchHistory()]);if(active){setAnalytics(a);setHistory(h)}}catch(err){if(active)setError(err.response?.data?.error||'Could not load dashboard data. Check that the backend is running.')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[]);
 const summary=analytics?.summary,critical=(analytics?.risks||[]).filter(x=>['danger','critical'].includes(String(x.risk_level).toLowerCase())).reduce((sum,x)=>sum+Number(x.count),0);
 return <><StateMessage error={error} onDismiss={()=>setError('')}/><div className="page-heading"><div><p className="eyebrow">SYSTEM OVERVIEW</p><h1>Dashboard</h1><p className="muted">A quick overview of oil-spill detection activity.</p></div><Link className="primary-button link-button" to="/detection"><Waves size={18}/> New detection</Link></div>
 <div className="stat-grid"><div className="stat-card"><span><Images size={17}/> Total detections</span><strong>{loading?'…':summary?.total??0}</strong></div><div className="stat-card"><span><Droplets size={17}/> Spill detections</span><strong>{loading?'…':summary?.spill_detections??0}</strong></div><div className="stat-card"><span><Activity size={17}/> Clean detections</span><strong>{loading?'…':summary?.clean_detections??0}</strong></div><div className="stat-card"><span><ShieldAlert size={17}/> Critical incidents</span><strong>{loading?'…':critical}</strong></div></div>
 <section className="panel wide-panel"><div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recent detections</h2></div><Link className="text-link" to="/history">View history <ArrowRight size={16}/></Link></div>
 {loading?<p className="muted">Loading recent detections…</p>:!history.length?<div className="empty-result"><strong>No detections yet</strong><p>Run an image analysis to start building your history.</p><Link className="text-link" to="/detection">Go to Detection <ArrowRight size={16}/></Link></div>:<div className="table-wrap"><table><thead><tr><th>Image</th><th>Severity</th><th>Coverage</th><th>Date</th></tr></thead><tbody>{history.slice(0,5).map(row=><tr key={row.id}><td className="filename-cell">{row.filename}</td><td><SeverityBadge value={row.risk_level}/></td><td>{Number(row.spill_percentage).toFixed(2)}%</td><td>{row.created_at||'—'}</td></tr>)}</tbody></table></div>}</section></>;
}
