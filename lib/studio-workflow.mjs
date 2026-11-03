export const STUDIO_STEPS=['Idea','Materials','Board','Diagram','Code','Compile','Upload'];
export function suggestStudioSetup(prompt){
 const ids=new Set(['cb-076']);const text=String(prompt).toLowerCase();
 for(const [pattern,items] of [[/distance|obstacle|ultrasonic/,['cb-074','cb-029']],[/temperature|humidity/,['cb-079']],[/lcd|display/,['cb-066']],[/light|ldr/,['cb-049']],[/current|power meter|energy/,['cb-081']],[/voltage|power meter|energy/,['cb-082']],[/led|blink/,['cb-009','cb-002']],[/servo/,['cb-070']],[/relay/,['cb-017']],[/gps|location/,['cb-030']],[/gsm|sms/,['cb-061']]])if(pattern.test(text))items.forEach(id=>ids.add(id));
 const connected=/wifi|wi-fi|iot|web|internet|wireless/.test(text);
 return {parts:[...ids],board:connected?'esp32:esp32:esp32':'arduino:avr:uno',reason:connected?'ESP32 is a candidate for Wi-Fi and web interfaces. Verify GPIO count, signal levels and exact module requirements.':'UNO is a candidate for basic wired beginner projects. Confirm memory, interfaces and GPIO requirements.'};
}
