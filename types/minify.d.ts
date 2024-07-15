import type { Opts } from 'html-crush';

export default interface MinifyConfig {
  /**
   * Maximum line length. Works only when `removeLineBreaks` is `true`.
   *
   * @default 500
   */
  lineLengthLimit?: Opts['lineLengthLimit'];

  /**
   * Remove all line breaks from HTML when minifying.
   *
   * @default true
   */
  removeLineBreaks?: Opts['removeLineBreaks'];

  /**
   * Remove code indentation when minifying HTML.
   *
   * @default true
  */
  removeIndentations?: Opts['removeIndentations'];

  /**
   * Remove `<!-- HTML comments -->` when minifying HTML.
   *
   * `0` - don't remove any HTML comments
   *
   * `1` - remove all comments except Outlook conditional comments
   *
   * `2` - remove all comments, including Outlook conditional comments
   *
   * @default false
   */
  removeHTMLComments?: Opts['removeHTMLComments'];

  /**
   * Remove CSS comments when minifying HTML.
   *
   * @default true
   */
  removeCSSComments?: Opts['removeCSSComments'];

  /**
   * When any of given strings are encountered and `removeLineBreaks` is true, current line will be terminated.
   *
   * @default
   * [
   *   '</td',
   *   '<html',
   *   '</html',
   *   '<head',
   *   '</head',
   *   '<meta',
   *   '<link',
   *   '<table',
   *   '<script',
   *   '</script',
   *   '<!DOCTYPE',
   *   '<style',
   *   '</style',
   *   '<title',
   *   '<body',
   *   '@media',
   *   '</body',
   *   '<!--[if',
   *   '<!--<![endif',
   *   '<![endif]'
   * ]
   */
  breakToTheLeftOf?: Opts['breakToTheLeftOf'];

  /**
   * Some inline tags can accidentally introduce extra text.
   * The minifier will take extra precaution when minifying around these tags.
   *
   * @default
   * [
   *   'a',
   *   'abbr',
   *   'acronym',
   *   'audio',
   *   'b',
   *   'bdi',
   *   'bdo',
   *   'big',
   *   'br',
   *   'button',
   *   'canvas',
   *   'cite',
   *   'code',
   *   'data',
   *   'datalist',
   *   'del',
   *   'dfn',
   *   'em',
   *   'embed',
   *   'i',
   *   'iframe',
   *   'img',
   *   'input',
   *   'ins',
   *   'kbd',
   *   'label',
   *   'map',
   *   'mark',
   *   'meter',
   *   'noscript',
   *   'object',
   *   'output',
   *   'picture',
   *   'progress',
   *   'q',
   *   'ruby',
   *   's',
   *   'samp',
   *   'script',
   *   'select',
   *   'slot',
   *   'small',
   *   'span',
   *   'strong',
   *   'sub',
   *   'sup',
   *   'svg',
   *   'template',
   *   'textarea',
   *   'time',
   *   'u',
   *   'tt',
   *   'var',
   *   'video',
   *   'wbr'
   * ]
   */
  mindTheInlineTags?: Opts['mindTheInlineTags'];
}
