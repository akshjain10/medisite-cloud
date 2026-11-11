/**
 * Promote an existing account to super admin:
 *   npm run make-admin -- you@example.com
 */
import config from '@payload-config'
import { getPayload } from 'payload'

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npm run make-admin -- you@example.com')
    process.exit(1)
  }
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (!docs[0]) {
    console.error(`No user found with email ${email}`)
    process.exit(1)
  }
  await payload.update({ collection: 'users', id: docs[0].id, data: { roles: ['super-admin'] } })
  console.log(`${email} is now a super admin.`)
  process.exit(0)
}

await main()
