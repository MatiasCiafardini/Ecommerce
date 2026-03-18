import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  const store = await prisma.store.findFirst();

  if (!store) {
    throw new Error('No store found');
  }

  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password,
      name: 'Admin',
      role: Role.OWNER,
      storeId: store.id,
    },
  });

  console.log('Usuario admin creado');
  console.log('email: admin@demo.com');
  console.log('password: 123456');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
