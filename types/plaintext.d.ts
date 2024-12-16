import type { Opts as PlaintextOptions } from 'string-strip-html';

export default interface PlaintextConfig extends PlaintextOptions {
  /**
   * Configure where plaintext files should be output.
   *
   * @example
   * ```
   * export default {
   *   plaintext: {
   *     output: {
   *       path: 'dist/brand/plaintext',
   *       extension: 'rtxt'
   *     }
   *   }
   * }
   * ```
   */
  output?: {
    /**
     * Directory where Maizzle should output compiled Plaintext files.
     *
     * @default 'build_{env}'
     *
     * @example
     * ```
     * export default {
     *   plaintext: {
     *     output: {
     *       path: 'dist/brand/plaintext'
     *     }
     *   }
     * }
     * ```
     */
    path?: string;

    /**
     * File extension to be used for compiled Plaintext files.
     *
     * @default 'txt'
     *
     * @example
     * ```
     * export default {
     *   plaintext: {
     *     output: {
     *       extension: 'rtxt'
     *     }
     *   }
     * }
     * ```
     */
    extension: string;
  };
}
