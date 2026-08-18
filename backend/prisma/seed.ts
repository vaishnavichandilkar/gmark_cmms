import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "DeviceRegisterValue", "RegisterDefinition", "Device", "Building", "DeviceState", "DeviceSnapshot", "Society", "User", "UserBuilding", "AuditLog" CASCADE;`);

  console.log('Seeding societies...');
  await prisma.society.createMany({
    data: [
      {
        id: 4,
        name: 'Gera Imperium',
        city: 'Pune',
      },
      {
        id: 5,
        name: 'AGC House',
        city: 'Pune',
      }
    ]
  });

  console.log('Seeding buildings...');
  await prisma.building.createMany({
    data: [
      { id: 1, name: 'A Building', societyId: 4, info: '12F - 132 flats' },
      { id: 2, name: 'B Building', societyId: 4, info: '3F - 3 flats' },
      { id: 3, name: 'C Building', societyId: 4, info: '9F - 315 flats' },
      { id: 4, name: 'STP', societyId: 4, info: '1F - 0 flats' },
      { id: 5, name: 'Building A', societyId: 5, info: 'TBD' },
    ],
  });

  console.log('Seeding devices...');

  const devices = [
    // A BUILDING
    { deviceId: '20260508012', name: 'Flushing Terrace Booster System', buildingId: 1, template: 'booster', systemName: 'Flushing Terrace Booster System', cardNo: '06' },
    { deviceId: '20260508045', name: 'Domestic Terrace Booster System', buildingId: 1, template: 'booster', systemName: 'Domestic Terrace Booster System', cardNo: '05' },
    { deviceId: '20260813001', name: 'Main Fire Panel System', buildingId: 1, template: 'fire-panel', systemName: 'Main Fire Panel System', cardNo: '01' },

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

    // NEW DEVICES
    { deviceId: '3004202546', name: 'Fire Panel System 3004202546', buildingId: 1, template: 'fire-panel', systemName: 'Fire Panel System 3004202546', cardNo: '02' },
    { deviceId: '3004202547', name: 'Fire Panel System 3004202547', buildingId: 1, template: 'fire-panel', systemName: 'Fire Panel System 3004202547', cardNo: '03' },
    
    // AGC HOUSE
    { deviceId: '2806202501', name: 'Free Demo Kit', buildingId: 5, template: 'fire-panel', systemName: 'Free Demo Kit' },
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
    { address: 40000, name: 'Device Activate', range: '0-1', description: 'if you send 0 then device stop there working', mappedKey: 'deviceActive' },
    { address: 40001, name: 'Motor 1 ON / OFF', range: '0-1', description: '1= motor on 0= motor off', mappedKey: 'motor1Status' },
    { address: 40002, name: 'Motor 2 ON / OFF', range: '0-1', description: '1= motor on 0= motor off', mappedKey: 'motor2Status' },
    { address: 40003, name: 'Motor 3 ON / OFF', range: '0-1', description: '1= motor on 0= motor off', mappedKey: 'motor3Status' },
    { address: 40004, name: 'Motor 4 ON / OFF', range: '0-1', description: '1= motor on 0= motor off', mappedKey: 'motor4Status' },
    { address: 40005, name: 'Input Power Falut Type', range: '0-5', description: '0=Input Power ok, 1=R Phase faulty, 2=Y Phase faulty, 3=B Phase faulty, 4=Phase Reverse, 5=No Power', mappedKey: 'inputPowerFaultType' },
    { address: 40006, name: 'Avarage Input Supply', range: '0-700', units: 'VOLT', description: 'total input voltage of incoming supply', mappedKey: 'averageVoltage' },
    { address: 40007, name: 'R-Y Voltage', range: '0-700', units: 'VOLT', description: 'TOTAL VOLATE BETWEEN R PHASE AND Y PHASE', mappedKey: 'ryVoltage' },
    { address: 40008, name: 'Y-B Voltage', range: '0-700', units: 'VOLT', description: 'TOTAL VOLATE BETWEEN Y PHASE AND B PHASE', mappedKey: 'ybVoltage' },
    { address: 40009, name: 'R-B Voltage', range: '0-700', units: 'VOLT', description: 'TOTAL VOLATE BETWEEN R PHASE AND B PHASE', mappedKey: 'rbVoltage' },
    { address: 40010, name: 'MOTOR 1 R Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 1 R PHASE CURRENT', mappedKey: 'motor1RCurrent' },
    { address: 40011, name: 'MOTOR 1 Y Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 1 Y PHASE CURRENT', mappedKey: 'motor1YCurrent' },
    { address: 40012, name: 'MOTOR 1 B Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 1 B PHASE CURRENT', mappedKey: 'motor1BCurrent' },
    { address: 40013, name: 'MOTOR 2 R Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 2 R PHASE CURRENT', mappedKey: 'motor2RCurrent' },
    { address: 40014, name: 'MOTOR 2 Y Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 2 Y PHASE CURRENT', mappedKey: 'motor2YCurrent' },
    { address: 40015, name: 'MOTOR 2 B Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 2 B PHASE CURRENT', mappedKey: 'motor2BCurrent' },
    { address: 40016, name: 'MOTOR 3 R Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 3 R PHASE CURRENT', mappedKey: 'motor3RCurrent' },
    { address: 40017, name: 'MOTOR 3 Y Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 3 Y PHASE CURRENT', mappedKey: 'motor3YCurrent' },
    { address: 40018, name: 'MOTOR 3 B Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 3 B PHASE CURRENT', mappedKey: 'motor3BCurrent' },
    { address: 40019, name: 'MOTOR 4 R Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 4 R PHASE CURRENT', mappedKey: 'motor4RCurrent' },
    { address: 40020, name: 'MOTOR 4 Y Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 4 Y PHASE CURRENT', mappedKey: 'motor4YCurrent' },
    { address: 40021, name: 'MOTOR 4 B Phase Current', range: '0-250', units: 'AMP', description: 'MOTOR 4 B PHASE CURRENT', mappedKey: 'motor4BCurrent' },
    { address: 40022, name: 'INWL(DI1)', range: '0-1', units: 'ALARAM / STATUS', description: '1---WATER AVAILABLE IN GROUND TANK 0-- WATER NOT-AVAILABLE IN GROUND TANK', mappedKey: 'pressureSwitch1' },
    { address: 40023, name: 'Power Switch 1', range: '0-1', units: 'ALARAM / STATUS', description: 'IF 94 ADDRESS HAVE \'0\' THEN SHOW THIS ( 0= PRESSURE SWITCH 1 OFF, 1= PRESSURE SWITCH 1 ON) | IF 94 ADDRESS HAVE \'1\' AND 87 ADDRESS HAVE \'0\' THEN SHOW THIS (0---PUMP 1 SWITCH IN AUTO MODE 1-- PUMP 1 SWITCH POSITION IN MNAUAL MODE OR OFF) | IF 94 ADDRESS HAVE \'1\' AND 87 ADDRESS HAVE \'1\' THEN SHOW THIS (0---PUMP 1 IS OVER HEATING , 1-- PUMP 1 IS RUNING IN HEATHY CONDITION )', mappedKey: 'pressureSwitch2' },
    { address: 40024, name: 'Power Switch 2', range: '0-1', units: 'ALARAM / STATUS', description: 'IF 94 ADDRESS HAVE \'0\' AND 87 ADDRESS HAVE \'0\' THEN SHOW THIS (0= PRESSURE SWITCH 2 OFF, 1= PRESSURE SWITCH 2 ON) | IF 94 ADDRESS HAVE \'1\' AND 87 ADDRESS HAVE \'0\' THEN SHOW THIS (0---PUMP 2 SWITCH IN AUTO MODE 1-- PUMP 2 SWITCH POSITION IN MNAUAL MODE OR OFF) | IF 94 ADDRESS HAVE \'1\' AND 87 ADDRESS HAVE \'1\' THEN SHOW THIS (0---PUMP 2 IS OVER HEATING , 1-- PUMP 2 IS RUNING IN HEATHY CONDITION )', mappedKey: 'pressureSwitch3' },
    { address: 40025, name: 'Power Switch 3', range: '0-1', units: 'ALARAM / STATUS', description: 'IF 94 ADDRESS HAVE \'0\' AND ALSO 87 ADRRESS IS \'0\' THEN SHOW THIS ( 0= PUMP 1 SWITCH IN AUTO MODE, 1=PUMP 1 SWITCH IN MUAL OR OFF MODE ) | IF 94 ADDRESS HAVE \'0\' AND ALSO 87 ADRRESS IS \'1\' THEN SHOW THIS ( 0= PUMP 1 OVERHEAT FAUT OCCURES , 1=PUMP 1 RUNING IN HEATHY MODE ) | IF 94 ADDRESS HAVE \'1\' AND ALSO 87 ADRRESS IS \'1\' THEN SHOW THIS ( 0= PUMP 3 OVERHEAT FAUT OCCURES , 1=PUMP 3 RUNING IN HEATHY MODE ) | IF 94 ADDRESS HAVE \'1\' AND ALSO 87 ADRRESS IS \'0\' THEN SHOW THIS ( 0= PUMP 3 SWITCH POSITION IN AUTO MODE , 1=PUMP 3 SWITCH POSITION IN MNAUAL MODE OR OFF )', mappedKey: 'pressureSwitch4' },
    { address: 40026, name: 'Power Switch 4', range: '0-1', units: 'ALARAM / STATUS', description: 'IF 94 ADDRESS HAVE \'0\' AND ALSO 87 ADRRESS IS \'0\' THEN SHOW THIS ( 0= PUMP 2 SWITCH IN AUTO MODE, 1=PUMP 2 SWITCH IN MUAL OR OFF MODE ) | IF 94 ADDRESS HAVE \'0\' AND ALSO 87 ADRRESS IS \'1\' THEN SHOW THIS ( 0= PUMP 2 OVERHEAT FAUT OCCURES , 1=PUMP 2 RUNING IN HEATHY MODE )', mappedKey: 'pressureSwitch5' },
    { address: 40027, name: 'Pressure Bar Value', range: '0-250', units: 'BAR', description: 'HOW MANY PRESSURE IN LINE / ATUAL READING OF PRESURE TRANSMITTER', mappedKey: 'pressureBar' },
    { address: 40028, name: 'Transmitter Connection', units: 'ALARAM / STATUS', description: '1= PRESSURE TRANSMITTER CONNECTED 0= PRESURE TRANSMITTER NOT CONNECTED', mappedKey: 'transmitterConnected' },
    { address: 40029, name: 'Pressure Bar Value in mA', range: '400-2000', units: 'mA', description: 'HOW MANY PRESSURE IN LINE/ACTUAL PRESURE READING IN MILI AMP', mappedKey: 'pressuremA' },
    { address: 40030, name: 'NEXT PUMP ON DELAY', range: '0-1440', units: 'SEC', description: 'in Second', mappedKey: 'pumpOnDelay' },
    { address: 40031, name: 'NEXT Filling Time', range: '0-1440', units: 'MIN', description: 'in min', mappedKey: 'nextFillingTime' },
    { address: 40032, name: 'Over Load Reset Delay', range: '0-1440', units: 'MIN', description: 'in min', mappedKey: 'overloadResetDelay' },
    { address: 40033, name: 'Under Load Reset Delay', range: '0-1440', units: 'MIN', description: 'in min', mappedKey: 'underloadResetDelay' },
    { address: 40034, name: 'Register 40034', mappedKey: 'vfdResetAfter' },
    { address: 40035, name: 'Under Ground Tank Full / Empty', range: '0/100', units: 'ALARAM / STATUS', description: '0= INLATE WATER NOT AVAILABLE, 100= INLATE WATER AVAILABLE', mappedKey: 'waterAvailable' },
    { address: 40036, name: 'Register 40036', mappedKey: 'pressureTankPressure' },
    { address: 40037, name: 'Register 40037' },
    { address: 40038, name: 'PUMP 1 STATUS', range: '1-21', units: 'ALARAM / STATUS', description: '1-PUMP 1 IN SWITCN IN AUTO POSITION BUT PUMP IN OFF SATATE 11-PUMP 1 IN SWITCN IN AUTO POSITION BUT PUMP IN ON CONDITION 10- PUMP IN FALUT MODE IN AUTO CONDITION 2-PUMP 1 SWITCH IN OFF CONDITION 22-PUMP 1 SWITCH IN MANUAL AND RUNNING 20-PUMP IN FALUT MODE MANUAL CONDITION' },
    { address: 40039, name: 'PUMP2 STATUS', range: '1-21', units: 'ALARAM / STATUS', description: '1-PUMP 2 IN SWITCN IN AUTO POSITION BUT PUMP IN OFF SATATE 11-PUMP 2 IN SWITCN IN AUTO POSITION BUT PUMP IN ON CONDITION 10- PUMP 2 IN FALUT MODE IN AUTO CONDITION 2-PUMP 2 SWITCH IN OFF CONDITION 22-PUMP 2 SWITCH IN MANUAL AND RUNNING 20-PUMP 2 IN FALUT MODE MANUAL CONDITION' },
    { address: 40040, name: 'PUMP3 STATUS', range: '1-21', units: 'ALARAM / STATUS', description: '1-PUMP 3 IN SWITCN IN AUTO POSITION BUT PUMP IN OFF SATATE 11-PUMP 3 IN SWITCN IN AUTO POSITION BUT PUMP IN ON CONDITION 10- PUMP IN FALUT MODE IN AUTO CONDITION 2-PUMP 3 SWITCH IN OFF CONDITION 22-PUMP 3 SWITCH IN MANUAL AND RUNNING 20-PUMP IN FALUT MODE MANUAL CONDITION' },
    { address: 40041, name: 'PUMP 4 STATUS', range: '1-21', units: 'ALARAM / STATUS', description: '1-PUMP 1 IN SWITCN IN AUTO POSITION BUT PUMP IN OFF SATATE 11-PUMP 1 IN SWITCN IN AUTO POSITION BUT PUMP IN ON CONDITION 10- PUMP IN FALUT MODE IN AUTO CONDITION 2-PUMP 1 SWITCH IN OFF CONDITION 22-PUMP 1 SWITCH IN MANUAL AND RUNNING 20-PUMP IN FALUT MODE MANUAL CONDITION' },
    { address: 40042, name: 'MOTOR_FAULT_POWER', range: '1-6', units: 'ALARAM', description: '0-POWER OK 1- R PHASE FALUT 2-Y PHASE FALUT 3-B PHASE FALUT 4-PHASE REVERSE 5-NO POWER 6-OVER VOLATGE 7-UNDER VOLATGE' },
    { address: 40043, name: 'Pump 1 Fault type', range: '0-5', units: 'ALARAM', description: '(AUTO) 0-NO FLAUT 4-DRY RUN 41-R PHASE CURRENT BELWO SET POINT 42-Y PHASE CURRENT BELOW SET POINT 43-B PHASE CURRENT BELOW SET POINT 5-OVER CURRENT 51-R PHASR OVER CURRENT 52-Y PHASE OVER CURRENT 53-B PHASE OVER CURRENT 8-OVER HEATING 9-WATER LEKAGE IN PUMP (MANUAL) 0-NO FLAUT 40-DRY RUN 410-R PHASE CURRENT BELWO SET POINT 420-Y PHASE CURRENT BELOW SET POINT 430-B PHASE CURRENT BELOW SET POINT 50-OVER CURRENT 510-R PHASR OVER CURRENT 520-Y PHASE OVER CURRENT 530-B PHASE OVER CURRENT 80-OVER HEATING 90-WATER LEKAGE IN PUMP', mappedKey: 'pump1FaultType' },
    { address: 40044, name: 'Pump 2 Fault type', range: '0-5', units: 'ALARAM', description: '(AUTO) 0-NO FLAUT 4-DRY RUN 41-R PHASE CURRENT BELWO SET POINT 42-Y PHASE CURRENT BELOW SET POINT 43-B PHASE CURRENT BELOW SET POINT 5-OVER CURRENT 51-R PHASR OVER CURRENT 52-Y PHASE OVER CURRENT 53-B PHASE OVER CURRENT 8-OVER HEATING 9-WATER LEKAGE IN PUMP (MANUAL) 0-NO FLAUT 40-DRY RUN 410-R PHASE CURRENT BELWO SET POINT 420-Y PHASE CURRENT BELOW SET POINT 430-B PHASE CURRENT BELOW SET POINT 50-OVER CURRENT 510-R PHASR OVER CURRENT 520-Y PHASE OVER CURRENT 530-B PHASE OVER CURRENT 80-OVER HEATING 90-WATER LEKAGE IN PUMP', mappedKey: 'pump2FaultType' },
    { address: 40045, name: 'Pump 3 Fault type', range: '0-5', units: 'ALARAM', description: '(AUTO) 0-NO FLAUT 4-DRY RUN 41-R PHASE CURRENT BELWO SET POINT 42-Y PHASE CURRENT BELOW SET POINT 43-B PHASE CURRENT BELOW SET POINT 5-OVER CURRENT 51-R PHASR OVER CURRENT 52-Y PHASE OVER CURRENT 53-B PHASE OVER CURRENT 8-OVER HEATING 9-WATER LEKAGE IN PUMP (MANUAL) 0-NO FLAUT 40-DRY RUN 410-R PHASE CURRENT BELWO SET POINT 420-Y PHASE CURRENT BELOW SET POINT 430-B PHASE CURRENT BELOW SET POINT 50-OVER CURRENT 510-R PHASR OVER CURRENT 520-Y PHASE OVER CURRENT 530-B PHASE OVER CURRENT 80-OVER HEATING 90-WATER LEKAGE IN PUMP', mappedKey: 'pump3FaultType' },
    { address: 40046, name: 'Pump 4 Fault type', range: '0-5', units: 'ALARAM', description: '(AUTO) 0-NO FLAUT 4-DRY RUN 41-R PHASE CURRENT BELWO SET POINT 42-Y PHASE CURRENT BELOW SET POINT 43-B PHASE CURRENT BELOW SET POINT 5-OVER CURRENT 51-R PHASR OVER CURRENT 52-Y PHASE OVER CURRENT 53-B PHASE OVER CURRENT 8-OVER HEATING 9-WATER LEKAGE IN PUMP (MANUAL) 0-NO FLAUT 40-DRY RUN 410-R PHASE CURRENT BELWO SET POINT 420-Y PHASE CURRENT BELOW SET POINT 430-B PHASE CURRENT BELOW SET POINT 50-OVER CURRENT 510-R PHASR OVER CURRENT 520-Y PHASE OVER CURRENT 530-B PHASE OVER CURRENT 80-OVER HEATING 90-WATER LEKAGE IN PUMP', mappedKey: 'pump4FaultType' },
    { address: 40047, name: 'Register 40047', mappedKey: 'motor1RunTime' },
    { address: 40048, name: 'Motor 1 On Time', range: '0-1440', units: 'STATUS', description: 'motor run time maximum run time is 1440 that was 24 hour in day', mappedKey: 'motor2RunTime' },
    { address: 40049, name: 'Motor 2 On Time', range: '0-1440', units: 'STATUS', description: 'motor run time maximum run time is 1440 that was 24 hour in day', mappedKey: 'motor3RunTime' },
    { address: 40050, name: 'Motor 3 On Time', range: '0-1440', units: 'STATUS', description: 'motor run time maximum run time is 1440 that was 24 hour in day', mappedKey: 'motor4RunTime' },
    { address: 40051, name: 'Motor 4 On Time', range: '0-1440', units: 'STATUS', description: 'motor run time maximum run time is 1440 that was 24 hour in day' },
    { address: 40052, name: 'PUMP 1 TOTAL CURRENT', range: '0-100', units: 'AMP', description: 'PUMP 1 TOTAL CURRENT OF R,Y,B PHASE' },
    { address: 40053, name: 'PUMP 2 TOTAL CURRENT', range: '0-100', units: 'AMP', description: 'PUMP 2 TOTAL CURRENT OF R,Y,B PHASE' },
    { address: 40054, name: 'PUMP 3 TOTAL CURRENT', range: '0-100', units: 'AMP', description: 'PUMP 3 TOTAL CURRENT OF R,Y,B PHASE' },
    { address: 40055, name: 'PUMP 4 TOTAL CURRENT', range: '0-100', units: 'AMP', description: 'PUMP 4 TOTAL CURRENT OF R,Y,B PHASE' },
    { address: 40056, name: 'TOTAL CURRENT OF SYSTEM', range: '0-400', units: 'AMP', description: 'TOTAL CURRENT OF ALL 4 PUMP' },
    { address: 40057, name: '-' },
    { address: 40058, name: '-' },
    { address: 40059, name: '-' },
    { address: 40060, name: '-' },
    { address: 40061, name: '-' },
    { address: 40062, name: '-' },
    { address: 40063, name: '-' },
    { address: 40064, name: '-' },
    { address: 40065, name: '-' },
    { address: 40066, name: 'PUMP CHANGE OVER TIME', range: '0-1440', units: 'MIN', description: 'MAXIMUM MIN IS 1440 THAT IS 24 HOUR' },
    { address: 40067, name: '-' },
    { address: 40068, name: '-' },
    { address: 40069, name: '-' },
    { address: 40070, name: '-' },
    { address: 40071, name: 'Lower Voltage setting', range: '0-700', units: 'VOLT', description: 'LOW VOLTAGE SETTING OF CONTROLLER WHEN VOLTAGE GOES DOWN THAN THAT THEN SYSTEM OFF PUMP' },
    { address: 40072, name: 'Upper Voltage setting', range: '0-700', units: 'VOLT', description: 'HIGH VOLTAGE SETTING OF CONTROLLER WHEN VOLTAGE GOES DOWN THAN THAT THEN SYSTEM OFF PUMP' },
    { address: 40073, name: 'Motor 1 Upper Current Setting', range: '0-500', units: 'AMP', description: 'MOTOR 1 UPPER CURRENT SET' },
    { address: 40074, name: 'Motor 1 Lower Current Setting', range: '0-501', units: 'AMP', description: 'MOTOR 1 LOWER CURRENT SET' },
    { address: 40075, name: 'Motor 2 Upper Current Setting', range: '0-502', units: 'AMP', description: 'MOTOR 2 UPPER CURRENT SET' },
    { address: 40076, name: 'Motor 2 Lower Current Setting', range: '0-503', units: 'AMP', description: 'MOTOR 2 LOWER CURRENT SET' },
    { address: 40077, name: 'Motor 3 Upper Current Setting', range: '0-504', units: 'AMP', description: 'MOTOR 3 UPPER CURRENT SET' },
    { address: 40078, name: 'Motor 3 Lower Current Setting', range: '0-505', units: 'AMP', description: 'MOTOR 3 LOWER CURRENT SET' },
    { address: 40079, name: 'Motor 4 Upper Current Setting', range: '0-506', units: 'AMP', description: 'MOTOR 4 UPPER CURRENT SET' },
    { address: 40080, name: 'Motor 4 Lower Current Setting', range: '0-507', units: 'AMP', description: 'MOTOR 4 LOWER CURRENT SET' },
    { address: 40081, name: 'Next Pump On Delay Setting', range: '0-1440', units: 'MIN', description: 'THE TIME BETWEEN TWO PUMPS ON THAT TIME IS THIS SEETING EX. THE FIRST PUMP ON AND WE SET 10SEC THEN NEXT PUMP ON 10 SEC LATER (TIME IN SEC)' },
    { address: 40082, name: 'Next Filling Time setting', range: '0-1440', units: 'MIN', description: 'WHEN ALL TANKS FILL THEN HOW MANY TIME ARE NOT ON THE SYSTEM AGAIN IF A SIGNAL COME THEN WAIT FOR TIMMER END (TIMMER IN HOUR:MIN)' },
    { address: 40083, name: 'Over Load Reset Delay Setting', range: '0-1440', units: 'MIN', description: 'CLEAR THE FLAUT AFTER TIMMER END' },
    { address: 40084, name: 'Under Load Reset Delay Setting', range: '0-1440', units: 'MIN', description: 'CLEAR THE FLAUT AFTER TIMMER END' },
    { address: 40085, name: 'Number Of PUMPS IN STATER', range: '1-4', description: 'NUMBER OF MOTOR PANEL' },
    { address: 40086, name: 'TYPE OF MOTOR', range: '3 & 1', units: 'PHASE', description: 'SYSTEM TYPE 3PHASE OR 1 PHASE' },
    { address: 40087, name: 'Temp Sensor', range: '0/1', description: '0-DEACTIVATE 1-ACTIVATE' },
    { address: 40088, name: 'PASSWORD', range: '0-9999', description: 'PASSWORD FOR ENTRING TO SEETING' },
    { address: 40089, name: 'Motor 1 Activate / De-Activate', range: '0/1', description: '1=ACTIVATE MOTOR AND 0=MOTOR DEACTIVATE', mappedKey: 'motor1ConfigActivate' },
    { address: 40090, name: 'Motor 2 Activate / De-Activate', range: '0/2', description: '1=ACTIVATE MOTOR AND 0=MOTOR DEACTIVATE', mappedKey: 'motor2ConfigActivate' },
    { address: 40091, name: 'Motor 3 Activate / De-Activate', range: '0/3', description: '1=ACTIVATE MOTOR AND 0=MOTOR DEACTIVATE', mappedKey: 'motor3ConfigActivate' },
    { address: 40092, name: 'Motor 4 Activate / De-Activate', range: '0/4', description: '1=ACTIVATE MOTOR AND 0=MOTOR DEACTIVATE', mappedKey: 'motor4ConfigActivate' },
    { address: 40093, name: 'Register 40093' },
    { address: 40094, name: 'PRESURE TRANMITTER / PRESURE SWITCH', range: '0-1', description: '0-PRESURE SWITCH 1-PRESURE TRANSMITTER' },
    { address: 40095, name: 'Register 40095' },
    { address: 40096, name: '-' },
    { address: 40097, name: '-' },
    { address: 40098, name: '-' },
    { address: 40099, name: '-' },
    { address: 40100, name: '-' },
    { address: 40101, name: '-' },
    { address: 40102, name: '-' },
    { address: 40103, name: 'Motor Type DOL SD', range: '0-1', description: '0-DOL 1-SD' },
    { address: 40104, name: 'Register 40104' },
    { address: 40105, name: 'Register 40105' },
    { address: 40106, name: 'Register 40106' },
    { address: 40107, name: 'Set Pressure Bar Max Value', range: '0-250', units: 'BAR', description: 'PRESURE TRANMITTER MAXIMUM RANGE LIKE 10 BAR/16BAR/25BAR' },
    { address: 40108, name: 'Set Pressure Bar Value', range: '0-251', units: 'BAR', description: 'REQUIRED PRESSURE FORM MOTOR' },
    { address: 40109, name: 'Pressure Bar Band Width', range: '0-30', units: 'BAR', description: 'PUMP ON PRESURE' },
    { address: 40110, name: 'Accumulation Pressure', range: '0-30', units: 'BAR', description: 'PUMP OFF PRESURE' },
    { address: 40111, name: '-' },
    { address: 40112, name: 'Modbus Slave Number', range: '1-255', description: 'SALVE NUMBER OF DEVICE' },
    { address: 40113, name: '-' },
    { address: 40114, name: '-' },
    { address: 40115, name: 'Register 40115' },
    { address: 40116, name: 'Register 40116' },
    { address: 40117, name: 'Max Pump On Time SEETING', range: '0-1440', description: 'MAXIMUM PUMP ON TIME' },
    { address: 40118, name: 'WORKING PUMPS', range: '1-4', description: 'MAXIMUM PUMP WORKING IN PANEL' },
    { address: 40119, name: 'CT wound', units: 'TURNS', description: 'NUMBER OF TURNS TO CT COIL' }
  ];

  const firePanelRegisterDefinitions = [
    // Control Write Registers (On/Off)
    { address: 141, name: 'Line-1 Main Pump On', range: '0-1', mappedKey: 'line1MainControlOn' },
    { address: 142, name: 'Line-2 Main Pump On', range: '0-1', mappedKey: 'line2MainControlOn' },
    { address: 143, name: 'Line-2 Jockey Pump On', range: '0-1', mappedKey: 'line2JockeyControlOn' },
    { address: 144, name: 'Line-1 Jockey Pump On', range: '0-1', mappedKey: 'line1JockeyControlOn' },
    { address: 145, name: 'DG On', range: '0-1', mappedKey: 'dgControlOn' },
    { address: 146, name: 'Line-2 Main Pump Off', range: '0-1', mappedKey: 'line2MainControlOff' },
    { address: 147, name: 'Line-2 Jockey Pump Off', range: '0-1', mappedKey: 'line2JockeyControlOff' },
    { address: 148, name: 'Line-1 Jockey Pump Off', range: '0-1', mappedKey: 'line1JockeyControlOff' },

    // Status Registers - Line 1 Main Pump
    { address: 151, name: 'Line-1 Main Pump Auto', range: '0-1', mappedKey: 'line1MainAuto' },
    { address: 152, name: 'Line-1 Main Pump Manual', range: '0-1', mappedKey: 'line1MainManual' },
    { address: 153, name: 'Line-1 Main Pump ON', range: '0-1', mappedKey: 'line1MainOn' },
    { address: 154, name: 'Line-1 Main Pump OFF', range: '0-1', mappedKey: 'line1MainOff' },
    { address: 155, name: 'Line-1 Main Pump Trip', range: '0-1', mappedKey: 'line1MainTrip' },

    // Status Registers - Line 2 Main Pump
    { address: 161, name: 'Line-2 Main Pump Auto', range: '0-1', mappedKey: 'line2MainAuto' },
    { address: 162, name: 'Line-2 Main Pump Manual', range: '0-1', mappedKey: 'line2MainManual' },
    { address: 163, name: 'Line-2 Main Pump ON', range: '0-1', mappedKey: 'line2MainOn' },
    { address: 164, name: 'Line-2 Main Pump OFF', range: '0-1', mappedKey: 'line2MainOff' },
    { address: 165, name: 'Line-2 Main Pump Trip', range: '0-1', mappedKey: 'line2MainTrip' },

    // Status Registers - Line 1 Jockey Pump
    { address: 166, name: 'Line-1 Jockey Pump Auto', range: '0-1', mappedKey: 'line1JockeyAuto' },
    { address: 167, name: 'Line-1 Jockey Pump Manual', range: '0-1', mappedKey: 'line1JockeyManual' },
    { address: 168, name: 'Line-1 Jockey Pump ON', range: '0-1', mappedKey: 'line1JockeyOn' },
    { address: 169, name: 'Line-1 Jockey Pump OFF', range: '0-1', mappedKey: 'line1JockeyOff' },
    { address: 170, name: 'Line-1 Jockey Pump Trip', range: '0-1', mappedKey: 'line1JockeyTrip' },

    // Status Registers - DG
    { address: 171, name: 'DG Auto ON', range: '0-1', mappedKey: 'dgAuto' },
    { address: 172, name: 'DG Manual ON', range: '0-1', mappedKey: 'dgManual' },

    // Pressure
    { address: 156, name: 'UZ Line-1 Pressure', range: '0-250', mappedKey: 'uzLine1Pressure' },
    { address: 157, name: 'UZ Line-2 Pressure', range: '0-250', mappedKey: 'uzLine2Pressure' }
  ];

  await prisma.registerDefinition.createMany({
    data: registerDefinitions,
    skipDuplicates: true
  });

  await prisma.registerDefinition.createMany({
    data: firePanelRegisterDefinitions,
    skipDuplicates: true
  });

  console.log('Seeding users...');
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync('Admin@123', salt);

  // Seed superadmin
  await prisma.user.create({
    data: {
      username: 'superadmin',
      email: 'superadmin@hypn.com',
      mobileNumber: '1234567890',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    }
  });

  // Seed societyadmin
  await prisma.user.create({
    data: {
      username: 'societyadmin',
      email: 'societyadmin@hypn.com',
      mobileNumber: '1234567891',
      password: hashedPassword,
      role: 'SOCIETY_ADMIN',
      firstName: 'Society',
      lastName: 'Admin',
      societyId: 4,
      isActive: true,
    }
  });

  // Seed buildingadmin
  await prisma.user.create({
    data: {
      username: 'buildingadmin',
      email: 'buildingadmin@hypn.com',
      mobileNumber: '1234567892',
      password: hashedPassword,
      role: 'BUILDING_ADMIN',
      firstName: 'Building',
      lastName: 'Admin',
      societyId: 4,
      isActive: true,
      buildings: {
        create: [
          { buildingId: 1 },
          { buildingId: 2 },
        ]
      }
    }
  });

  // Seed operator
  await prisma.user.create({
    data: {
      username: 'operator',
      email: 'operator@hypn.com',
      mobileNumber: '1234567893',
      password: hashedPassword,
      role: 'OPERATOR',
      firstName: 'Operator',
      lastName: 'Staff',
      societyId: 4,
      isActive: true,
      buildings: {
        create: [
          { buildingId: 1 },
        ]
      }
    }
  });

  // Seed viewer
  await prisma.user.create({
    data: {
      username: 'viewer',
      email: 'viewer@hypn.com',
      mobileNumber: '1234567894',
      password: hashedPassword,
      role: 'VIEWER',
      firstName: 'Viewer',
      lastName: 'User',
      societyId: 4,
      isActive: true,
      buildings: {
        create: [
          { buildingId: 2 },
        ]
      }
    }
  });

  console.log('Resetting autoincrement sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Society"', 'id'), coalesce(max(id), 1)) FROM "Society";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Building"', 'id'), coalesce(max(id), 1)) FROM "Building";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Device"', 'id'), coalesce(max(id), 1)) FROM "Device";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id), 1)) FROM "User";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"UserBuilding"', 'id'), coalesce(max(id), 1)) FROM "UserBuilding";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"AuditLog"', 'id'), coalesce(max(id), 1)) FROM "AuditLog";`);

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
