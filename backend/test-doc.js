const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

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
  
  console.log("Adding Link Doc...");
  const res = await fetch(`http://localhost:3001/devices/${device.id}/documents/link`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: 'Test Link',
        url: 'https://example.com'
    })
  });
  const linkDoc = await res.json();
  console.log(linkDoc);
  
  console.log("Fetching docs...");
  const fetchDocs = await fetch(`http://localhost:3001/devices/${device.id}/documents`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(await fetchDocs.json());
}
test();
