import type { Options as MarkdownItOptions } from 'markdown-it';

export default interface MarkdownConfig {
  /**
   *  Path relative to which markdown files are imported.
   *
   *  @default './'
   */
  root?: string;

  /**
   *  Encoding for imported Markdown files.
   *
   *  @default 'utf8'
   */
  encoding?: string;

  /**
   *  Options to pass to the `markdown-it` library.
   *
   *  @default {}
   */
  markdownit?: MarkdownItOptions;

  /**
   *  Plugins for the `markdown-it` library.
   *  @default []
   */
  plugins?: Array<{
    plugin: string;
    options: Record<string, unknown>;
  }>;
}
