import { NavLink, Outlet } from 'react-router-dom';
import { Waves, LayoutDashboard, Upload, History, BarChart3, ShieldCheck } from 'lucide-react';
const items = [
  {to:'/dashboard',label:'Dashboard',icon:LayoutDashboard},
  {to:'/detection',label:'Detection',icon:Upload},
  {to:'/history',label:'History',icon:History},
  {to:'/analytics',label:'Analytics',icon:BarChart3}
];
export default function Layout() {
 return <div className="app-shell">
  <header className="topbar"><div className="brand"><span className="brand-icon"><Waves size={24}/></span><div><strong>AI SpillGuard</strong><small>Oil spill detection &amp; segmentation</small></div></div><div className="local-badge"><span/> Local AI service</div></header>
  <div className="layout"><aside className="sidebar"><div className="side-label">WORKSPACE</div><nav className="nav-list">{items.map(({to,label,icon:Icon})=><NavLink key={to} to={to} className={({isActive})=>`nav-item ${isActive?'active':''}`}><Icon size={18}/>{label}</NavLink>)}</nav>
  <div className="sidebar-note"><ShieldCheck size={20}/><strong>Private by design</strong><p>Images are processed by the AI service running on your computer.</p></div></aside>
  <main className="content"><Outlet/><footer>AI SpillGuard · Local development build · Verify model predictions before operational use.</footer></main></div>
 </div>;
}
