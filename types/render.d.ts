import {
  beforeRenderType,
  afterRenderType,
  afterTransformersType
} from './events';
import type Config from './config';
import type TailwindConfig from './tailwind';

export type RenderOutput = {
  /**
  The rendered HTML.
  */
  html: string;

  /**
  The Maizzle configuration object.
  */
  config: Config;
};

export default interface RenderOptions {
  /**
  A Maizzle configuration object.

  @default {}

  @example
  ```
  const Maizzle = require('@maizzle/framework');

  Maizzle
    .render(`html string`, {
      maizzle: {
        inlineCSS: true,
      }
    })
    .then(({html, config}) => console.log(html, config))
  ```
  */
  maizzle: Config;

  /**
  Tailwind CSS configuration object.

  @default {}

  @example
  ```
  const Maizzle = require('@maizzle/framework');

  Maizzle
    .render(`html string`, {
      tailwind: {
        config: './tailwind-custom.config.js',
      },
    })
    .then(({html, config}) => console.log(html, config))
  ```
   */
  tailwind?: TailwindConfig;

  /**
  A function that runs after the Template's config has been computed, but just before it is compiled.

  It exposes the Template's config, as well as the HTML.

  @default undefined

  @example
  ```
  const Maizzle = require('@maizzle/framework');

  Maizzle
    .render(`html string`, {
      beforeRender: (html, config) => {
        // do something with html and config
        return html;
      },
    })
    .then(({html, config}) => console.log(html, config))
  ```
  */
  beforeRender?: beforeRenderType;

  /**
  A function that runs after the Template has been compiled, but before any Transformers have been applied.

  Exposes the rendered html string and the Templates' config.

  @default undefined

  @example
  ```
  const Maizzle = require('@maizzle/framework');

  Maizzle
    .render(`html string`, {
      afterRender: (html, config) => {
        // do something with html and config
        return html;
      },
    })
    .then(({html, config}) => console.log(html, config))
  ```
  */
  afterRender?: afterRenderType;

  /**
  A function that runs after all Transformers have been applied, just before the final HTML is returned.

  It exposes the Template's config, as well as the HTML.

  @default undefined

  @example
  ```
  const Maizzle = require('@maizzle/framework');

  Maizzle
    .render(`html string`, {
      afterTransformers: (html, config) => {
        // do something with html and config
        return html;
      },
    })
    .then(({html, config}) => console.log(html, config))
  ```
  */
  afterTransformers?: afterTransformersType;
}
