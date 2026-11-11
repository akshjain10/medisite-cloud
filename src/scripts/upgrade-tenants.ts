/**
 * Upgrades clients saved by an older version (also runs automatically on app start):
 *   npm run upgrade-tenants
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { upgradeTenants } from '../lib/upgradeTenants'

const payload = await getPayload({ config })
await upgradeTenants(payload)
payload.logger.info('Client upgrade check finished.')
process.exit(0)
