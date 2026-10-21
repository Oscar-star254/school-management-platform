import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload'

import { ACADEMIC_MANAGERS, getUser, hasRole, isRole } from '../access'
import { deny, getAssignedPairs, marksRead, marksWrite, staffCanCreate } from '../access/academics'
import { relId } from '../access/people'
import { auditAfterChange } from '../hooks/audit'

const rules: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const actor = getUser(req)
  if (!actor) throw deny('Please sign in.')

  const merged = { ...originalDoc, ...data } as Record<string, unknown>
  const assessmentId = relId(merged.assessment)
  const studentId = relId(merged.student)
  if (!assessmentId || !studentId) throw deny('An assessment and a learner are required.')

  const assessment = (await req.payload.findByID({
    collection: 'assessments',
    id: assessmentId,
    depth: 0,
    req,
  })) as unknown as Record<string, unknown>

  if (!hasRole(actor, ...ACADEMIC_MANAGERS)) {
    const pairs = await getAssignedPairs(req, actor)
    const classId = relId(assessment.class)
    const subjectId = relId(assessment.subject)
    if (!pairs.some((p) => p.classId === classId && p.subjectId === subjectId)) {
      throw deny('You can only enter marks for classes and learning areas you teach.')
    }
    if (assessment.status !== 'open') {
      throw deny('Results for this assessment have been submitted and can no longer be changed.')
    }
  }

  const term = (await req.payload.findByID({
    collection: 'terms',
    id: relId(assessment.term) as number,
    depth: 0,
    req,
  })) as unknown as Record<string, unknown>
  if (term.isLocked) throw deny('That term is locked. Marks can no longer be changed.')

  const student = await req.payload.findByID({ collection: 'students', id: studentId, depth: 0, req })
  if (relId(student.currentClass) !== relId(assessment.class)) {
    throw deny('That learner is not in the class this assessment belongs to.')
  }

  const score = merged.score
  if (typeof score === 'number') {
    const max = typeof assessment.maxMarks === 'number' ? assessment.maxMarks : 100
    if (score < 0 || score > max) throw deny(`The score must be between 0 and ${max}.`)
  }

  const and: Record<string, unknown>[] = [
    { assessment: { equals: assessmentId } },
    { student: { equals: studentId } },
  ]
  if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })
  const duplicate = await req.payload.find({
    collection: 'marks',
    where: { and } as never,
    limit: 1,
    depth: 0,
    req,
  })
  if (duplicate.totalDocs > 0) throw deny('A mark for this learner is already recorded in this assessment.')

  return data
}

/** Changes to marks are only logged once results are published (a correction). */
const auditCorrections: CollectionAfterChangeHook = async (args) => {
  const assessmentId = relId(args.doc.assessment)
  if (!assessmentId) return args.doc
  const assessment = (await args.req.payload.findByID({
    collection: 'assessments',
    id: assessmentId,
    depth: 0,
    req: args.req,
  })) as unknown as { status?: string }
  if (assessment.status !== 'published') return args.doc
  return auditAfterChange('marks')(args)
}

export const Marks: CollectionConfig = {
  slug: 'marks',
  labels: { singular: 'Mark', plural: 'Marks' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['assessment', 'student', 'score'],
    group: 'Academics',
  },
  access: {
    read: marksRead,
    create: staffCanCreate,
    update: marksWrite,
    delete: isRole(...ACADEMIC_MANAGERS),
  },
  hooks: { beforeChange: [rules], afterChange: [auditCorrections] },
  fields: [
    { name: 'assessment', type: 'relationship', relationTo: 'assessments', required: true, index: true },
    { name: 'student', type: 'relationship', relationTo: 'students', required: true, index: true },
    { name: 'score', type: 'number', min: 0 },
    { name: 'comment', type: 'text' },
  ],
}