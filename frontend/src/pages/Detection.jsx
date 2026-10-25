import {useEffect,useState} from 'react';
import {BarChart3,Image as ImageIcon,LoaderCircle,ShieldCheck,Upload,Waves} from 'lucide-react';
import {detectImage} from '../services/api.js';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StateMessage from '../components/StateMessage.jsx';
const imageSrc=value=>value?`data:image/png;base64,${value}`:'';
export default function Detection(){
 const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
 useEffect(()=>()=>{if(preview.startsWith('blob:'))URL.revokeObjectURL(preview)},[preview]);
 function chooseFile(next){setError('');setResult(null);if(!next)return;
  if(!['image/jpeg','image/png'].includes(next.type)){setFile(null);setPreview('');setError('Please choose a JPG, JPEG, or PNG image.');return}
  if(!next.size){setFile(null);setPreview('');setError('The selected image is empty.');return}
  if(next.size>20*1024*1024){setFile(null);setPreview('');setError('Image must be 20 MB or smaller.');return}
  setFile(next);setPreview(URL.createObjectURL(next));
 }
 async function runDetection(e){e.preventDefault();if(!file){setError('Choose an image first.');return}setBusy(true);setError('');setResult(null);
  try{setResult(await detectImage(file))}catch(err){setError(err.response?.data?.error||err.response?.data?.detail||'Could not run detection. Check that the Python AI service and Node backend are running.')}finally{setBusy(false)}
 }
 return <><StateMessage error={error} onDismiss={()=>setError('')}/><div className="page-heading"><div><p className="eyebrow">AI ANALYSIS</p><h1>Oil spill detection</h1><p className="muted">Upload a satellite or aerial image to generate a segmentation result.</p></div><span className="model-pill"><span/> Model API</span></div>
 <div className="main-grid"><section className="panel upload-panel"><div className="panel-heading"><div><h2>Input image</h2><p>JPG or PNG · Maximum 20 MB</p></div><ImageIcon size={20}/></div>
 <form onSubmit={runDetection}><label className={`dropzone ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);chooseFile(e.dataTransfer.files?.[0])}}>
 <input type="file" accept="image/png,image/jpeg,.jpg,.jpeg,.png" onChange={e=>chooseFile(e.target.files?.[0])}/>{preview?<img className="preview-image" src={preview} alt="Selected satellite image"/>:<><span className="upload-icon"><Upload size={24}/></span><strong>Drop your image here</strong><span>or click to browse files</span></>}</label>
 {file&&<div className="file-line"><span>{file.name}</span><span>{(file.size/1024/1024).toFixed(2)} MB</span></div>}
 <button className="primary-button" disabled={!file||busy}>{busy?<><LoaderCircle className="spin" size={18}/> Analysing image…</>:<><Waves size={18}/> Detect oil spill</>}</button></form><p className="fine-print">The model resizes the image to 256 × 256 pixels before inference.</p></section>
 <section className="panel result-panel"><div className="panel-heading"><div><h2>Detection result</h2><p>Segmentation and risk assessment</p></div><ShieldCheck size={20}/></div>
 {!result?<div className="empty-result"><div className="empty-icon"><BarChart3 size={28}/></div><strong>Your results will appear here</strong><p>Choose an image and run detection to view the mask, probability map, and spill coverage.</p></div>:<>
 <div className="result-summary"><div><span className="metric-label">Estimated spill coverage</span><strong className="coverage">{Number(result.spill_percentage).toFixed(2)}%</strong></div><SeverityBadge value={result.risk_level}/></div>
 <p className="risk-message">{String(result.risk_message||'').replace(/^[^A-Z]*\s*/,'')}</p><div className="image-results">{[['overlay','Overlay'],['mask','Segmentation mask'],['probability_map','Probability map']].map(([key,label])=><div className="result-image-card" key={key}>{result.images?.[key]?<img src={imageSrc(result.images[key])} alt={label}/>:<div className="empty-result-image">{label} unavailable</div>}<span>{label}</span></div>)}</div>
 {result.images?.mask&&<a className="download-link" href={imageSrc(result.images.mask)} download="spillguard-mask.png">Download segmentation mask</a>}</>}</section></div></>;
}
