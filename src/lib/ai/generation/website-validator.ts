import type { Website, WebsiteSection } from './website-generator'

// Validation issue severity
export type ValidationSeverity = 'error' | 'warning'

// Validation issue structure
export interface ValidationIssue {
  severity: ValidationSeverity
  section?: string
  field: string
  message: string
  value?: string
}

// Banned headline patterns (instant fail)
const BANNED_HEADLINE_PATTERNS = [
  /^welcome to/i,
  /quality services/i,
  /customer satisfaction/i,
  /your trusted partner/i,
  /we provide/i,
  /our mission/i,
  /dedicated to/i,
  /committed to excellence/i,
  /solutions for/i,
  /^discover\s/i,
  /^explore\s/i,
]

// Banned badge text (too generic)
const BANNED_BADGE_TEXT = [
  'welcome',
  'features',
  'about',
  'get started',
  'our services',
  'why choose us',
  'learn more',
  'discover',
  'explore',
]

// Generic CTA text to avoid
const GENERIC_CTA_TEXT = [
  'submit',
  'click here',
  'learn more',
  'get started',
  'read more',
  'see more',
  'view more',
  'find out more',
]

// Validate a single section
function validateSection(section: WebsiteSection, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sectionId = `${section.type}[${index}]`

  // Check headline
  if (section.headline) {
    // Check for banned patterns
    for (const pattern of BANNED_HEADLINE_PATTERNS) {
      if (pattern.test(section.headline)) {
        issues.push({
          severity: 'error',
          section: sectionId,
          field: 'headline',
          message: `Headline matches banned pattern: ${pattern}`,
          value: section.headline,
        })
        break
      }
    }

    // Check headline length (should be 4-8 words)
    const wordCount = section.headline.split(/\s+/).length
    if (wordCount > 10) {
      issues.push({
        severity: 'warning',
        section: sectionId,
        field: 'headline',
        message: `Headline too long (${wordCount} words). Should be 4-8 words.`,
        value: section.headline,
      })
    }

    // Check for specificity (should have numbers or outcomes)
    const hasSpecifics = /\d+|%|\$|hours?|days?|minutes?|faster|better|more|save|increase|reduce|boost/i.test(section.headline)
    if (!hasSpecifics && section.type === 'hero') {
      issues.push({
        severity: 'warning',
        section: sectionId,
        field: 'headline',
        message: 'Hero headline lacks specifics (numbers, outcomes, timeframes)',
        value: section.headline,
      })
    }
  }

  // Check badge text
  if (section.badgeText) {
    const badgeLower = section.badgeText.toLowerCase()
    for (const banned of BANNED_BADGE_TEXT) {
      if (badgeLower === banned || badgeLower.includes(banned)) {
        issues.push({
          severity: 'error',
          section: sectionId,
          field: 'badgeText',
          message: `Badge text is too generic: "${section.badgeText}"`,
          value: section.badgeText,
        })
        break
      }
    }
  }

  // Check CTA text
  if (section.ctaText) {
    const ctaLower = section.ctaText.toLowerCase()
    for (const generic of GENERIC_CTA_TEXT) {
      if (ctaLower === generic || ctaLower.includes(generic)) {
        issues.push({
          severity: 'error',
          section: sectionId,
          field: 'ctaText',
          message: `CTA is too generic: "${section.ctaText}"`,
          value: section.ctaText,
        })
        break
      }
    }

    // Check CTA word count (should be 2-4 words)
    const ctaWords = section.ctaText.split(/\s+/).length
    if (ctaWords > 5) {
      issues.push({
        severity: 'warning',
        section: sectionId,
        field: 'ctaText',
        message: `CTA too long (${ctaWords} words). Should be 2-4 words.`,
        value: section.ctaText,
      })
    }
  }

  // Check layout is specified
  if (!section.layout) {
    issues.push({
      severity: 'error',
      section: sectionId,
      field: 'layout',
      message: 'Section missing required layout',
    })
  }

  return issues
}

// Validate dark section rhythm
function validateDarkSectionRhythm(sections: WebsiteSection[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  let consecutiveDark = 0

  for (let i = 0; i < sections.length; i++) {
    if (sections[i].darkSection) {
      consecutiveDark++
      if (consecutiveDark > 1) {
        issues.push({
          severity: 'warning',
          section: `${sections[i].type}[${i}]`,
          field: 'darkSection',
          message: 'Multiple consecutive dark sections break visual rhythm',
        })
      }
    } else {
      consecutiveDark = 0
    }
  }

  return issues
}

// Validate layout variety
function validateLayoutVariety(sections: WebsiteSection[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const layoutCounts = new Map<string, number>()

  for (const section of sections) {
    if (section.layout) {
      const count = (layoutCounts.get(section.layout) || 0) + 1
      layoutCounts.set(section.layout, count)
    }
  }

  // Check if any layout is overused (more than 3 times or more than 50% of sections)
  const threshold = Math.max(3, Math.ceil(sections.length * 0.5))
  for (const [layout, count] of layoutCounts) {
    if (count > threshold) {
      issues.push({
        severity: 'warning',
        field: 'layouts',
        message: `Layout "${layout}" is overused (${count}/${sections.length} sections). Use more variety.`,
      })
    }
  }

  // Check for minimum variety (at least 2 different layouts)
  if (layoutCounts.size < 2 && sections.length > 2) {
    issues.push({
      severity: 'warning',
      field: 'layouts',
      message: `Only ${layoutCounts.size} layout type(s) used. Use at least 2 different layouts for visual variety.`,
    })
  }

  return issues
}

// Main validation function
export function validateWebsite(website: Website): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const page of website.pages) {
    // Validate each section
    page.sections.forEach((section, index) => {
      issues.push(...validateSection(section, index))
    })

    // Validate dark section rhythm
    issues.push(...validateDarkSectionRhythm(page.sections))

    // Validate layout variety
    issues.push(...validateLayoutVariety(page.sections))
  }

  return issues
}

// Check if issues are blocking (have errors)
export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some(issue => issue.severity === 'error')
}

// Format issues for retry prompt
export function formatIssuesForRetry(issues: ValidationIssue[]): string {
  const errorIssues = issues.filter(i => i.severity === 'error')

  if (errorIssues.length === 0) {
    return ''
  }

  const lines = ['QUALITY ISSUES DETECTED - Please fix:']

  for (const issue of errorIssues.slice(0, 5)) { // Max 5 issues to avoid token overflow
    const location = issue.section ? `[${issue.section}]` : ''
    lines.push(`- ${location} ${issue.field}: ${issue.message}`)
    if (issue.value) {
      lines.push(`  Current: "${issue.value}"`)
    }
  }

  if (errorIssues.length > 5) {
    lines.push(`... and ${errorIssues.length - 5} more issues`)
  }

  return lines.join('\n')
}
