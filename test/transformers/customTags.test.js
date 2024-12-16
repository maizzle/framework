import { expect, test } from 'vitest'
import { cleanString } from '../../src/utils/string.js'
import { run as useTransformers } from '../../src/transformers/index.js'

test('<template> tags', async () => {
  const { html } = await useTransformers(`
    <template uppercase>test</template>
    <template preserve>test</template>
  `)

  expect(cleanString(html)).toBe('TEST <template>test</template>')
})
