import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Barcha faol ishchilarni olamiz
  const workers = await prisma.worker.findMany({
    where: {
      isActive: true,
    },
  });

  console.log(`Jami ${workers.length} ta ishchi topildi. Guruhlarni to'g'rilash boshlanmoqda...`);

  let updatedCount = 0;

  for (const worker of workers) {
    const groupName = worker.department?.trim();
    if (!groupName) {
      console.log(`Ishchi ${worker.fullName} (ID: ${worker.id}) da department mavjud emas, o'tkazib yuborildi.`);
      continue;
    }

    // Guruhni izlab topamiz yoki yaratamiz
    let group = await prisma.group.findFirst({
      where: {
        name: groupName,
        superAdminId: worker.superAdminId,
      },
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          name: groupName,
          superAdminId: worker.superAdminId,
          createdBy: 'system_fix',
        },
      });
      console.log(`Yangi guruh yaratildi: "${groupName}" (SuperAdmin: ${worker.superAdminId})`);
    }

    // Ishchini guruhga bog'laymiz (agar hali bog'lanmagan bo'lsa)
    if (worker.groupId !== group.id) {
      await prisma.worker.update({
        where: { id: worker.id },
        data: { groupId: group.id },
      });
      console.log(`Ishchi "${worker.fullName}" (ID: ${worker.id}) guruhi "${groupName}" ga o'zgartirildi.`);
      updatedCount++;
    }
  }

  console.log(`\n✅ Muvaffaqiyatli yakunlandi! Jami ${updatedCount} ta ishchining guruhlari to'g'rilandi.`);
}

main()
  .catch((e) => {
    console.error("❌ Xatolik yuz berdi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
