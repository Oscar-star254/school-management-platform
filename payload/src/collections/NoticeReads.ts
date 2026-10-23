import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { getUser } from '../access'
import { deny } from '../access/academics'
import { anySignedIn } from '../access/communication'
import { relId } from '../access/people'

const rules: CollectionBeforeChangeHook = async ({ data, req }) => {
  const actor = getUser(req)
  if (!actor) throw deny('Please sign in.')
  const noticeId = relId(data.notice)
  if (!noticeId) throw deny('A notice is required.')
  const existing = await req.payload.find({
    collection: 'notice-reads',
    where: { and: [{ notice: { equals: noticeId } }, { user: { equals: actor.id } }] },
    limit: 1,
    depth: 0,
    req,
  })
  if (existing.totalDocs > 0) throw deny('Already marked as read.')
  return { ...data, user: actor.id }
}

/** Remembers which notices each person has read. Everyone sees only their own marks. */
export const NoticeReads: CollectionConfig = {
  slug: 'notice-reads',
  admin: { hidden: true },
  access: {
    read: ({ req }) => {
      const user = getUser(req)
      return user ? { user: { equals: user.id } } : false
    },
    create: anySignedIn,
    update: () => false,
    delete: () => false,
  },
  hooks: { beforeChange: [rules] },
  fields: [
    { name: 'notice', type: 'relationship', relationTo: 'notices', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
  ],
}