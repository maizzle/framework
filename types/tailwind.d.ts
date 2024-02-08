export default interface TailwindConfig {
  /**
  Path to the Tailwind config file.

  @default 'tailwind.config.js'
  */
  config?: string;

  /**
  Path to your main CSS file, that will be compiled with Tailwind CSS.

  @default 'src/css/tailwind.css'
  */
  css?: string;

  /**
  Pre-compiled CSS. Skip Tailwind CSS processing by providing your own CSS string.

  @default ''
  */
  compiled?: string;
}
