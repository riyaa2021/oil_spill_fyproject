export function severityLabel(value) {
 const key=String(value??'').trim().toLowerCase();
 return ({success:'Low',info:'Medium',warning:'High',danger:'Critical',low:'Low',medium:'Medium',high:'High',critical:'Critical'})[key] || value || 'Unknown';
}
export default function SeverityBadge({value}) {
 const label=severityLabel(value);
 return <span className={`risk-chip risk-${String(label).toLowerCase()}`}>{label}</span>;
}
