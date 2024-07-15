import type Config from './config';

export type RenderOutput = {
  /**
  The rendered HTML.
  */
  html: string;

  /**
  The Maizzle configuration object.
  */
  config: Config;
};
