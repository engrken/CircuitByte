// CircuitByte Studio beta: intentionally curated UNO patterns.
// Project matching is rule-based, not an arbitrary AI hardware-design claim.
export const STUDIO_BUILDS = [
  {
    slug: 'ultrasonic-distance-alarm',
    title: 'Ultrasonic proximity alarm',
    summary: 'Measure distance with HC-SR04; sound a buzzer and light an LED for nearby objects.',
    tags: ['distance','parking','ultrasonic','obstacle','proximity','beep','alarm','sensor','detect'],
    parts: ['cb-059','cb-074','cb-029','cb-009','cb-002','cb-076'],
    wires: [
      ['UNO 5V','HC-SR04 VCC'],['UNO GND','HC-SR04 GND + buzzer GND'],
      ['D9','HC-SR04 TRIG'],['D10','HC-SR04 ECHO'],['D3','Passive buzzer signal'],
      ['D6 → 330 Ω series resistor','LED anode (+)'],['LED cathode (−)','GND']
    ],
    notes: ['Use a passive buzzer module, not a bare 8 Ω speaker.','Do not use as a safety-critical vehicle collision sensor.','Example trigger distance is 20 cm; change the value in the sketch only after reviewing its logic.']
  },
  {
    slug: 'three-led-scanner',
    title: 'Three-LED scanning light',
    summary: 'Sequence three LEDs forward and backward using a single UNO.',
    tags: ['light','led','scanner','sequence','running','chaser','blink','pattern','knight rider'],
    parts: ['cb-059','cb-009','cb-002','cb-065','cb-076'],
    wires: [
      ['D8 → 330 Ω','LED 1 anode (+)'],['D9 → 330 Ω','LED 2 anode (+)'],
      ['D10 → 330 Ω','LED 3 anode (+)'],['All LED cathodes (−)','UNO GND']
    ],
    notes: ['Each bare LED requires its own current-limiting resistor.','Adjust stepDelayMs in the source for speed changes.']
  },
  {
    slug: 'joystick-direction-lights',
    title: 'Joystick-controlled direction lights',
    summary: 'Use an analog joystick to illuminate LEDs for the up/down/left/right directions.',
    tags: ['joystick','direction','game','indicator','analog','control','movement','light'],
    parts: ['cb-059','cb-015','cb-009','cb-002','cb-065','cb-076'],
    wires: [
      ['UNO 5V / GND','Joystick VCC / GND'],['A0','Joystick VRx'],['A1','Joystick VRy'],
      ['D5 → 330 Ω','Left LED anode'],['D6 → 330 Ω','Right LED anode'],
      ['D9 → 330 Ω','Up LED anode'],['D10 → 330 Ω','Down LED anode'],
      ['All LED cathodes','UNO GND']
    ],
    notes: ['Choose the joystick breakout variant that accepts UNO 5 V analog operation.','Adjust deadZone only after observing the real joystick center.']
  },
  {
    slug: 'lcd-room-comfort-monitor',
    title: 'Temperature and humidity LCD monitor',
    summary: 'Read DHT22 readings and display them on an I²C 16 × 2 LCD.',
    tags: ['temperature','humidity','comfort','lcd','display','room','weather','dht22','monitor'],
    parts: ['cb-059','cb-079','cb-066','cb-076'],
    wires: [
      ['UNO 5V / GND','DHT22 module VCC / GND'],['D2','DHT22 DATA'],
      ['A4 (SDA)','I²C LCD SDA'],['A5 (SCL)','I²C LCD SCL'],['UNO 5V / GND','LCD VCC / GND']
    ],
    notes: ['Requires DHT sensor library, Adafruit Unified Sensor, and hd44780.','Verify whether the DHT22 is a 3-pin module or bare 4-pin sensor; a bare sensor generally needs a data pull-up.']
  },
  {
    slug: 'micro-sd-light-logger',
    title: 'Light-level CSV data logger',
    summary: 'Measure a light sensor on A0 and append readings to a microSD card.',
    tags: ['logger','logging','sd','csv','light','ldr','sensor','data','record'],
    parts: ['cb-059','cb-077','cb-076'],
    wires: [
      ['LDR sensor analog output','UNO A0'],['SD CS','D10'],['SD MOSI','D11'],
      ['SD MISO','D12'],['SD SCK','D13'],['SD GND','UNO GND']
    ],
    notes: ['A compatible analog-output LDR module is required and may need to be sourced separately.','Verify that the exact microSD breakout has both 3.3 V regulation and 5 V-safe SPI level shifting; a regulator alone is insufficient.','The CSV records uptime, not calendar timestamps.']
  }
];

const seriousElectricalRisk = /\b(mains|wall outlet|220\s*v|230\s*v|110\s*v|high voltage|ac outlet|life support|medical device)\b/i;
export function prepareStudioProject(input) {
  const prompt = String(input?.prompt || '').trim().slice(0, 800);
  const selected = [...new Set(Array.isArray(input?.parts) ? input.parts.filter(x => typeof x === 'string') : [])].slice(0, 18);
  if (prompt.length < 12) throw new Error('Describe what the circuit should do in at least 12 characters.');
  if (seriousElectricalRisk.test(prompt)) throw new Error('The beta supports low-voltage educational circuits only. Mains and safety-critical controls are not supported.');
  const tokens = prompt.toLowerCase();
  const unsupportedParts = ['cb-062', 'cb-063', 'cb-064', 'cb-081'];
  if (selected.some(id => unsupportedParts.includes(id)) ||
      /\b(?:esp32|esp8266|m5stack|acs712|wi-?fi|web\s*(?:server|dashboard|page))\b/i.test(prompt)) {
    throw new Error('The guided Uno examples do not cover this hardware or network feature. Choose AI draft for a custom design.');
  }
  const scored = STUDIO_BUILDS.map(build => {
    const overlap = build.parts.filter(id => selected.includes(id)).length;
    const matches = build.tags.filter(term => tokens.includes(term)).length;
    const distinctive = build.parts.filter(id => !['cb-059','cb-076','cb-065','cb-002','cb-009'].includes(id) && selected.includes(id)).length;
    return {build, points:matches * 4 + distinctive * 5 + overlap};
  }).sort((a,b) => b.points-a.points);
  if (!scored[0]?.points || (scored[0].points < 3 && !scored[0].build.tags.some(term => tokens.includes(term)))) {
    throw new Error('No reliable starter template matches yet. Try describing distance sensing, LED patterns, a joystick, a DHT22 LCD, or microSD logging.');
  }
  const match = scored[0];
  const build = match.build;
  return {
    ...build,
    method:'guided-template',
    prompt,
    codeUrl:'/education/code/'+build.slug+'.ino',
    guideUrl:'/diy/'+build.slug,
    missing:build.parts.filter(id => !selected.includes(id)),
    note:'This is a matching, editable published example—not a newly AI-generated implementation of every instruction. Review the code against your exact requested behavior.',
    warnings:[...build.notes,'Disconnect power before assembling or changing wires. Verify part pinouts and current limits against the specific module.']
  };
}
