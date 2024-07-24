import type { SpinnerName } from 'cli-spinners';
import type ExpressionsConfig from './expressions';

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
  Configure expressions.
  */
  expressions?: ExpressionsConfig;

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
