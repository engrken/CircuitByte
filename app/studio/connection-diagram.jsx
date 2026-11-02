'use client';
import {studioBoardName} from '../../lib/studio-boards.mjs';
export function StudioConnectionDiagram({board,connections=[],output={},stale=false}){
 const rows=connections.filter(c=>c&&typeof c.pin==='string'&&typeof c.to==='string');
 const height=Math.max(180,rows.length*64+70);
 function signal(row){
  if(stale||row.kind!=='digital-output')return null;
  // ESP D labels are not GPIO numbers. Only explicitly numbered GPIO or AVR D labels match.
  const pattern=board.startsWith('arduino:avr:')?/^(?:UNO\s+)?D?(\d+)$/:/^(?:GPIO\s*)?(\d+)$/i;
  const match=pattern.exec(row.pin.trim());return match&&Object.hasOwn(output,Number(match[1]))?output[Number(match[1])]:null;
 }
 return <section className="studio-connected-diagram" aria-label="Project connection diagram"><h3>{studioBoardName(board)} · connection map</h3><p>Generated from the project’s Connections table. Logical wiring view; component placement and electrical behavior are not simulated.</p>{stale&&<p className="studio-warning">Sketch edited: wiring may be outdated. Signal overlay paused until connections are regenerated.</p>}{!rows.length?<p>No external connections supplied. Add or generate a project wiring plan to populate this view.</p>:<div className="studio-diagram-scroll"><svg viewBox={'0 0 1000 '+height} role="img" aria-label={studioBoardName(board)+' wiring diagram'}><title>Named sources connected to project destinations</title><rect x="10" y="10" width="270" height={height-20} rx="16" fill="#123d4a"/>{rows.map((row,i)=>{const y=48+i*64,state=signal(row),color=row.kind==='ground'?'#64748b':row.kind==='power'?'#ef4444':state===true?'#16a34a':state===false?'#64748b':'#ca8a04';return <g key={i}><title>{row.pin+' → '+row.to+' · '+row.net+(state===null?'':state?' HIGH':' LOW')}</title><text x="24" y={y} fill="white" fontSize="14">{row.pin}</text><circle cx="280" cy={y-5} r="5" fill={color}/><path d={'M280 '+(y-5)+' H550'} stroke={color} strokeWidth={state===true?5:3} strokeDasharray={state===null&&row.kind!=='power'&&row.kind!=='ground'?'6 4':undefined}/><text x="300" y={y-14} fill="#475569" fontSize="12">{String(row.net||'Unverified').slice(0,30)}{state===null?'':state?' · HIGH':' · LOW'}</text><rect x="550" y={y-25} width="440" height="49" rx="8" fill="#f1f5f9" stroke={color}/><text x="563" y={y-3} fill="#0f172a" fontSize="13">{row.to.length>53?row.to.slice(0,50)+'…':row.to}</text><text x="563" y={y+13} fill="#475569" fontSize="11">{row.kind||'unverified'}</text></g>;})}</svg></div>}</section>;
}
