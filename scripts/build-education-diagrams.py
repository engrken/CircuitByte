"""Generate accessible, deterministic wiring schematics from the guide pin tables."""
import json,pathlib,html,textwrap
root=pathlib.Path(__file__).resolve().parents[1]
projects=json.loads((root/'content/diy-projects.json').read_text())
def esc(s):return html.escape(s)
def words(s,width):return textwrap.wrap(s,width=width,break_long_words=False,break_on_hyphens=False)
def text(x,y,s,width=35,size=17,color='#17332f',weight='400'):
 return ''.join(f'<text x="{x}" y="{y+i*23}" font-family="Arial,sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}">{esc(line)}</text>' for i,line in enumerate(words(s,width)))
for p in projects:
 h=225+len(p['wiring'])*125
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{h}" viewBox="0 0 1200 {h}" role="img" aria-labelledby="title desc"><title id="title">{esc(p["title"])} — wiring schematic</title><desc id="desc">Labelled pin-to-pin connections. Repeated ground and supply names are the same net. Read the companion wiring table and module-variant notes.</desc><rect width="1200" height="{h}" fill="#f8f9f5"/>'
 svg+=text(35,42,'CIRCUITBYTE / WIRING SCHEMATIC',75,16,'#50744b','700')+text(35,80,p['title'],82,27,'#17332f','700')
 svg+=text(35,118,'Labelled nets, not physical pin positions. Repeated net names are electrically connected.',100,17)
 for k,s in enumerate(['SOURCE / PIN','CONNECTION / COMPONENT','DESTINATION / PIN']):svg+=text(35+k*400,170,s,36,13,'#64716c','700')
 for i,r in enumerate(p['wiring']):
  y=190+i*125; color='#33735f' if not ('GND' in r['from'] or 'ground' in r['via'].lower()) else '#65766f'
  svg+=f'<rect x="25" y="{y}" width="1150" height="108" rx="9" fill="white" stroke="#dce1d7"/>'
  for x,w in [(35,310),(435,320),(835,320)]:svg+=f'<rect x="{x}" y="{y+10}" width="{w}" height="83" rx="6" fill="#edf2e7"/>'
  svg+=f'<path d="M345 {y+50} H435 M755 {y+50} H835" stroke="{color}" stroke-width="3" fill="none"/>'
  for x in [345,435,755,835]:svg+=f'<circle cx="{x}" cy="{y+50}" r="4" fill="{color}"/>'
  svg+=text(48,y+33,r['from'],29,16,weight='700')+text(448,y+33,r['via'],30,16)+text(848,y+33,r['to'],30,16,weight='700')
 svg+=text(35,h-12,'Disconnect power before wiring. Follow the guide’s supply, polarity and variant checks.',110,15)
 svg+='</svg>'
 (root/'public/education/diagrams'/f'{p["slug"]}-wiring.svg').write_text(svg)
 # Functional sequence, intentionally separate from the electrical schematic.
 svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="550" viewBox="0 0 800 550" role="img" aria-labelledby="title desc"><title id="title">Functional overview</title><desc id="desc">'+esc('; then '.join(p['flow']))+'</desc><rect width="800" height="550" rx="18" fill="#173a32"/>'+text(35,42,'CIRCUITBYTE / HOW IT WORKS',60,15,'#daf58e','700')
 for i,item in enumerate(p['flow']):
  y=70+i*115
  svg+=f'<rect x="65" y="{y}" width="670" height="80" rx="12" fill="#294f43" stroke="#73957a"/><circle cx="105" cy="{y+40}" r="20" fill="#daf58e"/>'+text(99,y+46,str(i+1),3,17,'#17332f','700')+text(145,y+45,item,51,21,'#ffffff')
  if i<3:svg+=f'<path d="M400 {y+80} V{y+108} m-7 -8 l7 8 l7 -8" stroke="#daf58e" stroke-width="2" fill="none"/>'
 svg+='</svg>'
 (root/'public/education/diagrams'/f'{p["slug"]}-flow.svg').write_text(svg)
print('Generated 16 diagrams from the eight guide records.')
