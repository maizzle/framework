export default interface WidowWordsConfig {
  /**
  The attribute name to use.

  @default ['prevent-widows', 'no-widows']
  */
  attributes?: Array<string>;

  /**
  Replace all widow word `nbsp;` instances with a single space.
  This is basically the opposite of preventing widow words.

  @default false
  */
  createWidows?: Boolean;

  /**
  The minimum amount of words in a target string, in order to trigger the transformer.

  @default 3
  */
  minWords?: Number;

  /**
  Start/end pairs of strings that will prevent the transformer from removing widow words inside them.

  @default [
    { start: '{{', end: '}}' },  // Handlebars, Liquid, Nunjucks, Twig, Jinja2, Mustache
    { start: '{%', end: '%}' },  // Liquid, Nunjucks, Twig, Jinja2
    { start: '<%=', end: '%>' }, // EJS, ERB
    { start: '<%', end: '%>' },  // EJS, ERB
    { start: '{$', end: '}' },   // Smarty
    { start: '<\\?', end: '\\?>' }, // PHP
    { start: '#{', end: '}' }    // Pug
  ]
  */
  ignore?: Array<{ start: string; end: string }>;
}
