// Exact physical-board references transcribed from Espressif's official DevKit guides.
// These are not universal pin maps for every board using the same silicon.
export const ESP32_BOARD_PROFILES = Object.freeze({
  'esp32-s3-devkitc-1-v1.1': Object.freeze({
    id: 'esp32-s3-devkitc-1-v1.1',
    boardTarget: 'esp32:esp32:esp32s3',
    name: 'ESP32-S3-DevKitC-1 v1.1',
    voltage: '3.3V GPIO',
    source: 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html',
    note: 'Exact DevKitC-1 v1.1 header reference. Earlier v1.0 boards route the onboard RGB LED differently (GPIO48 instead of GPIO38). Confirm module flash/PSRAM variant before using GPIO35–37.',
    pins: [
      ...[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map(gpio => ({
        gpio, label: 'GPIO '+gpio, group: [0,3].includes(gpio)?'strapping':[19,20].includes(gpio)?'usb':[15,16,17,18,43,44].includes(gpio)?'uart':'general',
        capabilities: ['Digital I/O','PWM', ...([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].includes(gpio)?['ADC']:[])],
        restrictions: gpio===0?['Boot strapping pin; attached circuitry can affect download/boot mode.']:gpio===3?['Strapping/JTAG-related pin; verify reset-time levels.']:gpio===19||gpio===20?['Shared with native USB D-/D+ on this board; using it as GPIO can disrupt USB.']:gpio===38?['Onboard addressable RGB LED uses GPIO38 on v1.1.']:[] 
      })),
      ...[35,36,37,38,39,40,41,42,43,44,45,46,47,48].map(gpio => ({
        gpio, label: 'GPIO '+gpio, group: gpio===46?'input-only':gpio===45?'strapping':gpio===43||gpio===44?'uart':'general',
        capabilities: gpio===46?['Digital input']:['Digital I/O','PWM'],
        restrictions: gpio===46?['Input-only pin; do not use as an output.']:gpio===45?['Strapping pin; verify reset-time levels.']:gpio>=35&&gpio<=37?['Unavailable on ESP32-S3 modules using octal flash/PSRAM; verify the exact module variant.']:gpio===43||gpio===44?['UART0 TX/RX; shared with USB-to-UART bridge on this DevKit.']:gpio===38?['Onboard addressable RGB LED uses GPIO38 on v1.1.']:[]
      }))
    ],
    reserved: [
      {label:'GPIO35–37',reason:'Used internally by octal flash/PSRAM variants; availability depends on the exact ESP32-S3 module.'},
      {label:'GPIO19–20',reason:'Connected to native USB D-/D+; avoid repurposing when using native USB.'},
      {label:'GPIO43–44',reason:'UART0 TX/RX shared with the onboard USB-to-UART bridge.'},
      {label:'GPIO38',reason:'Connected to the onboard addressable RGB LED on DevKitC-1 v1.1; v1.0 uses GPIO48 instead.'}
    ]
  }),
  'esp32-c3-devkitm-1': Object.freeze({
    id: 'esp32-c3-devkitm-1',
    boardTarget: 'esp32:esp32:esp32c3',
    name: 'ESP32-C3-DevKitM-1',
    voltage: '3.3V GPIO',
    source: 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c3/esp32-c3-devkitm-1/user_guide.html',
    note: 'Exact DevKitM-1 header reference. GPIO2, GPIO8 and GPIO9 are strapping pins. GPIO8 also drives the onboard RGB LED; GPIO18/19 are native USB D-/D+.',
    pins: [0,1,2,3,4,5,6,7,8,9,10,18,19,20,21].map(gpio => ({
      gpio, label: 'GPIO '+gpio, group: [2,8,9].includes(gpio)?'strapping':[20,21].includes(gpio)?'uart':[18,19].includes(gpio)?'usb':'general',
      capabilities: ['Digital I/O','PWM', ...([0,1,2,3,4,5].includes(gpio)?['ADC']:[])],
      restrictions: [2,8,9].includes(gpio)?['Boot strapping pin; external pull levels can affect boot mode.']:gpio===8?['Onboard addressable RGB LED is driven by GPIO8; also a strapping pin.']:gpio===9?['BOOT/download-mode strapping pin; keep the required reset-time pull-up.']:gpio===20||gpio===21?['UART0 RX/TX; shared with USB-to-UART bridge.']:gpio===18||gpio===19?['Native USB D-/D+; avoid repurposing when native USB is in use.']:[]
    })),
    reserved: [
      {label:'GPIO2, GPIO8, GPIO9',reason:'Strapping pins; GPIO8 also drives the onboard RGB LED.'},
      {label:'GPIO18–19',reason:'Native USB D-/D+ connections.'},
      {label:'GPIO20–21',reason:'UART0 RX/TX shared with the USB-to-UART bridge.'},
      {label:'GPIO12–17',reason:'Not exposed on this board header; used for module flash interface.'}
    ]
  })
});

export function getEsp32BoardProfile(id) {
  return ESP32_BOARD_PROFILES[id] || null;
}
