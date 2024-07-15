import ComponentsConfig from './components';
import type { SpinnerName } from 'cli-spinners';

export default interface BuildConfig {
  /**
   * Components configuration.
   */
  components?: ComponentsConfig;

  /**
   * Directory where Maizzle should look for Templates to compile.
   *
   * @default ['src/templates/**\/*.html']
   *
   * @example
   * ```
   * export default {
   *   build: {
   *     files: ['src/templates/**\/*.html']
   *   }
   * }
   * ```
   */
  files?: string | string[];

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
  } | {
    /**
     * An array of objects specifying source and destination directories for static files.
     */
    static: Array<{
      /**
       * Array of paths where Maizzle should look for static files.
       */
      source: string[];
      /**
       * Directory where static files should be copied to,
       * relative to the `build.output` path.
       */
      destination: string;
    }>;
  };

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
}
