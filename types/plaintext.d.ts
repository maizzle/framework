import type {Opts as PlaintextOptions} from 'string-strip-html';

export default interface PlaintextConfig extends PlaintextOptions {
  /**
  Configure where plaintext files should be output.

  @example
  ```
  module.exports = {
    build: {
      plaintext: {
        destination: {
          path: 'dist/brand/plaintext',
          extension: 'rtxt'
        }
      }
    }
  }
  ```
  */
  destination?: {
    /**
    Directory where Maizzle should output compiled Plaintext files.

    @default 'build_{env}'

    @example
    ```
    module.exports = {
      build: {
        plaintext: {
          destination: {
            path: 'dist/brand/plaintext'
          }
        }
      }
    }
    ```
    */
    path?: string;

    /**
    File extension to be used for compiled Plaintext files.

    @default 'txt'

    @example
    ```
    module.exports = {
      build: {
        plaintext: {
          destination: {
            extension: 'rtxt'
          }
        }
      }
    }
    ```
    */
    extension: string;
  };
}
