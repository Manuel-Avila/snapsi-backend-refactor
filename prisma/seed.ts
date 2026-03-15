import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("secret", 10);

  await prisma.user.upsert({
    where: { email: "manuelavila@gmail.com" },
    update: {},
    create: {
      name: "Manuel Avila",
      username: "manuel_avilam",
      email: "manuelavila@gmail.com",
      password: passwordHash,
      gender: "male",
      age: 21,
      bio: "Just a person.",
    },
  });
}

main()
  .then(async () => {
    console.log("Database seeding completed successfully.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Database seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
