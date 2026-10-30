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
import { Attendance } from './collections/Attendance'
import { Assessments } from './collections/Assessments'
import { Marks } from './collections/Marks'
import { familyLogin } from './endpoints/familyLogin'
import { registerFamily } from './endpoints/registerFamily'
import { Notices } from './collections/Notices'
import { NoticeReads } from './collections/NoticeReads'
import { Events } from './collections/Events'
import { TimetableSlots } from './collections/TimetableSlots'
import { Assignments } from './collections/Assignments'
import { AssignmentSubmissions } from './collections/AssignmentSubmissions'
import { SchoolSettings } from './globals/SchoolSettings'
import { FeeStructures } from './collections/FeeStructures'
import { Invoices } from './collections/Invoices'
import { Payments } from './collections/Payments'
import { FeeAdjustments } from './collections/FeeAdjustments'
import { generateInvoices } from './endpoints/generateInvoices'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Addresses allowed to send logged-in (cookie) requests: the API itself and the website.
const origins = [
  process.env.PAYLOAD_PUBLIC_URL ?? 'http://localhost:3000',
  ...(process.env.WEB_ORIGINS ?? 'http://localhost:8443').split(',').map((o) => o.trim()),
].filter(Boolean)

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
    Attendance,
    Assessments,
    Marks,
    Notices,
    NoticeReads,
    Events,
    TimetableSlots,
    Assignments,
    AssignmentSubmissions,
    FeeStructures,
    Invoices,
    Payments,
    FeeAdjustments,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  cors: origins,
  csrf: origins,
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
  endpoints: [familyLogin, registerFamily, generateInvoices],
  globals: [SchoolSettings],
})