import {archiveItemType} from './archiveItemType'
import {projectType} from './projectType'
import {themeType} from './themeType'
import {typeType} from './typeType'
import {journalEntryType} from './journalEntryType'
import {aboutPageType} from './aboutPageType'
import {contactPageType} from './contactPageType'
import {richTextLinkType} from './richTextLinkType'
import {richTextType} from './richTextType'

// CMS typography foundation pass: richTextLinkType (the `link` annotation
// object) and richTextType (the shared `richText` block-array type that
// references it) are registered here alongside every other document/object
// type this Studio already knows about. Order matters only in that
// richTextLinkType is listed before richTextType, matching the dependency
// direction (richTextType's own block config references `{type: 'link'}`).
export const schemaTypes = [
  archiveItemType,
  projectType,
  themeType,
  typeType,
  journalEntryType,
  aboutPageType,
  contactPageType,
  richTextLinkType,
  richTextType,
]
