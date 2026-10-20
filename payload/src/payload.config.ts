import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { AcademicYears } from './collections/AcademicYears'
import { Terms } from './collections/Terms'
import { Classes } from './collections/Classes'
import { Subjects } from './collections/Subjects'
import { Students } from './collections/Students'
import { Guardians } from './collections/Guardians'
import { GuardianLinks } from './collections/GuardianLinks'
import { Staff } from './collections/Staff'
import { TeacherAssignments } from './collections/TeacherAssignments'
import { AuditLogs } from './collections/AuditLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    AcademicYears,
    Terms,
    Classes,
    Subjects,
    Students,
    Guardians,
    GuardianLinks,
    Staff,
    TeacherAssignments,
    AuditLogs,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})