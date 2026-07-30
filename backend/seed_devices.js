const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function run() {
    await prisma.device.createMany({
        data: devices.map(d => ({
        ...d,
        topic: 'AGC/SE-' + d.deviceId
        })),
    });
    console.log('Restored devices!');
}
run().then(() => process.exit(0)).catch(console.error);
