import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../../components/Button.vue'

function classOf(props = {}, attrs = {}) {
  return mount(Button, {
    props: { href: 'https://example.com', ...props },
    attrs,
    slots: { default: 'Click' },
  }).find('a').classes()
}

describe('Button', () => {
  describe('mso-padding-alt', () => {
    it('zeroes Outlook padding on the solid variant', () => {
      expect(classOf()).toContain('mso-padding-alt-0')
    })

    it('zeroes Outlook padding on the outline variant', () => {
      expect(classOf({ variant: 'outline' })).toContain('mso-padding-alt-0')
    })

    it('zeroes Outlook padding on the ghost variant', () => {
      expect(classOf({ variant: 'ghost' })).toContain('mso-padding-alt-0')
    })

    it('does not add it to the link variant', () => {
      expect(classOf({ variant: 'link' })).not.toContain('mso-padding-alt-0')
    })

    it('does not add it when outlookFallback is false', () => {
      expect(classOf({ outlookFallback: false })).not.toContain('mso-padding-alt-0')
    })

    it('lets a user mso-padding-alt-* class override it', () => {
      const classes = classOf({ variant: 'outline' }, { class: 'mso-padding-alt-2' })
      expect(classes).toContain('mso-padding-alt-2')
      expect(classes).not.toContain('mso-padding-alt-0')
    })
  })
})
