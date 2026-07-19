const fs = require('fs');

const isVisible = (address) => {
  if (address >= 0 && address <= 22) return true;
  if (address >= 27 && address <= 33) return true;
  if (address === 35) return true;
  if (address >= 48 && address <= 51) return true;
  if (address >= 89 && address <= 92) return true;
  return false;
};

const existingRegisters = [
  { address: 0, name: 'Device Activate', range: '0-1', mappedKey: 'deviceActive' },
  { address: 1, name: 'Motor 1 ON/OFF', range: '0-1', mappedKey: 'motor1Status' },
  { address: 2, name: 'Motor 2 ON/OFF', range: '0-1', mappedKey: 'motor2Status' },
  { address: 3, name: 'Motor 3 ON/OFF', range: '0-1', mappedKey: 'motor3Status' },
  { address: 4, name: 'Motor 4 ON/OFF', range: '0-1', mappedKey: 'motor4Status' },
  { address: 5, name: 'Input Power Fault Type', range: '0-5', description: '0 = INPUT POWER OK, 1 = R PHASE FAULT, 2 = Y PHASE FAULT, 3 = B PHASE FAULT, 4 = PHASE REVERSE, 5 = NO POWER', mappedKey: 'inputPowerFaultType' },
  { address: 6, name: 'Average Input Supply', range: '0-700', mappedKey: 'averageVoltage' },
  { address: 7, name: 'R-Y Voltage', range: '0-700', mappedKey: 'ryVoltage' },
  { address: 8, name: 'Y-B Voltage', range: '0-700', mappedKey: 'ybVoltage' },
  { address: 9, name: 'R-B Voltage', range: '0-700', mappedKey: 'rbVoltage' },
  { address: 10, name: 'Motor 1 R Phase Current', range: '0-250', mappedKey: 'motor1RCurrent' },
  { address: 11, name: 'Motor 1 Y Phase Current', range: '0-250', mappedKey: 'motor1YCurrent' },
  { address: 12, name: 'Motor 1 B Phase Current', range: '0-250', mappedKey: 'motor1BCurrent' },
  { address: 13, name: 'Motor 2 R Phase Current', range: '0-250', mappedKey: 'motor2RCurrent' },
  { address: 14, name: 'Motor 2 Y Phase Current', range: '0-250', mappedKey: 'motor2YCurrent' },
  { address: 15, name: 'Motor 2 B Phase Current', range: '0-250', mappedKey: 'motor2BCurrent' },
  { address: 16, name: 'Motor 3 R Phase Current', range: '0-250', mappedKey: 'motor3RCurrent' },
  { address: 17, name: 'Motor 3 Y Phase Current', range: '0-250', mappedKey: 'motor3YCurrent' },
  { address: 18, name: 'Motor 3 B Phase Current', range: '0-250', mappedKey: 'motor3BCurrent' },
  { address: 19, name: 'Motor 4 R Phase Current', range: '0-250', mappedKey: 'motor4RCurrent' },
  { address: 20, name: 'Motor 4 Y Phase Current', range: '0-250', mappedKey: 'motor4YCurrent' },
  { address: 21, name: 'Motor 4 B Phase Current', range: '0-250', mappedKey: 'motor4BCurrent' },
  { address: 22, name: 'INWL(DI1)', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch1' },
  { address: 23, name: 'Power Switch 1 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch2' },
  { address: 24, name: 'Power Switch 2 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch3' },
  { address: 25, name: 'Power Switch 3 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch4' },
  { address: 26, name: 'Power Switch 4 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch5' },
  { address: 27, name: 'Pressure Bar Value', range: '0-250', mappedKey: 'pressureBar' },
  { address: 28, name: 'Transmitter Connection', range: '0-1', description: '1=Connected, 0=Disconnected', mappedKey: 'transmitterConnected' },
  { address: 29, name: 'Pressure Bar Value in mA', range: '400-2000', mappedKey: 'pressuremA' },
  { address: 30, name: 'Delay for Pump ON', range: '0-1440', units: 'Seconds', mappedKey: 'pumpOnDelay' },
  { address: 31, name: 'Next Filling Time', range: '0-1440', units: 'Minutes', mappedKey: 'nextFillingTime' },
  { address: 32, name: 'Over Load Reset Delay', range: '0-1440', units: 'Minutes', mappedKey: 'overloadResetDelay' },
  { address: 33, name: 'Under Load Reset Delay', range: '0-1440', units: 'Minutes', mappedKey: 'underloadResetDelay' },
  { address: 34, name: 'VFD Reset After', range: '0-1440', units: 'Minutes', mappedKey: 'vfdResetAfter' },
  { address: 35, name: 'Under Ground Tank Full/Empty', range: '0-1', description: '0 = UNDERGROUND TANK WATER NOT AVAILABLE, 1 = UNDERGROUND TANK WATER AVAILABLE', mappedKey: 'waterAvailable' },
  { address: 36, name: 'Pressure Tank Pressure %', range: '0-100', units: '%', mappedKey: 'pressureTankPressure' },
  { address: 43, name: 'Pump 1 Fault Type', range: '0-5', mappedKey: 'pump1FaultType' },
  { address: 44, name: 'Pump 2 Fault Type', range: '0-5', mappedKey: 'pump2FaultType' },
  { address: 45, name: 'Pump 3 Fault Type', range: '0-5', mappedKey: 'pump3FaultType' },
  { address: 46, name: 'Pump 4 Fault Type', range: '0-5', mappedKey: 'pump4FaultType' },
  { address: 47, name: 'Motor 1 ON Time', range: '0-1440', mappedKey: 'motor1RunTime' },
  { address: 48, name: 'Motor 2 ON Time', range: '0-1440', mappedKey: 'motor2RunTime' },
  { address: 49, name: 'Motor 3 ON Time', range: '0-1440', mappedKey: 'motor3RunTime' },
  { address: 50, name: 'Motor 4 ON Time', range: '0-1440', mappedKey: 'motor4RunTime' },
  // Adding 51 which was missing but requested
  { address: 51, name: 'Unknown Register 51', range: '0-1440', mappedKey: null },
  { address: 89, name: 'Motor 1 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor1ConfigActivate' },
  { address: 90, name: 'Motor 2 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor2ConfigActivate' },
  { address: 91, name: 'Motor 3 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor3ConfigActivate' },
  { address: 92, name: 'Motor 4 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor4ConfigActivate' },
];

const existingMap = new Map();
existingRegisters.forEach(r => existingMap.set(r.address, r));

const newRegisters = [];
for (let i = 0; i <= 92; i++) {
  const visible = isVisible(i);
  let reg = existingMap.get(i);
  if (reg) {
    newRegisters.push({ ...reg, isVisible: visible });
  } else {
    newRegisters.push({
      address: i,
      name: `Register ${40000 + i}`,
      isVisible: visible
    });
  }
}

const outStr = `  const registerDefinitions = [\n` + newRegisters.map(r => {
  let str = `    { address: ${40000 + r.address}, name: '${r.name}', isVisible: ${r.isVisible}`;
  if (r.range) str += `, range: '${r.range}'`;
  if (r.description) str += `, description: '${r.description}'`;
  if (r.units) str += `, units: '${r.units}'`;
  if (r.mappedKey) str += `, mappedKey: '${r.mappedKey}'`;
  str += ` }`;
  return str;
}).join(',\n') + `\n  ];`;

fs.writeFileSync('generated_block.txt', outStr);
console.log('done');
