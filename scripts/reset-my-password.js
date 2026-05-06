require("dotenv").config()
const bcrypt = require("bcryptjs")
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const EMAIL = process.argv[2]
const NEW_PASSWORD = process.argv[3]

if (!EMAIL || !NEW_PASSWORD) {
  console.error("Usage: node scripts/reset-my-password.js <email> <new-password>")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

async function main() {
  const user = await db.user.findUnique({ where: { email: EMAIL } })
  if (!user) {
    console.error(`No user with email ${EMAIL}`)
    process.exit(1)
  }
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })
  console.log(`Password reset for @${user.username} (${user.email})`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
