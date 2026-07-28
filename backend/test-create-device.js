const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/devices', {
      name: 'Test Machine',
      deviceId: 'TEST-MAC-1234',
      facilityId: 1, // Let's guess a valid or invalid ID
      company: 'Test Company',
      machineCode: 'TEST-MAC-1234',
      serialNumber: '12345',
      make: 'Make 1',
      modelNumber: 'Model 1',
      machineCategory: 'Category 1',
      machineSubCategory: 'Sub-Category 1',
      description: 'Test description',
      application: 'DOMESTIC_WATER_SYS',
      pumpType: 'WMP_BOOSTER_PUMP',
      controller: 'AIPCU',
      macType: 'Primary MAC'
    }, {
      // we need authentication to hit this endpoint
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
