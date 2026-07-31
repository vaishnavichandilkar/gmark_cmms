import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.resolve(__dirname, '../../Locality_village_pincode_final_mar-2017.csv');
  console.log(`Reading CSV from ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found!');
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/);
  
  const recordsToInsert = new Map<string, { city: string; state: string }>();

  console.log(`Processing ${lines.length} lines...`);
  
  // Skip header (i=1)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Use regex to split by comma, ignoring commas inside quotes
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    // Columns:
    // 0: Village/Locality name
    // 1: Officename ( BO/SO/HO)
    // 2: Pincode
    // 3: Sub-distname
    // 4: Districtname
    // 5: StateName
    if (cols.length >= 6) {
      const pincode = cols[2].replace(/"/g, '').trim();
      let city = cols[4].replace(/"/g, '').trim();
      let state = cols[5].replace(/"/g, '').trim();

      // Title case format (e.g. SOUTH EAST DELHI -> South East Delhi)
      city = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      state = state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

      if (pincode && pincode.length === 6 && !recordsToInsert.has(pincode)) {
        recordsToInsert.set(pincode, { city, state });
      }
    }
  }

  const uniqueRecords = Array.from(recordsToInsert.entries()).map(([pincode, { city, state }]) => ({
    pincode,
    city,
    state,
    country: 'India'
  }));

  console.log(`Found ${uniqueRecords.length} unique pincodes. Clearing existing postal codes...`);
  await prisma.postalCode.deleteMany();

  console.log(`Inserting...`);
  
  // Insert in chunks to avoid overwhelming the db
  const chunkSize = 2000;
  for (let i = 0; i < uniqueRecords.length; i += chunkSize) {
    const chunk = uniqueRecords.slice(i, i + chunkSize);
    await prisma.postalCode.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Inserted chunk ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(uniqueRecords.length/chunkSize)}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
