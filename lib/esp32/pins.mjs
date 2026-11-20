// Reference pin capabilities for a common classic ESP32 DevKit V1 (30-pin) layout.
// The generic Arduino "ESP32 Dev Module" target does not identify a physical PCB revision.
// Always verify silkscreen labels and the exact manufacturer's pinout before wiring.
export const ESP32_CLASSIC_REFERENCE = Object.freeze({
  id: 'esp32-classic-devkit-30',
  boardTarget: 'esp32:esp32:esp32',
  name: 'Classic ESP32 DevKit V1 · 30-pin reference',
  voltage: '3.3V GPIO',
  note: 'Reference only: generic ESP32 Dev Module can describe several PCB layouts. Match the labels on your exact board before connecting anything.',
  pins: [
    { gpio: 0, label: 'GPIO 0', group: 'strapping', capabilities: ['Digital I/O', 'PWM', 'ADC2'], restrictions: ['Boot strapping pin; external circuitry can prevent normal boot.'] },
    { gpio: 1, label: 'GPIO 1 · TX0', group: 'uart', capabilities: ['Digital I/O', 'UART0 TX', 'PWM'], restrictions: ['Used for USB serial programming and boot logs on many boards.'] },
    { gpio: 2, label: 'GPIO 2', group: 'strapping', capabilities: ['Digital I/O', 'PWM', 'ADC2'], restrictions: ['Boot strapping pin; onboard LED wiring varies by board.'] },
    { gpio: 3, label: 'GPIO 3 · RX0', group: 'uart', capabilities: ['Digital I/O', 'UART0 RX', 'PWM'], restrictions: ['Used for USB serial programming on many boards.'] },
    { gpio: 4, label: 'GPIO 4', group: 'general', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'Touch'], restrictions: ['ADC2 readings conflict with Wi-Fi use on classic ESP32.'] },
    { gpio: 5, label: 'GPIO 5', group: 'strapping', capabilities: ['Digital I/O', 'PWM', 'VSPI CS'], restrictions: ['Boot strapping pin; check attached peripherals during reset.'] },
    { gpio: 12, label: 'GPIO 12 · MTDI', group: 'strapping', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'Touch'], restrictions: ['Boot strapping pin selects flash voltage on common modules; avoid pulling it high at reset.'] },
    { gpio: 13, label: 'GPIO 13 · MTCK', group: 'general', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'Touch', 'JTAG'], restrictions: ['ADC2 readings conflict with Wi-Fi use on classic ESP32.'] },
    { gpio: 14, label: 'GPIO 14 · MTMS', group: 'general', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'Touch', 'JTAG'], restrictions: ['ADC2 readings conflict with Wi-Fi use on classic ESP32.'] },
    { gpio: 15, label: 'GPIO 15 · MTDO', group: 'strapping', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'Touch', 'JTAG'], restrictions: ['Boot strapping pin; check attached peripherals during reset.'] },
    { gpio: 16, label: 'GPIO 16', group: 'general', capabilities: ['Digital I/O', 'PWM', 'UART2'], restrictions: ['Some module variants reserve pins differently; verify the module datasheet.'] },
    { gpio: 17, label: 'GPIO 17', group: 'general', capabilities: ['Digital I/O', 'PWM', 'UART2'], restrictions: ['Some module variants reserve pins differently; verify the module datasheet.'] },
    { gpio: 18, label: 'GPIO 18 · SCK', group: 'spi', capabilities: ['Digital I/O', 'PWM', 'VSPI SCK'], restrictions: [] },
    { gpio: 19, label: 'GPIO 19 · MISO', group: 'spi', capabilities: ['Digital I/O', 'PWM', 'VSPI MISO'], restrictions: [] },
    { gpio: 21, label: 'GPIO 21 · SDA', group: 'i2c', capabilities: ['Digital I/O', 'PWM', 'Default I²C SDA'], restrictions: ['I²C pins are configurable; defaults are conventions, not fixed hardware wiring.'] },
    { gpio: 22, label: 'GPIO 22 · SCL', group: 'i2c', capabilities: ['Digital I/O', 'PWM', 'Default I²C SCL'], restrictions: ['I²C pins are configurable; defaults are conventions, not fixed hardware wiring.'] },
    { gpio: 23, label: 'GPIO 23 · MOSI', group: 'spi', capabilities: ['Digital I/O', 'PWM', 'VSPI MOSI'], restrictions: [] },
    { gpio: 25, label: 'GPIO 25', group: 'general', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'DAC1'], restrictions: ['ADC2 readings conflict with Wi-Fi use on classic ESP32.'] },
    { gpio: 26, label: 'GPIO 26', group: 'general', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'DAC2'], restrictions: ['ADC2 readings conflict with Wi-Fi use on classic ESP32.'] },
    { gpio: 27, label: 'GPIO 27', group: 'general', capabilities: ['Digital I/O', 'PWM', 'ADC2', 'Touch'], restrictions: ['ADC2 readings conflict with Wi-Fi use on classic ESP32.'] },
    { gpio: 32, label: 'GPIO 32', group: 'adc1', capabilities: ['Digital I/O', 'PWM', 'ADC1', 'Touch'], restrictions: [] },
    { gpio: 33, label: 'GPIO 33', group: 'adc1', capabilities: ['Digital I/O', 'PWM', 'ADC1', 'Touch'], restrictions: [] },
    { gpio: 34, label: 'GPIO 34', group: 'input-only', capabilities: ['Digital input', 'ADC1'], restrictions: ['Input only: no output, PWM or internal pull-up/pull-down.'] },
    { gpio: 35, label: 'GPIO 35', group: 'input-only', capabilities: ['Digital input', 'ADC1'], restrictions: ['Input only: no output, PWM or internal pull-up/pull-down.'] },
    { gpio: 36, label: 'GPIO 36 · SVP', group: 'input-only', capabilities: ['Digital input', 'ADC1'], restrictions: ['Input only: no output, PWM or internal pull-up/pull-down.'] },
    { gpio: 39, label: 'GPIO 39 · SVN', group: 'input-only', capabilities: ['Digital input', 'ADC1'], restrictions: ['Input only: no output, PWM or internal pull-up/pull-down.'] }
  ],
  reserved: [
    { label: 'GPIO 6–11', reason: 'Normally connected to module SPI flash. Do not use as general GPIO.' },
    { label: 'GPIO 20, 24, 28–31, 37–38', reason: 'Not exposed as general-purpose pins on this common reference layout.' }
  ]
});

export function getEsp32ReferencePin(gpio) {
  return ESP32_CLASSIC_REFERENCE.pins.find(pin => pin.gpio === Number(gpio)) || null;
}
