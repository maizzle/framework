export type beforeCreateType = (config: any) => Promise<void>;
export type beforeRenderType = (html: string, config: any) => Promise<string>;
export type afterRenderType = (html: string, config: any) => Promise<string>;
export type afterTransformersType = (html: string, config: any) => Promise<string>;
export type afterBuildType = (files: any[], config: any) => Promise<void>;

export default interface EventsConfig {
  /**
  Runs after the Environment config has been computed, but before Templates are processed.
  Exposes the `config` object so you can further customize it.

  @default undefined

  @example
  ```
  module.exports = {
    events: {
      beforeCreate: async (config) => {
        // do something with `config`
      }
    }
  }
  ```
  */
  beforeCreate: beforeCreateType;

  /**
  Runs after the Template's config has been computed, but just before it is compiled.
  It exposes the Template's config, as well as the HTML. Must return the `html` string.

  @default undefined

  @example
  ```
  module.exports = {
    events: {
      beforeRender: async (html, config) => {
        // do something with html and config
        return html;
      }
    }
  }
  ```
  */
  beforeRender: beforeRenderType;

  /**
  Runs after the Template has been compiled, but before any Transformers have been applied.
  Exposes the rendered `html` string and the `config`. Must return the `html` string.

  @default undefined

  @example
  ```
  module.exports = {
    events: {
      afterRender: async (html, config) => {
        // do something with html and config
        return html;
      }
    }
  }
  ```
  */
  afterRender: afterRenderType;

  /**
  Runs after all Transformers have been applied, just before the final HTML is returned.
  Exposes the rendered `html` string and the `config`. Must return the `html` string.

  @default undefined

  @example
  ```
  module.exports = {
    events: {
      afterTransformers: async (html, config) => {
        // do something with html and config
        return html;
      }
    }
  }
  ```
  */
  afterTransformers: afterTransformersType;

  /**
  Runs after all Templates have been compiled and output to disk.
  The files parameter will contain the paths to all the files inside the `build.templates.destination.path` directory.

  @default undefined

  @example
  ```
  module.exports = {
    events: {
      afterBuild: async (files, config) => {
        // do something with files or config
      }
    }
  }
  ```
  */
  afterBuild: afterBuildType;
}
