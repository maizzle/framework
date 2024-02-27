import type Config from './config';
import type PlaintextConfig from './plaintext';

export default interface TemplatesConfig {
  /**
  Directory where Maizzle should look for Templates to compile.

  @default 'src/templates'

  @example
  ```
  module.exports = {
    build: {
      templates: {
        source: 'src/templates'
      }
    }
  }
  ```
  */
  source?:
  | string
  | Array<string | TemplatesConfig>
  | ((config: Config) => string | string[]);

  /**
  Define what file extensions your Templates use.
  Maizzle will only compile files from your `source` directory that have these extensions.

  @default 'html'

  @example
  ```
  module.exports = {
    build: {
      templates: {
        filetypes: ['html', 'blade.php']
      }
    }
  }
  ```
  */
  filetypes?: string | string[];

  /**
  Define the output path for compiled Templates, and what file extension they should use.

  @example
  ```
  module.exports = {
    build: {
      templates: {
        destination: {
          path: 'build_production',
          extension: 'html'
        }
      }
    }
  }
  ```
  */
  destination?: {
    /**
    Directory where Maizzle should output compiled Templates.

    @default 'build_{env}'
    */
    path?: string;
    /**
    File extension to be used for compiled Templates.

    @default 'html'
    */
    extension: string;
  };

  /**
   * Source and destination directories for your asset files.
   *
   * @example
   * ```
   * module.exports = {
   *   build: {
   *     templates: {
   *       assets: {
   *         source: 'src/images',
   *         destination: 'images'
   *       }
   *     }
   *   }
   * }
   * ```
   */
  assets?: {
    /**
     * Directory where Maizzle should look for asset files.
     *
     * @default ''
     */
    source?: string;
    /**
     * Directory where asset files should be copied to.
     *
     * @default 'assets'
     */
    destination?: string;
  } | {
    /**
     * An array of objects specifying source and destination directories for asset files.
     */
    assets: Array<{
      /**
       * Directory where Maizzle should look for asset files.
       */
      source: string;
      /**
       * Directory where asset files should be copied to.
       */
      destination: string;
    }>;
  };

  /**
  Configure plaintext generation.

  @example
  ```
  module.exports = {
    build: {
      plaintext: {
        skipHtmlDecoding: true,
        destination: {
          path: 'dist/brand/plaintext',
          extension: 'rtxt'
        }
      }
    }
  }
  ```
  */
  plaintext?: boolean | PlaintextConfig;

  /**
  Paths to files or directories from your `source` that should _not_ be copied over to the build destination.

  @default ['']

  @example
  ```
  module.exports = {
    build: {
      templates: {
        source: 'src/templates',
        omit: ['1.html', 'archive/4.html'],
      }
    }
  }
  ```
  */
  omit?: string[];

  /**
  Paths to files relative to your `source` directory that should not be parsed.
  They will be copied over to the build destination as-is.

  @default ['']

  @example
  ```
  module.exports = {
    build: {
      templates: {
        source: 'src/templates',
        skip: ['1.html', 'archive/3.html'],
      }
    }
  }
  ```
  */
  skip?: string | string[];
}
