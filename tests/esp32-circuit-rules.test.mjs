import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewElectricalDesign} from '../lib/studio-electrical-verification.mjs';

test('classic ESP32 rejects input-only GPIO when used as an output',()=>{
 const result=reviewElectricalDesign({board:'esp32:esp32:esp32',connections:[{pin:'GPIO34',to:'LED anode',net:'led',kind:'digital-output'}]});
 assert.equal(result.status,'failed');
 assert.ok(result.findings.some(f=>f.code==='INPUT_ONLY_PIN'));
});

test('classic ESP32 rejects flash-connected GPIO 6 through 11 as ordinary board pins',()=>{
 const result=reviewElectricalDesign({board:'esp32:esp32:esp32',connections:[{pin:'GPIO6',to:'LED anode',net:'led',kind:'digital-output'}]});
 assert.equal(result.status,'failed');
 assert.ok(result.findings.some(f=>f.code==='PIN_UNKNOWN'));
});

test('classic ESP32 warns when an attached circuit uses a boot strapping pin',()=>{
 const result=reviewElectricalDesign({board:'esp32:esp32:esp32',connections:[{pin:'GPIO12',to:'sensor signal',net:'sensor',kind:'digital-input'}]});
 assert.ok(result.findings.some(f=>f.code==='BOOT_STRAPPING_PIN'));
 assert.ok(result.findings.some(f=>f.code==='BOARD_PINOUT_UNVERIFIED'));
 assert.equal(result.hardwareValidated,false);
});

test('classic ESP32 warns about UART0 pins being shared with USB programming',()=>{
 const result=reviewElectricalDesign({board:'esp32:esp32:esp32',connections:[{pin:'GPIO1',to:'module RX',net:'uart-tx',kind:'digital-output'}]});
 assert.ok(result.findings.some(f=>f.code==='UART0_PIN_CONFLICT'));
});

test('classic ESP32 warns about ADC2 when an analog input is assigned',()=>{
 const result=reviewElectricalDesign({board:'esp32:esp32:esp32',connections:[{pin:'GPIO25',to:'potentiometer wiper',net:'analog',kind:'analog-input'}]});
 assert.ok(result.findings.some(f=>f.code==='ADC2_WIFI_CONFLICT'));
});

test('classic ESP32 accepts ADC1 analog pins as the preferred Wi-Fi-compatible input group',()=>{
 const result=reviewElectricalDesign({board:'esp32:esp32:esp32',connections:[{pin:'GPIO34',to:'sensor output',net:'analog',kind:'analog-input'}]});
 assert.ok(!result.findings.some(f=>f.code==='ADC2_WIFI_CONFLICT'));
 assert.ok(!result.findings.some(f=>f.code==='PIN_UNKNOWN'));
});

test('ESP32-S3 static review blocks input-only GPIO46 output and warns about USB and flash variants',()=>{
 const output=reviewElectricalDesign({board:'esp32:esp32:esp32s3',connections:[{pin:'GPIO46',to:'LED anode',net:'led',kind:'digital-output'}]});
 assert.equal(output.status,'failed');
 assert.ok(output.findings.some(f=>f.code==='INPUT_ONLY_PIN'));
 const usb=reviewElectricalDesign({board:'esp32:esp32:esp32s3',connections:[{pin:'GPIO19',to:'sensor signal',net:'sig',kind:'digital-input'}]});
 assert.ok(usb.findings.some(f=>f.code==='USB_PIN_CONFLICT'));
 const flash=reviewElectricalDesign({board:'esp32:esp32:esp32s3',connections:[{pin:'GPIO36',to:'sensor signal',net:'sig',kind:'digital-input'}]});
 assert.ok(flash.findings.some(f=>f.code==='S3_FLASH_PSRAM_PIN'));
});

test('ESP32-C3 rejects unexposed flash GPIO and warns about strap, USB and UART pins',()=>{
 const flash=reviewElectricalDesign({board:'esp32:esp32:esp32c3',connections:[{pin:'GPIO12',to:'LED anode',net:'led',kind:'digital-output'}]});
 assert.ok(flash.findings.some(f=>f.code==='PIN_UNKNOWN'));
 const strap=reviewElectricalDesign({board:'esp32:esp32:esp32c3',connections:[{pin:'GPIO9',to:'button signal',net:'button',kind:'digital-input'}]});
 assert.ok(strap.findings.some(f=>f.code==='BOOT_STRAPPING_PIN'));
 const usb=reviewElectricalDesign({board:'esp32:esp32:esp32c3',connections:[{pin:'GPIO18',to:'sensor signal',net:'sig',kind:'digital-input'}]});
 assert.ok(usb.findings.some(f=>f.code==='USB_PIN_CONFLICT'));
 const uart=reviewElectricalDesign({board:'esp32:esp32:esp32c3',connections:[{pin:'GPIO20',to:'module RX',net:'uart',kind:'digital-output'}]});
 assert.ok(uart.findings.some(f=>f.code==='UART0_PIN_CONFLICT'));
});
