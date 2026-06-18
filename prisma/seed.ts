import 'dotenv/config';
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminFullName = process.env.SEED_ADMIN_FULL_NAME || "Platform Super Admin";
  const adminPhone = process.env.SEED_ADMIN_PHONE || "+998907012161";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Rahmonbergan04";

  const existingUser = await prisma.user.findUnique({
    where: { phone: adminPhone },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        fullName: adminFullName,
        phone: adminPhone,
        password: hashedPassword,
        role: Role.PLATFORM_SUPER_ADMIN,
        isActive: true,
        isBlocked: false,
      },
    });

    console.log(`✅ Seeding completed: Platform Super Admin created (Phone: ${adminPhone}).`);
  } else {
    console.log("ℹ️ Seeding skipped: Platform Super Admin already exists.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
