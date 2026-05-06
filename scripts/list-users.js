require("dotenv").config()
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

async function main() {
  const users = await db.user.findMany({
    select: { email: true, username: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  for (const u of users) {
    console.log(`${u.createdAt.toISOString().slice(0, 10)}  @${u.username.padEnd(20)}  ${u.email.padEnd(35)}  ${u.name}`)
  }
  console.log(`\nTotal: ${users.length}`)
}

main().catch(console.error).finally(() => db.$disconnect())
