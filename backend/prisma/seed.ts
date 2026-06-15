import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "DeviceRegisterValue", "RegisterDefinition", "Device", "Building", "DeviceState", "DeviceSnapshot" CASCADE;`);

  console.log('Seeding buildings...');
  const buildings = await prisma.building.createMany({
    data: [
      { id: 1, name: 'A Building' },
      { id: 2, name: 'B Building' },
      { id: 3, name: 'C Building' },
      { id: 4, name: 'STP' },
    ],
  });

  console.log('Seeding devices...');

  const devices = [
    // A BUILDING
    { deviceId: '20260508012', name: 'Flushing Terrace Booster System', buildingId: 1, template: 'booster', systemName: 'Flushing Terrace Booster System', cardNo: '06' },
    { deviceId: '20260508045', name: 'Domestic Terrace Booster System', buildingId: 1, template: 'booster', systemName: 'Domestic Terrace Booster System', cardNo: '05' },

    // B BUILDING
    { deviceId: '2026051104', name: 'Sump Pump-05 (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Sump Pump-05 (Basement-03)' },
    { deviceId: '20260506027', name: 'Sump Pump-06 (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Sump Pump-06 (Basement-03)' },
    { deviceId: '20260506023', name: 'Sump Pump-03 (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Sump Pump-03 (Basement-03)' },
    { deviceId: '20260506029', name: 'Sump Pump-02 (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Sump Pump-02 (Basement-03)' },
    { deviceId: '20260506030', name: 'Sump Pump-01 (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Sump Pump-01 (Basement-03)' },
    { deviceId: '2026050913', name: 'Sump Pump-04 (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Sump Pump-04 (Basement-03)' },
    { deviceId: '2026050907', name: 'Sub Soil Pump-03 (Basement-01)', buildingId: 2, template: 'booster', systemName: 'Sub Soil Pump-03 (Basement-01)' },
    { deviceId: '2026050909', name: 'Sub Soil Pump-04 (Basement-01)', buildingId: 2, template: 'booster', systemName: 'Sub Soil Pump-04 (Basement-01)' },
    { deviceId: '202605034', name: 'Sub Soil Pump-02 (Basement-01)', buildingId: 2, template: 'booster', systemName: 'Sub Soil Pump-02 (Basement-01)' },
    { deviceId: '20260508013', name: 'Tower B Domestic System (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Tower B Domestic System (Basement-03)', cardNo: '07' },
    { deviceId: '20260526020', name: 'Tower A&C Domestic System (Basement-03)', buildingId: 2, template: 'booster', systemName: 'Tower A&C Domestic System (Basement-03)', cardNo: '08' },
    { deviceId: '2026050805', name: 'Flushing Terrace Booster System', buildingId: 2, template: 'booster', systemName: 'Flushing Terrace Booster System', cardNo: '06' },
    { deviceId: '20260508011', name: 'Domestic Terrace Booster System', buildingId: 2, template: 'booster', systemName: 'Domestic Terrace Booster System', cardNo: '05' },

    // C BUILDING - 10 devices
    { deviceId: '2026050910', name: 'SUB SOIL PUMP-01 (BASEMENT-01)', buildingId: 3, template: 'booster', systemName: 'SUB SOIL PUMP-01 (BASEMENT-01)' },
    { deviceId: '2026050904', name: 'SUB SOIL PUMP-02 (BASEMENT-01)', buildingId: 3, template: 'booster', systemName: 'SUB SOIL PUMP-02 (BASEMENT-01)' },
    { deviceId: '2026050902', name: 'SUB SOIL PUMP-03 (BASEMENT-01)', buildingId: 3, template: 'booster', systemName: 'SUB SOIL PUMP-03 (BASEMENT-01)' },
    { deviceId: '2026051111', name: 'SUB SOIL PUMP-04 (BASEMENT-01)', buildingId: 3, template: 'booster', systemName: 'SUB SOIL PUMP-04 (BASEMENT-01)' },
    { deviceId: '2026051133', name: 'SUMP PUMP-01 (BASEMENT-03)', buildingId: 3, template: 'booster', systemName: 'SUMP PUMP-01 (BASEMENT-03)' },
    { deviceId: '20260506036', name: 'SUMP PUMP-02 (BASEMENT-03)', buildingId: 3, template: 'booster', systemName: 'SUMP PUMP-02 (BASEMENT-03)' },
    { deviceId: '2026051115', name: 'SUMP PUMP-03 (BASEMENT-03)', buildingId: 3, template: 'booster', systemName: 'SUMP PUMP-03 (BASEMENT-03)' },
    { deviceId: '2026051127', name: 'SUMP PUMP-04 (BASEMENT-03)', buildingId: 3, template: 'booster', systemName: 'SUMP PUMP-04 (BASEMENT-03)' },
    { deviceId: '20260508010', name: 'FLUSHING TERRACE BOOSTER SYSTEM', buildingId: 3, template: 'booster', systemName: 'FLUSHING TERRACE BOOSTER SYSTEM', cardNo: '02' },
    { deviceId: '20260526021', name: 'DOMESTIC TERRACE BOOSTER SYSTEM', buildingId: 3, template: 'booster', systemName: 'DOMESTIC TERRACE BOOSTER SYSTEM', cardNo: '03' },

    // STP - 4 devices
    { deviceId: '2026050901', name: 'SUB SOIL PUMP-01 (STP)', buildingId: 4, template: 'booster', systemName: 'SUB SOIL PUMP-01 (STP)' },
    { deviceId: '20260223035', name: 'TOWER B FLUSHING SYSTEM', buildingId: 4, template: 'booster', systemName: 'TOWER B FLUSHING SYSTEM' },
    { deviceId: '2026052022', name: 'TOWER A&C FLUSHING SYSTEM', buildingId: 4, template: 'booster', systemName: 'TOWER A&C FLUSHING SYSTEM' },
    { deviceId: '2026526023', name: 'GARDAN SYSTEM', buildingId: 4, template: 'booster', systemName: 'GARDAN SYSTEM' },
  ];

  await prisma.device.createMany({
    data: devices.map(d => ({
      ...d,
      topic: `AGC/SE-${d.deviceId}`
    })),
  });

  console.log('Seeding register definitions...');

  // NOTE: The latest BMS Register Mapping document is the authoritative source of truth
  // for all register definitions, addresses, descriptions, ranges, and mapped keys.
  const registerDefinitions = [
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
    { address: 22, name: 'Pressure Switch 1 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch1' },
    { address: 23, name: 'Pressure Switch 2 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch2' },
    { address: 24, name: 'Pressure Switch 3 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch3' },
    { address: 25, name: 'Pressure Switch 4 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch4' },
    { address: 26, name: 'Pressure Switch 5 ON/OFF', range: '0-1', description: '1=ON, 0=OFF', mappedKey: 'pressureSwitch5' },
    { address: 27, name: 'Pressure Bar Value', range: '0-250', mappedKey: 'pressureBar' },
    { address: 28, name: 'Transmitter Connection', range: '0-1', description: '1=Connected, 0=Disconnected', mappedKey: 'transmitterConnected' },
    { address: 29, name: 'Pressure Bar Value in mA', range: '400-2000', mappedKey: 'pressuremA' },
    { address: 30, name: 'Delay for Pump ON', range: '0-1440', units: 'Seconds', mappedKey: 'pumpOnDelay' },
    { address: 31, name: 'Next Filling Time', range: '0-1440', units: 'Minutes', mappedKey: 'nextFillingTime' },
    { address: 32, name: 'Over Load Reset Delay', range: '0-1440', units: 'Minutes', mappedKey: 'overloadResetDelay' },
    { address: 33, name: 'Under Load Reset Delay', range: '0-1440', units: 'Minutes', mappedKey: 'underloadResetDelay' },
    { address: 34, name: 'VFD Reset After', range: '0-1440', units: 'Minutes', mappedKey: 'vfdResetAfter' },
    { address: 35, name: 'Under Ground Tank Full/Empty', range: '0-1', description: '0 = INLET WATER NOT AVAILABLE, 1 = INLET WATER AVAILABLE', mappedKey: 'waterAvailable' },
    { address: 36, name: 'Pressure Tank Pressure %', range: '0-100', units: '%', mappedKey: 'pressureTankPressure' },
    { address: 43, name: 'Pump 1 Fault Type', range: '0-5', mappedKey: 'pump1FaultType' },
    { address: 44, name: 'Pump 2 Fault Type', range: '0-5', mappedKey: 'pump2FaultType' },
    { address: 45, name: 'Pump 3 Fault Type', range: '0-5', mappedKey: 'pump3FaultType' },
    { address: 46, name: 'Pump 4 Fault Type', range: '0-5', mappedKey: 'pump4FaultType' },
    { address: 47, name: 'Motor 1 ON Time', range: '0-1440', mappedKey: 'motor1RunTime' },
    { address: 48, name: 'Motor 2 ON Time', range: '0-1440', mappedKey: 'motor2RunTime' },
    { address: 49, name: 'Motor 3 ON Time', range: '0-1440', mappedKey: 'motor3RunTime' },
    { address: 50, name: 'Motor 4 ON Time', range: '0-1440', mappedKey: 'motor4RunTime' },
    { address: 89, name: 'Motor 1 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor1ConfigActivate' },
    { address: 90, name: 'Motor 2 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor2ConfigActivate' },
    { address: 91, name: 'Motor 3 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor3ConfigActivate' },
    { address: 92, name: 'Motor 4 Activate/Deactivate', range: '0-1', description: '0 = OFF, 1 = ON', mappedKey: 'motor4ConfigActivate' },
  ];

  await prisma.registerDefinition.createMany({
    data: registerDefinitions
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
