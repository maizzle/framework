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
  removeWindowPreventionMeasures?: boolean;

  /**
  Convert the space entity to the `targetLanguage`.

  @default true
  */
  convertEntities?: boolean;

  /**
  Language to encode non-breaking spaces in.

  @default 'html'
  */
  targetLanguage?: 'html' | 'css' | 'js';

  /**
  Should whitespace in front of dashes (-), n-dashes (–) or m-dashes (—) be replaced with a `&nbsp;`.

  @default true
  */
  hyphens?: boolean;

  /**
  The minimum amount of words in a target string, in order to trigger the transformer.

  @default 3
  */
  minWordCount?: number;

  /**
  The minimum amount non-whitespace characters in a target string, in order to trigger the transformer.

  @default 20
  */
  minCharCount?: number;

  /**
  Start/end pairs of strings that will prevent the transformer from removing widow words inside them.
  */
  ignore?: string | string[];
}
