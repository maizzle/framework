import type { Opts } from 'string-remove-widows';

export default interface WidowWordsConfig {
  /**
  The attribute name to use.

  @default 'prevent-widows'
  */
  attrName?: string;

  /**
  Replace all widow word `nbsp;` instances with a single space.
  This is basically the opposite of preventing widow words.

  @default false
  */
  removeWidowPreventionMeasures?: Opts['removeWidowPreventionMeasures'];

  /**
  Convert the space entity to the `targetLanguage`.

  @default true
  */
  convertEntities?: Opts['convertEntities'];

  /**
  Language to encode non-breaking spaces in.

  @default 'html'
  */
  targetLanguage?: Opts['targetLanguage'];

  /**
  Should whitespace in front of dashes (-), n-dashes (–) or m-dashes (—) be replaced with a `&nbsp;`.

  @default true
  */
  hyphens?: Opts['hyphens'];

  /**
  The minimum amount of words in a target string, in order to trigger the transformer.

  @default 3
  */
  minWordCount?: Opts['minWordCount'];

  /**
  The minimum amount non-whitespace characters in a target string, in order to trigger the transformer.

  @default 20
  */
  minCharCount?: Opts['minCharCount'];

  /**
  Start/end pairs of strings that will prevent the transformer from removing widow words inside them.
  */
  ignore?: Opts['ignore'];
}
