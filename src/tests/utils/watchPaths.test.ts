import { describe, it, expect } from 'vitest'
import { createWatchedFileMatcher } from '../../utils/watchPaths.ts'

describe('createWatchedFileMatcher', () => {
  const cwd = '/project'

  it('matches an absolute path against a project-relative glob', () => {
    const matcher = createWatchedFileMatcher(['locales/**'], cwd)
    expect(matcher('/project/locales/en.json')).toBe(true)
    expect(matcher('/project/locales/nested/en.json')).toBe(true)
  })

  it('strips a leading "./" from user-supplied patterns', () => {
    const matcher = createWatchedFileMatcher(['./locales/**/*.json'], cwd)
    expect(matcher('/project/locales/en.json')).toBe(true)
  })

  it('matches top-level files like maizzle.config.ts', () => {
    const matcher = createWatchedFileMatcher(['maizzle.config.ts'], cwd)
    expect(matcher('/project/maizzle.config.ts')).toBe(true)
  })

  it('returns false for files outside any watched pattern', () => {
    const matcher = createWatchedFileMatcher(['locales/**'], cwd)
    expect(matcher('/project/emails/welcome.vue')).toBe(false)
  })

  it('returns false for files outside the project root', () => {
    const matcher = createWatchedFileMatcher(['locales/**'], cwd)
    expect(matcher('/elsewhere/locales/en.json')).toBe(false)
  })
})
