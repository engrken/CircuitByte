"""Module-level electrical schematics. Exact net labels match the companion wiring tables."""
import pathlib,json,html
root=pathlib.Path(__file__).resolve().parents[1]
projects=json.loads((root/'content/diy-projects.json').read_text())
# name, signal pairs (controller pin, peripheral pin), supply net, component kind
layouts={
'button-led':[('Momentary switch',[('D2','Contact')],'','switch'),('Red LED',[('D9','Anode')],'','led')],
'pwm-dimmer':[('10 kΩ potentiometer',[('A0','Wiper')],'UNO +5V','pot'),('Red LED',[('D9','Anode')],'','led')],
'automatic-night-light':[('Photoresistor module',[('A0','S / AO')],'UNO +5V','sensor'),('Red LED',[('D9','Anode')],'','led')],
'ultrasonic-distance-alarm':[('HC-SR04',[('D9','TRIG'),('D10','ECHO')],'UNO +5V','sensor'),('Passive piezo module',[('D3','S')],'UNO +5V','sensor'),('Red LED',[('D6','Anode')],'','led')],
 'temperature-fan-automation':[('DHT22',[('D2','DATA')],'UNO +5V','dht'),('5 V relay module',[('D8','IN')],'EXT +5V','relay')],
 'servo-model-barrier':[('HC-SR04',[('D9','TRIG'),('D10','ECHO')],'UNO +5V','sensor'),('MG90S 180° servo',[('D6','Signal')],'EXT +5V','sensor')],
 'gsm-door-alert':[('SIM900A raw UART',[('D8 TX','RXD'),('D7 RX','TXD')],'KIT +5V → VCC5','gsm'),('Reed switch module',[('D2','S')],'UNO +5V','sensor')],
 'esp32-room-dashboard':[('DHT22',[('GPIO27','DATA')],'ESP32 3V3','dht')]
}
def e(s):return html.escape(s)
def label(x,y,s,size=18,color='#17332f',anchor='start'):
 return f'<text x="{x}" y="{y}" font-family="Arial,sans-serif" font-size="{size}" fill="{color}" text-anchor="{anchor}">{e(s)}</text>'
def wire(x,y,x2,y2,color='#357f79'):
 return f'<path d="M{x} {y} L{x2} {y2}" stroke="{color}" stroke-width="2.5" fill="none"/>'
def ground(x,y):
 return wire(x,y,x,y+17,'#52665d')+f'<path d="M{x-15} {y+17}h30 M{x-10} {y+24}h20 M{x-5} {y+31}h10" stroke="#52665d" stroke-width="2"/>'+label(x,y+51,'GND',13,anchor='middle')
def supply(x,y,net):
 return wire(x,y,x,y-20,'#b66b40')+f'<path d="M{x-7} {y-15} L{x} {y-25} L{x+7} {y-15}" fill="none" stroke="#b66b40" stroke-width="2"/>'+label(x,y-36,net,14,'#914d2b','middle')
for p in projects:
 slug=p['slug'];groups=layouts[slug];extra=260 if slug=='temperature-fan-automation' else 150 if slug=='gsm-door-alert' else 40
 height=220+len(groups)*270+extra
 s=f'<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="{height}" viewBox="0 0 1100 {height}" role="img" aria-labelledby="title desc"><title id="title">{e(p["title"])} — module circuit schematic</title><desc id="desc">Controller pins connected to labelled peripheral terminals. All GND symbols share a common net. Separate positive supply nets must not be joined.</desc><rect width="1100" height="{height}" fill="#f8f9f5"/>'
 s+=label(30,35,'CIRCUITBYTE / MODULE CIRCUIT SCHEMATIC',15,'#55734d')+label(30,72,p['title'],26)+label(30,103,'All GND symbols are connected. Named positive rails remain separate.',15)
 ctrl='ESP32' if slug.startswith('esp32') else 'UNO R3'
 s+=f'<rect x="35" y="150" width="230" height="{len(groups)*270-15}" rx="14" fill="#173a32"/>'+label(65,190,ctrl,24,'#daf58e')+label(65,220,'USB powered',15,'#d6e6d0')+label(65,245,'Logic: '+('3.3 V' if ctrl=='ESP32' else '5 V'),15,'#d6e6d0')
 s+=ground(145,150+len(groups)*270-15)
 for i,(name,signals,net,kind) in enumerate(groups):
  y=185+i*270; x=720;w=340;h=130
  s+=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="white" stroke="#92aa8c" stroke-width="2"/>'+label(x+15,y+30,name,20)
  if net:s+=supply(950,y,net)+label(950,y-5,'VCC' if kind!='gsm' else 'Kit power',11,anchor='middle')
  s+=ground(950,y+h)
  for k,(pin,terminal) in enumerate(signals):
   yy=y+65+k*38
   s+=label(250,yy-8,pin,18,'#daf58e','end')+wire(265,yy,720,yy)+f'<circle cx="265" cy="{yy}" r="4" fill="#daf58e"/>'+label(735,yy+6,terminal,16)
   if kind=='led':
    s+=f'<rect x="440" y="{yy-10}" width="80" height="20" fill="#f8f9f5" stroke="#357f79" stroke-width="2"/>'+label(480,yy-20,'330 Ω',16,anchor='middle')+label(880,y+110,'Cathode (−) → GND',14)
   if kind=='switch':s+=label(400,yy-15,'INPUT_PULLUP',14)+label(740,y+110,'Closes to GND when pressed',14)
   if kind=='pot':s+=label(740,y+110,'End 1: +5V / End 2: GND',14)
   if kind=='dht':
    s+=f'<circle cx="540" cy="{yy}" r="4" fill="#357f79"/>'+wire(540,yy,540,yy-24)+f'<rect x="532" y="{yy-62}" width="16" height="38" fill="#f8f9f5" stroke="#357f79" stroke-width="2"/>'+supply(540,yy-62,net)+label(555,yy-36,'10 kΩ',14)
   if kind=='gsm':
    s+=f'<rect x="410" y="{yy-17}" width="200" height="31" fill="#e6efda" stroke="#659353"/>'+label(510,yy+4,'A1 → B1' if k==0 else 'A2 ← B2',14,anchor='middle')
  if kind=='gsm':
   s+=label(510,y-28,'TXU0202',17,anchor='middle')+label(510,y-9,'VCCA = 5 V / VCCB = 2.8 V',12,anchor='middle')
  if kind=='relay':s+=label(740,y+110,'COM / NO contacts: see below',14)
 # Extra power/detail blocks below the main circuit.
 y=220+len(groups)*270
 if slug=='gsm-door-alert':
  s+=f'<rect x="320" y="{y-20}" width="730" height="120" rx="10" fill="#edf2e5"/>'+label(340,y+10,'TXU0202 support connections',17)+label(340,y+38,'OE → VCCA (5 V). GND → common GND.',15)+label(340,y+63,'100 nF from VCCA to GND; 100 nF from VCCB to GND.',15)+label(340,y+88,'Use documented kit VCC5 supply; do not apply 5 V to bare VBAT.',15)
 if slug=='temperature-fan-automation':
  s+=label(320,y,'SEPARATE 5 V DC LOAD CIRCUIT',17,'#55734d')
  s+=supply(360,y+80,'EXT +5V')+wire(360,y+80,470,y+80)+label(400,y+66,'COM',14)
  s+=f'<circle cx="470" cy="{y+80}" r="4" fill="#357f79"/><circle cx="550" cy="{y+80}" r="4" fill="#357f79"/>'+wire(470,y+80,535,y+58)+label(540,y+112,'NO',14)+wire(550,y+80,720,y+80)
  s+=f'<rect x="720" y="{y+50}" width="155" height="70" rx="7" fill="white" stroke="#357f79"/>'+label(737,y+80,'5 V DC fan',16)+label(735,y+103,'+',15)+label(858,y+103,'−',15)+wire(875,y+80,980,y+80)+ground(980,y+80)
  s+=wire(650,y+80,650,y+160)+wire(650,y+160,720,y+160)+f'<rect x="720" y="{y+136}" width="155" height="48" fill="white" stroke="#357f79"/>'+label(797,y+155,'1N4007',14,anchor='middle')+label(797,y+176,'K (band) ← | → A',12,anchor='middle')+wire(875,y+160,930,y+160)+wire(930,y+160,930,y+80)
  s+=f'<circle cx="650" cy="{y+80}" r="4" fill="#357f79"/><circle cx="930" cy="{y+80}" r="4" fill="#357f79"/>'+label(320,y+215,'NO closes when relay is energized. NC is unused. Do not connect mains.',15)
 s+=label(30,height-15,'Use the full connection table for pin labels, power details, polarity and module-variant checks.',14)
 s+='</svg>'
 (root/'public/education/diagrams'/f'{slug}-schematic.svg').write_text(s)
print('Generated 8 module circuit schematics.')
