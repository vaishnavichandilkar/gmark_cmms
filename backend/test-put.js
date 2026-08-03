const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const device = await prisma.device.findFirst({ orderBy: { id: 'desc' }});
  
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@taskapp.com',
      password: 'Password123!'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken || loginData.access_token;
  
  const payload = {
      name: device.name,
      deviceId: "20260508012",
      company: device.company,
      maintenanceHead: device.maintenanceHead,
      machineCode: device.machineCode,
      serialNumber: device.serialNumber,
      make: device.make,
      modelNumber: device.modelNumber,
      machineCategory: device.machineCategory,
      machineSubCategory: device.machineSubCategory,
      description: device.description,
      isLocationPart: device.isLocationPart,
      facilityId: device.facilityId || undefined,
      buildingId: device.buildingId || undefined,
      latitude: device.latitude,
      longitude: device.longitude,
      costCenter: device.costCenter,
      headOfDepartment: device.headOfDepartment,
      machineOwner: device.machineOwner,
      notes: device.notes,
  };
  
  const res = await fetch(`http://localhost:3001/devices/${device.id}`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  console.log("Response Status:", res.status);
  console.log("Response Body:", await res.text());
}
test();
