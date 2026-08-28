import { describe, it, expect } from 'vitest'
import { createWatchedFileMatcher, deriveWatchRoots } from '../../utils/watchPaths.ts'

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

  it('rejects files matched by a negated pattern', () => {
    const matcher = createWatchedFileMatcher(['locales/**', '!locales/ignored.json'], cwd)
    expect(matcher('/project/locales/en.json')).toBe(true)
    expect(matcher('/project/locales/ignored.json')).toBe(false)
  })

  it('strips a leading "./" from negated patterns too', () => {
    const matcher = createWatchedFileMatcher(['locales/**', '!./locales/ignored.json'], cwd)
    expect(matcher('/project/locales/ignored.json')).toBe(false)
  })

  it('matches nothing when only negated patterns are given', () => {
    const matcher = createWatchedFileMatcher(['!locales/**'], cwd)
    expect(matcher('/project/emails/welcome.vue')).toBe(false)
    expect(matcher('/project/locales/en.json')).toBe(false)
  })
})

describe('deriveWatchRoots', () => {
  const cwd = '/project'
  const base = { content: [], componentDirs: [], watchPaths: [], cwd }

  it('uses the static prefix of resolved content globs', () => {
    expect(deriveWatchRoots({ ...base, content: ['/project/emails/**/*.vue'] }))
      .toEqual(['/project/emails'])
  })

  it('drops negated content patterns', () => {
    expect(deriveWatchRoots({ ...base, content: ['/project/emails/**/*.vue', '!emails/**/skip.vue'] }))
      .toEqual(['/project/emails'])
  })

  it('includes component dirs and root verbatim', () => {
    expect(deriveWatchRoots({ ...base, componentDirs: ['/project/shared-components'], root: '/project/emails' }))
      .toEqual(['/project/shared-components', '/project/emails'])
  })

  it('uses the static prefix of watch globs', () => {
    expect(deriveWatchRoots({ ...base, watchPaths: ['locales/**', './translations/**/*.json'] }))
      .toEqual(['locales', './translations'])
  })

  it('keeps plain file watch paths as-is', () => {
    expect(deriveWatchRoots({ ...base, watchPaths: ['maizzle.config.ts'] }))
      .toEqual(['maizzle.config.ts'])
  })

  it('falls back to cwd for watch patterns with no static prefix', () => {
    expect(deriveWatchRoots({ ...base, watchPaths: ['**/*.json'] })).toEqual([cwd])
    expect(deriveWatchRoots({ ...base, watchPaths: ['*.json'] })).toEqual([cwd])
  })

  it('drops negated watch patterns', () => {
    expect(deriveWatchRoots({ ...base, watchPaths: ['locales/**', '!locales/**/ignored.json'] }))
      .toEqual(['locales'])
  })

  it('deduplicates roots across sources', () => {
    expect(deriveWatchRoots({
      ...base,
      content: ['/project/emails/**/*.vue', '/project/emails/**/*.md'],
      root: '/project/emails',
    })).toEqual(['/project/emails'])
  })
})
