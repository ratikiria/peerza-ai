// One-off: give every existing user without a security question a default one,
// so the password-recovery flow can be tested. Answer: "demo"
require("dotenv").config()
const bcrypt = require("bcryptjs")
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

async function main() {
  const users = await db.user.findMany({
    where: { OR: [{ securityQuestion: null }, { securityAnswerHash: null }] },
    select: { id: true, email: true, username: true },
  })
  if (users.length === 0) {
    console.log("All users already have a security question set.")
    return
  }
  const hash = await bcrypt.hash("demo", 12)
  for (const u of users) {
    await db.user.update({
      where: { id: u.id },
      data: { securityQuestion: "first_pet", securityAnswerHash: hash },
    })
  }
  console.log(`Backfilled ${users.length} user(s). Default question: "What was the name of your first pet?" — answer: "demo"`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
