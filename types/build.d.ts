import type { SpinnerName } from 'cli-spinners';

export default interface BuildConfig {
  /**
   * Paths where Maizzle should look for Templates to compile.
   *
   * @default ['src/templates/**\/*.html']
   *
   * @example
   * ```
   * export default {
   *   build: {
   *     content: ['src/templates/**\/*.html']
   *   }
   * }
   * ```
   */
  content?: string[];

  /**
   * Define the output path for compiled Templates, and what file extension they should use.
   *
   * @example
   * ```
   * export default {
   *   build: {
   *     output: {
   *       path: 'build_production',
   *       extension: 'html'
   *     }
   *   }
   * }
   * ```
   */
  output?: {
    /**
     * Directory where Maizzle should output compiled Templates.
     *
     * @default 'build_{env}'
     */
    path?: string;
    /**
     * File extension to be used for compiled Templates.
     *
     * @default 'html'
     */
    extension: string;
    /**
     * Path or array of paths that will be unwrapped.
     * Everything inside them will be copied to
     * the root of the output directory.
     *
     * @example
     *
     * ```
     * export default {
     *  build: {
     *   content: ['test/fixtures/**\/*.html'],
     *   output: {
     *    from: ['test/fixtures'],
     *  }
     * }
     * ```
     *
     * This will copy everything inside `test/fixtures` to the root
     * of the output directory, not creating the `test/fixtures`
     * directory.
     *
     */
    from: string;
  };

  /**
   * Source and destination directories for static files.
   *
   * @example
   * ```
   * export default {
   *   build: {
   *     static: {
   *       source: ['src/images/**\/*.*'],
   *       destination: 'images'
   *     }
   *   }
   * }
   * ```
   */
  static?: {
    /**
     * Array of paths where Maizzle should look for static files.
     *
     * @default undefined
     */
    source?: string[];
    /**
     * Directory where static files should be copied to,
     * relative to the `build.output` path.
     *
     * @default undefined
     */
    destination?: string;
  } | Array<{
    source?: string[];
    destination?: string;
  }>

  /**
   * Type of spinner to show in the console.
   *
   * @default 'dots'
   *
   * @example
   * ```
   * export default {
   *   build: {
   *     spinner: 'bounce'
   *   }
   * }
   * ```
   */
  spinner?: SpinnerName;

  /**
   * Show a summary of files that were compiled, along with their
   * size and the time it took to compile them.
   *
   * @default false
   *
   * @example
   * ```
   * export default {
   *   build: {
   *     summary: true
   *   }
   * }
   * ```
   */
  summary?: boolean;

  /**
   * Information about the Template currently being compiled.
   *
   * @example
   *
   * ```
   * {
      path: {
        root: '',
        dir: 'build_production',
        base: 'transactional.html',
        ext: '.html',
        name: 'transactional'
      }
    }
    * ```
   */
  readonly current?: {
    path?: {
      root: string;
      dir: string;
      base: string;
      ext: string;
      name: string;
    };
  };
}
