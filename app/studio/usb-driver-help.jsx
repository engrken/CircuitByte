const DRIVER_LINKS=[
  {
    name:'WCH CH340 / CH341',
    note:'Common on compatible Arduino boards and USB-to-serial adapters.',
    links:[
      {label:'Windows driver',href:'https://www.wch-ic.com/downloads/CH341SER_ZIP.html'},
      {label:'macOS driver',href:'https://www.wch-ic.com/downloads/CH341SER_MAC_ZIP.html'}
    ]
  },
  {
    name:'Silicon Labs CP210x',
    note:'Common on ESP32 DevKit boards and USB-to-UART adapters.',
    links:[{label:'CP210x VCP drivers',href:'https://www.silabs.com/software-and-tools/usb-to-uart-bridge-vcp-drivers'}]
  },
  {
    name:'FTDI FT232 / FTDI',
    note:'Found on some Arduino-compatible and USB-to-serial boards.',
    links:[{label:'FTDI VCP drivers',href:'https://ftdichip.com/drivers/vcp-drivers/'}]
  },
  {
    name:'Arduino board support',
    note:'Official Arduino boards may use native USB or drivers supplied with the installed board core.',
    links:[{label:'Arduino port troubleshooting',href:'https://support.arduino.cc/hc/en-us/articles/4412955149586-If-your-board-is-not-detected-by-Arduino-IDE'}]
  }
];

export function StudioUsbDriverHelp({descriptor}) {
  const hint=descriptor?.label&&descriptor.label!=='Serial port (USB identity unavailable)'?descriptor.label:null;
  return <details className="studio-usb-driver-guide">
    <summary>Port missing, or do you need a USB driver?</summary>
    <p><strong>Drivers are installed on your computer.</strong> CircuitByte Studio runs in the browser and cannot install Windows, macOS, or Linux drivers. First use a USB data cable, connect directly to the computer, and check whether the device appears in Device Manager (Windows), System Information → USB (macOS), or your Linux device list.</p>
    {hint&&<p className="studio-usb-driver-hint">The browser reports <strong>{hint}</strong>. This is only a USB vendor hint; it does not identify the exact board, chip revision, bootloader, or required driver.</p>}
    <div className="studio-usb-driver-grid">{DRIVER_LINKS.map(item=><div className="studio-usb-driver-card" key={item.name}>
      <strong>{item.name}</strong><span>{item.note}</span><div>{item.links.map(link=><a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div>
    </div>)}</div>
    <ol className="studio-usb-driver-steps">
      <li>Install a driver only when your computer reports it is missing, and choose the driver for the exact USB interface and operating system.</li>
      <li>Unplug and reconnect the board, then choose <strong>Connect / Choose USB port</strong> and grant this site access.</li>
      <li>For Arduino IDE, select the board and its port separately under <strong>Tools → Board</strong> and <strong>Tools → Port</strong>. The IDE and Studio cannot use the same serial port at the same time.</li>
    </ol>
    <p className="studio-usb-driver-footnote">Web Serial requires a secure HTTPS page and a supported browser, typically desktop Chrome or Edge. Some newer boards expose native USB and use a different driver path. If the port appears in Arduino IDE but not here, check browser support and site permission. If it appears in neither, check the cable, OS driver, board USB mode, and port permissions.</p>
  </details>;
}
