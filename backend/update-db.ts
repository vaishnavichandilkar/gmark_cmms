import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.facility.update({
    where: { id: 1 },
    data: {
      address: '123 Test St, Industrial Area',
      country: 'India',
      state: 'Maharashtra',
      city: 'Kolhapur',
      postalCode: '416005',
      subCategory: 'Type A',
      latitude: '16.7050',
      longitude: '74.2433',
      facilityHeadName: 'Rohit Gilbile'
    }
  });
  console.log("Updated Kolhapur");
}
main().catch(console.error).finally(() => prisma.$disconnect());
