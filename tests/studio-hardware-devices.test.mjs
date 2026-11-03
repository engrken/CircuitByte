import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupHardwareDevices,hardwareDeviceState} from '../lib/studio-hardware-devices.mjs';
const wires=[['D11','SIM900A_RXD','conditional'],['D10','SIM900A_TXD','conditional'],['5V','SIM900A_VCC','power'],['GND','SIM900A_GND','ground']].map(([pin,to,kind])=>({pin,to,kind,net:to}));
test('Screenshot SIM900A terminals form one device without losing a connection',()=>{
 const devices=groupHardwareDevices(wires);
 assert.equal(devices.length,1);assert.equal(devices[0].name,'SIM900A');assert.equal(devices[0].type,'serial');
 assert.deepEqual(devices[0].rows.map(r=>r.to),wires.map(r=>r.to));
});
test('Explicit module instances remain separate and unknown labels stay intact',()=>{
 const devices=groupHardwareDevices(['SIM900A_1_RXD','SIM900A 1 TXD','SIM900A_2_RXD','Custom board A','Custom board B'].map(to=>({to})));
 assert.deepEqual(devices.map(d=>d.name),['SIM900A 1','SIM900A 2','Custom board A','Custom board B']);
 assert.equal(devices[0].rows.length,2);
});
test('UART and power-only devices never acquire invented boolean states',()=>{
 const device=groupHardwareDevices(wires)[0];
 for(const demo of [true,false])assert.equal(hardwareDeviceState(device,{demo,trigger:true,supported:true,output:{11:true,10:false}}),null);
 const [rail]=groupHardwareDevices([{pin:'5V',to:'LED VCC',kind:'power'}]);
 assert.equal(hardwareDeviceState(rail,{supported:true,output:{5:true}}),null);
});
test('Real modeled LED signals and stale-plan handling still work',()=>{
 const [led]=groupHardwareDevices([{pin:'D13',to:'LED anode',kind:'digital-output'},{pin:'GND',to:'LED cathode',kind:'ground'}]);
 const options={supported:true,output:{13:true},pinNumber:p=>p.replace('D','')};
 assert.equal(hardwareDeviceState(led,options),true);
 assert.equal(hardwareDeviceState(led,{...options,stale:true}),null);
});
