const axios = require('axios');
axios.post('http://localhost:3000/machines', {
  name: 'Test Machine',
  facilityId: 1,
  company: '1',
  maintenanceHead: 'Vallabh Ghatge',
  machineCode: '123',
  assetCode: '3532',
  isLocationPart: false
}).then(res => console.log(res.data)).catch(err => {
  console.log('Error status:', err.response?.status);
  console.log('Error data:', err.response?.data);
});
