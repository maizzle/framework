import type {StringifyOptions} from 'query-string';
import type {CoreBeautifyOptions} from 'js-beautify';
import type {Options as MarkdownItOptions} from 'markdown-it';
import type {Opts as PlaintextOptions} from 'string-strip-html';

declare namespace MaizzleFramework {
  interface LayoutsConfig {
    /**
    Encoding to be used when reading a layout file from disk.

    @default 'utf8'
    */
    encoding?: string;

    /**
    Name of the slot tag, where the content will be injected.
    This is typically used in a Layout file, to define the place where to inject a Template.

    @default 'block'
    */
    slotTagName?: string;

    /**
    Name of the fill tag, inside of which content that will be injected is defined.
    This is typically used in a Template file, to extend a Layout.

    @default 'block'
    */
    fillTagName?: string;

    /**
    Path to the layouts folder, relative to the project root.

    @default 'src/layouts'
    */
    root?: string;

    /**
    Tag name to be used in HTML when extending a layout.

    @default 'extends'
    */
    tagName?: string;

  }

  interface PlaintextConfig extends PlaintextOptions {
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

  interface TemplatesConfig {
    /**
    Directory where Maizzle should look for Templates to compile.

    @default 'src/templates'

    @example
    ```
    module.exports = {
      build: {
        templates: {
          source: 'src/templates'
        }
      }
    }
    ```
    */
    source?:
    | string
    | Array<string | TemplatesConfig>
    | ((config: Config) => string | string[]);

    /**
    Define what file extensions your Templates use.
    Maizzle will only compile files from your `source` directory that have these extensions.

    @default 'html'

    @example
    ```
    module.exports = {
      build: {
        templates: {
          filetypes: ['html', 'blade.php']
        }
      }
    }
    ```
    */
    filetypes?: string | string[];

    /**
    Define the output path for compiled Templates, and what file extension they should use.

    @example
    ```
    module.exports = {
      build: {
        templates: {
          destination: {
            path: 'build_production',
            extension: 'html'
          }
        }
      }
    }
    ```
    */
    destination?: {
      /**
      Directory where Maizzle should output compiled Templates.

      @default 'build_{env}'
      */
      path?: string;
      /**
      File extension to be used for compiled Templates.

      @default 'html'
      */
      extension: string;
    };

    /**
    Source and destination directories for your asset files.

    @example
    ```
    module.exports = {
      build: {
        templates: {
          assets: {
            source: 'src/images',
            destination: 'images'
          }
        }
      }
    }
    ```
    */
    assets?: {
      /**
      Directory where Maizzle should look for asset files.

      @default ''
      */
      source?: string;
      /**
      Directory where asset files should be copied to.

      @default 'assets'
      */
      destination?: string;
    };

    /**
    Configure plaintext generation.

    @example
    ```
    module.exports = {
      build: {
        plaintext: {
          skipHtmlDecoding: true,
          destination: {
            path: 'dist/brand/plaintext',
            extension: 'rtxt'
          }
        }
      }
    }
    ```
    */
    plaintext?: boolean | PlaintextConfig;

    /**
    Paths to files or directories from your `source` that should _not_ be copied over to the build destination.

    @default ['']

    @example
    ```
    module.exports = {
      build: {
        templates: {
          source: 'src/templates',
          omit: ['1.html', 'archive/4.html'],
        }
      }
    }
    ```
    */
    omit?: string[];

    /**
    Paths to files relative to your `source` directory that should not be parsed.
    They will be copied over to the build destination as-is.

    @default ['']

    @example
    ```
    module.exports = {
      build: {
        templates: {
          source: 'src/templates',
          skip: ['1.html', 'archive/3.html'],
        }
      }
    }
    ```
    */
    skip?: string | string[];
  }

  interface ComponentsConfig {
    /**
    Root path where to look for folders containing component files.

    @default './'
    */
    root?: string;

    /**
    Paths where to look for component files. Must be relative to `root`.

    @default ['src/components', 'src/layouts', 'src/templates']
    */
    folders?: string[];

    /**
    Prefix to use for component tags.

    @default 'x-'
    */
    tagPrefix?: string;

    /**
    Tag name to be used in HTML when using a component.

    @default 'component'
    */
    tag?: string;

    /**
    Attribute name to be used when referencing a component via its path.

    @default 'src'
    */
    attribute?: string;

    /**
    File extension that component files must use.
    Any other files will be ignored and not be made available as components.

    @default 'html'
    */
    fileExtension?: string;

    /**
    Name of the tag that will be replaced with the content that is passed to the component.

    @default 'content'
    */
    yield?: string;

    /**
    Name of the slot tag, where the content will be injected.

    @default 'slot'
    */
    slot?: string;

    /**
    Name of the fill tag, where the content to be injected is defined.

    @default 'fill'
    */
    fill?: string;

    /**
    String to use as a separator between the slot tag and its name.

    @default ':'
    */
    slotSeparator?: string;

    /**
    Tag name for pushing content to a stack.

    @default 'push'
    */
    push?: string;

    /**
    Tag name for popping (rendering) content from a stack.

    @default 'stack'
    */
    stack?: string;

    /**
    Name of the props attribute to use in the `<script>` tag of a component.

    @default 'props'
    */
    propsScriptAttribute?: string;

    /**
    Name of the object that will be used to store the props of a component.

    @default 'props'
    */
    propsContext?: string;

    /**
    Name of the attribute that will be used to pass props to a component as JSON.

    @default 'locals'
    */
    propsAttribute?: string;

    /**
    Name of the key to use when retrieving props passed to a slot via `$slots.slotName.props`.

    @default 'props'
    */
    propsSlot?: string;

    /**
    Configure [`posthtml-parser`](https://github.com/posthtml/posthtml-parser).

    @default {recognizeSelfClosing:true}
    */
    parserOptions?: Record<string, any>;

    /**
    Configure [`posthtml-expressions`](https://github.com/posthtml/posthtml-expressions).

    @default {} // custom object
    */
    expressions?: Record<any, any>;

    /**
    PostHTML plugins to apply to each parsed component.

    @default []
    */
    plugins?: any[];

    /**
    Extra rules for the PostHTML plugin that is used by components to parse attributes.

    @default {}
    */
    attrsParserRules?: Record<any, any>;

    /**
    In strict mode, an error will be thrown if a component cannot be rendered.

    @default true
    */
    strict?: boolean;

    /**
    Utility methods to be passed to `<script props>` in a component.

    @default {merge: _.mergeWith, template: _.template}
    */
    utilities?: Record<string, unknown>;

    /**
    Define additional attributes that should be preserved for specific HTML elements.

    @default {}
    */
    elementAttributes?: Record<string, void>;

    /**
    Attributes that should be preserved on all elements in components.

    @default ['data-*']
    */
    safelistAttributes?: string[];

    /**
    Attributes that should be removed from all elements in components.

    @default []
    */
    blacklistAttributes?: string[];
  }

  interface ExpressionsConfig {
    /**
    Define the starting and ending delimiters used for expressions.

    @default ['{{', '}}']
    */
    delimiters?: string[];

    /**
    Define the starting and ending delimiters used for unescaped expressions.

    @default ['{{{', '}}}']
    */
    unescapeDelimiters?: string[];

    /**
    Object containing data that will be available under the `page` object.

    @default {}
    */
    locals?: Record<string, unknown>;

    /**
    Attribute name for `<script>` tags that contain locals.

    @default 'locals'
    */
    localsAttr?: string;

    /**
    Whether to remove `<script>` tags that contain locals.

    @default false
    */
    removeScriptLocals?: boolean;

    /**
    Tag names to be used for if/else statements.

    @default ['if', 'elseif', 'else']
    */
    conditionalTags?: string[];

    /**
    Tag names to be used for switch statements.

    @default ['switch', 'case', 'default']
    */
    switchTags?: string[];

    /**
    Tag names to be used for loops.

    @default ['each', 'for']
    */
    loopTags?: string[];

    /**
    Tag names to be used for scopes.

    @default ['scope']
    */
    scopeTags?: string[];

    /**
    Name of tag inside of which expression parsing is disabled.

    @default 'raw'
    */
    ignoredTag?: string;

    /**
    Enabling strict mode will throw an error if an expression cannot be evaluated.

    @default false
    */
    strictMode?: boolean;
  }

  interface TailwindConfig {
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

  interface BrowsersyncConfig {
    /**
    Enable the file explorer when the dev server is started.

    @default true
    */
    directory?: boolean;

    /**
    Enable Browsersync's pop-over notifications.

    @default false
    */
    notify?: boolean;

    /**
    Which URL to open automatically when Browsersync starts.

    @default false
    */
    open?: boolean | string;

    /**
    The port to run the dev server on.

    @default 3000
    */
    port?: number;

    /**
    Whether to tunnel the dev server through a random public URL.

    @default false
    */
    tunnel?: boolean | string;

    /**
    Configure the Browsersync server UI.

    @default {port: 3001}
    */
    ui?: Record<any, any> | boolean;

    /**
    Additional paths for Browsersync to watch.

    @default ['src/**', 'tailwind.config.js', 'config.*.js']
    */
    watch?: string[];
  }

  interface PostHTMLOptions {
    /**
    Configure the PostHTML parser to process custom directives.

    @default []
    */
    directives?: any[];

    /**
    Enable `xmlMode` if you're using Maizzle to output XML content, and not actual HTML.

    @default false
    */
    xmlMode?: boolean;

    /**
    Decode entities in the HTML.

    @default false
    */
    decodeEntities?: boolean;

    /**
    Output all tags in lowercase. Works only when `xmlMode` is disabled.

    @default false
    */
    lowerCaseTags?: boolean;

    /**
    Output all attribute names in lowercase.

    @default false
    */
    lowerCaseAttributeNames?: boolean;

    /**
    Recognize CDATA sections as text even if the `xmlMode` option is disabled.

    @default false
    */
    recognizeCDATA?: boolean;

    /**
    Recognize self-closing tags.
    Disabling this will cause rendering to stop at the first self-closing custom (non-HTML) tag.

    @default true
    */
    recognizeSelfClosing?: boolean;

    /**
    If enabled, AST nodes will have a location property containing the `start` and `end` line and column position of the node.

    @default false
    */
    sourceLocations?: boolean;

    /**
    Whether attributes with no values should render exactly as they were written, without `=""` appended.

    @default true
    */
    recognizeNoValueAttribute?: boolean;

    /**
    Tell PostHTML to treat custom tags as self-closing.

    @default []
    */
    singleTags?: string[] | RegExp[];

    /**
    Define the closing format for single tags.

    @default 'default'
    */
    closingSingleTag?: 'tag' | 'slash';

    /**
    Whether to quote all attribute values.

    @default true
    */
    quoteAllAttributes?: boolean;

    /**
    Replaces quotes in attribute values with `&quote;`.

    @default true
    */
    replaceQuote?: boolean;

    /**
    Specify the style of quote around the attribute values.

    @default 2

    @example

    `0` - Quote style is based on attribute values (an alternative for `replaceQuote` option)

    ```
    <img src="example.jpg" onload='testFunc("test")'>
    ```

    @example

    `1` - Attribute values are wrapped in single quotes

    ```
    <img src='example.jpg' onload='testFunc("test")'>
    ```

    @example

    `2` - Attribute values are wrapped in double quotes

    ```
    <img src="example.jpg" onload="testFunc("test")">
    ```
    */
    quoteStyle?: 0 | 1 | 2;
  }

  interface PostHTMLConfig {
    /**
    Configure expressions.
    */
    expressions?: ExpressionsConfig;

    /**
    Configure PostHTML options.
     */
    options?: PostHTMLOptions;

    /**
    Additional PostHTML plugins that you would like to use.

    These will run last, after components.

    @default []

    @example
    ```
    const spaceless = require('posthtml-spaceless')
    module.exports = {
      build: {
        posthtml: {
          plugins: [
            spaceless()
          ]
        }
      }
    }
    ```
    */
    plugins?: any[];

    /**
    Configure the `posthtml-mso` plugin.
    */
    outlook?: {
      /**
      The tag name to use for Outlook conditional comments.

      @default 'outlook'

      @example
      ```
      module.exports = {
        build: {
          posthtml: {
            outlook: {
              tag: 'mso'
            }
          }
        }
      }
      // You now write <mso>...</mso> instead of <outlook>...</outlook>
      ```
      */
      tag?: string;
    };
  }

  interface BuildConfig {
    /**
    Templates configuration.
    */
    templates: TemplatesConfig;
    /**
    Tailwind CSS configuration.
    */
    tailwind?: TailwindConfig;
    /**
    [DEPRECATED] Layouts configuration.
    */
    layouts?: LayoutsConfig;
    /**
    Components configuration.
    */
    components?: ComponentsConfig;
    /**
    PostHTML configuration.
    */
    posthtml?: PostHTMLConfig;
    /**
    Configure PostCSS
     */
    postcss?: {
      /**
      Additional PostCSS plugins that you would like to use.

      @default []

      @example
      ```
      const examplePlugin = require('postcss-example-plugin')
      module.exports = {
        build: {
          postcss: {
            plugins: [
              examplePlugin()
            ]
          }
        }
      }
      ```
      */
      plugins?: any[];
    };
    /**
    Browsersync configuration.

    When you run the `maizzle serve` command, Maizzle uses [Browsersync](https://browsersync.io/)
    to start a local development server and open a directory listing of your emails in your default browser.
    */
    browsersync?: BrowsersyncConfig;
    /**
    Configure how build errors are handled when developing with the Maizzle CLI.

    @default undefined
    */
    fail?: 'silent' | 'verbose';
  }

  type AttributeToStyleSupportedAttributes =
    | 'width'
    | 'height'
    | 'bgcolor'
    | 'background'
    | 'align'
    | 'valign';

  interface InlineCSSConfig {
    /**
    Which CSS properties should be duplicated as what HTML attributes.

    @default {}

    @example
    ```
    module.exports = {
      build: {
        inlineCSS: {
          styleToAttribute: {
            'background-color': 'bgcolor',
          }
        }
      }
    }
    ```
    */
    styleToAttribute?: Record<string, string>;

    /**
    Duplicate HTML attributes to inline CSS.

    @default false

    @example
    ```
    module.exports = {
      build: {
        inlineCSS: {
          attributeToStyle: ['width', 'bgcolor', 'background']
        }
      }
    }
    ```
    */
    attributeToStyle?: boolean | AttributeToStyleSupportedAttributes[];

    /**
    HTML elements that will receive `width` attributes based on inline CSS width.

    @default []

    @example
    ```
    module.exports = {
      build: {
        inlineCSS: {
          applyWidthAttributes: ['td', 'th']
        }
      }
    }
    ```
    */
    applyWidthAttributes?: string[];

    /**
    HTML elements that will receive `height` attributes based on inline CSS height.

    @default []

    @example
    ```
    module.exports = {
      build: {
        inlineCSS: {
          applyHeightAttributes: ['td', 'th']
        }
      }
    }
    ```
    */
    applyHeightAttributes?: string[];

    /**
    List of elements that should only use `width` and `height`. Their inline CSS `width` and `height` will be removed.

    @example
    ```
    module.exports = {
      inlineCSS: {
        keepOnlyAttributeSizes: {
          width: ['img', 'video'],
          height: ['img', 'video']
        }
      }
    }
    ```
    */
    keepOnlyAttributeSizes?: {
      /**
      List of elements that should only use the `width` HTML attribute (inline CSS width will be removed).

      @default []

      @example
      ```
      module.exports = {
        inlineCSS: {
          keepOnlyAttributeSizes: {
            width: ['img', 'video'],
          }
        }
      }
      ```
      */
      width?: string[];
      /**
      List of elements that should only use the `height` HTML attribute (inline CSS height will be removed).

      @default []

      @example
      ```
      module.exports = {
        inlineCSS: {
          keepOnlyAttributeSizes: {
            height: ['img', 'video']
          }
        }
      }
      ```
      */
      height?: string[];
    };

    /**
    Remove inlined `background-color` CSS on elements containing a `bgcolor` HTML attribute.

    @default false

    @example
    ```
    module.exports = {
      inlineCSS: {
        preferBgColorAttribute: ['td'] // default: ['body', 'marquee', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr']
      }
    }
    ```
    */
    preferBgColorAttribute?: boolean | string[];

    /**
    Array of CSS property names that should be excluded from the CSS inlining process. `--tw-shadow` is excluded by default.

    @default []

    @example
    ```
    module.exports = {
      inlineCSS: {
        excludedProperties: ['padding', 'padding-left']
      }
    }
    ```
    */
    excludedProperties?: string[];

    /**
    An object where each value has a `start` and `end` to specify fenced code blocks that should be ignored during CSS inlining.

    @default {EJS: {}, HBS: {}}

    @example
    ```
    module.exports = {
      EJS: { start: '<%', end: '%>' },
      HBS: { start: '{{', end: '}}' },
    }
    ```
    */
    codeBlocks?: {
      EJS?: Record<string, string>;
      HBS?: Record<string, string>;
    };

    /**
    Provide your own CSS to be inlined. Must be vanilla or pre-compiled CSS.

    Existing `<style>` in your HTML tags will be ignored and their contents won't be inlined.

    @default undefined

    @example
    ```
    module.exports = {
      inlineCSS: {
        customCSS: `
          .custom-class {
            color: red;
          }
        `
      }
    }
    ```
     */
    customCSS?: string;
  }

  interface RemoveUnusedCSSConfig {
    /**
    Classes or IDs that you don't want removed.

    @default []
    */
    whitelist?: string[];

    /**
    Start and end delimiters for computed classes that you don't want removed.

    @default [{heads: '{{', tails: '}}'}, {heads: '{%', tails: '%}'}]
    */
    backend?: Array<Record<string, string>>;

    /**
    Whether to remove `<!-- HTML comments -->`.

    @default true
    */
    removeHTMLComments?: boolean;

    /**
    Whether to remove `/* CSS comments *\/`.

    @default true
    */
    removeCSSComments?: boolean;

    /**
    Whether to remove classes that have been inlined.

    @default undefined
    */
    removeInlinedSelectors?: boolean;

    /**
    List of strings representing start of a conditional comment that should not be removed.

    @default ['[if', '[endif']
    */
    doNotRemoveHTMLCommentsWhoseOpeningTagContains: string[];

    /**
    Rename all classes and IDs in both your `<style>` tags and your body HTML elements, to be as few characters as possible.

    @default false
    */
    uglify?: boolean;
  }

  interface URLParametersConfig {
    [key: string]: any;
    /**
    Array of tag names to process. Only URLs inside `href` attributes of tags in this array will be processed.

    @default ['a']
    */
    tags?: string[];

    /**
    By default, query parameters are appended only to valid URLs.
    Disable strict mode to append parameters to any string.

    @default true
    */
    strict?: boolean;

    /**
    Options to pass to the `query-string` library.
    */
    qs?: StringifyOptions;
  }

  interface WidowWordsConfig {
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

  interface MarkdownConfig {
    /**
    Path relative to which markdown files are imported.

    @default './'
    */
    root?: string;

    /**
    Encoding for imported Markdown files.

    @default 'utf8'
    */
    encoding?: string;

    /**
    Options to pass to the `markdown-it` library.

    @default {}
    */
    markdownit?: MarkdownItOptions;

    /**
    Plugins for the `markdown-it` library.

    @default []
    */
    plugins?: any[];
  }

  interface MinifyConfig {
    /**
    Maximum line length. Works only when `removeLineBreaks` is `true`.

    @default 500
    */
    lineLengthLimit?: number;

    /**
    Remove all line breaks from HTML when minifying.

    @default true
    */
    removeLineBreaks?: boolean;

    /**
    Remove code indentation when minifying HTML.

    @default true
    */
    removeIndentations?: boolean;

    /**
    Remove `<!-- HTML comments -->` when minifying HTML.

    `0` - don't remove any HTML comments

    `1` - remove all comments except Outlook conditional comments

    `2` - remove all comments, including Outlook conditional comments

    @default false
    */
    removeHTMLComments?: boolean | number;

    /**
    Remove CSS comments when minifying HTML.

    @default true
    */
    removeCSSComments?: boolean;

    /**
    When any of given strings are encountered and `removeLineBreaks` is true, current line will be terminated.

    @default
    [
      '</td',
      '<html',
      '</html',
      '<head',
      '</head',
      '<meta',
      '<link',
      '<table',
      '<script',
      '</script',
      '<!DOCTYPE',
      '<style',
      '</style',
      '<title',
      '<body',
      '@media',
      '</body',
      '<!--[if',
      '<!--<![endif',
      '<![endif]'
    ]
    */
    breakToTheLeftOf?: string[] | boolean | null;

    /**
    Some inline tags can accidentally introduce extra text.
    The minifier will take extra precaution when minifying around these tags.

    @default
    [
      'a',
      'abbr',
      'acronym',
      'audio',
      'b',
      'bdi',
      'bdo',
      'big',
      'br',
      'button',
      'canvas',
      'cite',
      'code',
      'data',
      'datalist',
      'del',
      'dfn',
      'em',
      'embed',
      'i',
      'iframe',
      'img',
      'input',
      'ins',
      'kbd',
      'label',
      'map',
      'mark',
      'meter',
      'noscript',
      'object',
      'output',
      'picture',
      'progress',
      'q',
      'ruby',
      's',
      'samp',
      'script',
      'select',
      'slot',
      'small',
      'span',
      'strong',
      'sub',
      'sup',
      'svg',
      'template',
      'textarea',
      'time',
      'u',
      'tt',
      'var',
      'video',
      'wbr'
    ]
    */
    mindTheInlineTags?: string[] | boolean | null;
  }

  interface BaseURLConfig {
    /**
    The URL to prepend.

    @default undefined
    */
    url: string;

    /**
    Tags to apply the `url` to. When using this option, the `url` will only be prepended to the specified tags.

    Maizzle uses a [custom set of tags](https://github.com/posthtml/posthtml-base-url/blob/main/lib/index.js#L6-L60) by default.

    @example

    Prepend `url` to all 'source'-like attribute values on image tags, like `src` and `srcset`:

    ```
    module.exports = {
      baseURL: {
        url: 'https://cdn.example.com/',
        tags: ['img'],
      },
    }
    ```

    With more granular control:

    ```
    module.exports = {
      baseURL: {
        url: 'https://cdn.example.com/',
        tags: {
          img: {
            src: true, // use the value of `url` above
            srcset: 'https://bar.com/',
          },
        },
      },
    }
    ```
    */
    tags?: string[] | Record<string, unknown>;

    /**
    Key-value pairs of attributes and the string to prepend to their existing value.

    @default {}

    @example

    Prepend `https://example.com/` to all `data-url` attribute values:

    ```
    module.exports = {
      baseURL: {
        attributes: {
          'data-url': 'https://example.com/',
        },
      },
    }
    ```
    */
    attributes?: Record<string, unknown>;

    /**
    Whether the string defined in `url` should be prepended to `url()` values in CSS `<style>` tags.

    @default true
    */
    styleTag?: boolean;

    /**
    Whether the string defined in `url` should be prepended to `url()` values in inline CSS.

    @default true
    */
    inlineCss?: boolean;
  }

  interface Config {
    [key: string]: any;

    /**
    Configure build settings.

    @example
    ```
    module.exports = {
      build: {
        templates: TemplatesConfig,
        tailwind: TailwindConfig,
        layouts: LayoutsConfig,
        components: ComponentsConfig,
        posthtml: PostHTMLConfig,
        browserSync: BrowserSyncConfig,
        fail: 'silent' // or 'verbose'
      }
    }
    ```
    */
    build: BuildConfig;

    /**
    Toggle the use of Transformers.

    @default true

    @example
    ```
    module.exports = {
      applyTransformers: false,
    }
    ```
    */
    applyTransformers?: boolean;

    /**
    Configure CSS inlining.

    To enable it with defaults, simply set it to `true`.
    @example
    ```js
    module.exports = {
      inlineCSS: true,
    }
    ```
    */
    inlineCSS?: boolean | InlineCSSConfig;

    /**
    Configure unused CSS purging.

    To enable it with defaults, simply set it to `true`.
    @example
    ```
    module.exports = {
      removeUnusedCSS: true,
    }
    ```
    */
    removeUnusedCSS?: boolean | RemoveUnusedCSSConfig;

    /**
    Automatically remove HTML attributes.

    By default, empty `style` and `class` attributes are removed.

    @default ['style', 'class']
    */
    removeAttributes?:
    | string[]
    | Array<{
      name: string;
      value: string | RegExp;
    }>;

    /**
    Prevent widow words inside a tag by adding a `&nbsp;` between its last two words.

    @example
    ```
    module.exports = {
      widowWords: true,
    }
    ```
    */
    widowWords?: WidowWordsConfig;

    /**
    Add attributes to elements in your HTML.

    @default
      {
        table: {
          cellpadding: 0,
          cellspacing: 0,
          role: 'none'
        },
        img: {
          alt: ''
        },
      }
    */
    extraAttributes?: boolean | Record<string, unknown>;

    /**
    Normalize escaped character class names like `\:` or `\/` by replacing them with email-safe alternatives.

    @example
    ```
    module.exports = {
      safeClassNames: {
        ':': '__',
        '!': 'i-',
      }
    }
    ```
    */
    safeClassNames?: boolean | Record<string, string>;

    /**
    Rewrite longhand CSS inside style attributes with shorthand syntax.
    Only works with margin, padding and border, and only when all sides are specified.

    @default []

    @example
    ```
    module.exports = {
      shorthandCSS: true, // or ['td', 'div'] to only apply to those tags
    }
    ```
    */
    shorthandCSS?: boolean | string[];

    /**
    Define a string that will be prepended to sources and hrefs in your HTML and CSS.

    @example

    Prepend to all sources and hrefs:

    ```
    module.exports = {
      baseURL: 'https://cdn.example.com/'
    }
    ```

    Prepend only to `src` attributes on image tags:

    ```
    module.exports = {
      baseURL: {
        url: 'https://cdn.example.com/',
        tags: ['img'],
      },
    }
    ```
    */
    baseURL?: string | BaseURLConfig;

    /**
    Transform text inside elements marked with custom attributes.

    Filters work only on elements that contain only text.

    @default {}

    @example
    ```
    module.exports = {
      filters: {
        uppercase: str => str.toUpperCase()
      }
    }
    ```
    */
    filters: Record<string, unknown>;

    /**
    Define variables outside of the `page` object.

    @default {}

    @example
    ```
    module.exports = {
      locals: {
        company: {
          name: 'Spacely Space Sprockets, Inc.'
        }
      }
    }
    ```

    `company` can be then used like this:

    ```
    <p>{{ company.name }}</p>
    ```
    */
    locals?: Record<string, unknown>;

    /**
    Configure custom parameters to append to URLs.

    @example
    ```
    module.exports = {
      urlParameters: {
        _options: {
          tags: ['a'],
          qs: {}, // options for the `query-string` library
        },
        utm_source: 'maizzle',
        utm_campaign: 'Campaign Name',
        utm_medium: 'email',
        custom_parameter: 'foo',
        '1stOfApril': 'bar',
      }
    }
    ```
    */
    urlParameters?: URLParametersConfig;

    /**
    Ensure that all your HEX colors inside `bgcolor` and `color` attributes are defined with six digits.

    @default true

    @example
    ```
    module.exports = {
      sixHex: false,
    }
    ```
    */
    sixHex?: boolean;

    /**
    Pretty print your HTML email code so that it's nicely indented and more human-readable.

    @default undefined

    @example
    ```
    module.exports = {
      prettify: true,
    }
    ```
    */
    prettify?: boolean | CoreBeautifyOptions;

    /**
    Minify the compiled HTML email code.

    @default false

    @example
    ```
    module.exports = {
      minify: true,
    }
    ```
    */
    minify?: boolean | MinifyConfig;

    /**
    Configure the Markdown parser.

    @example

    ```
    module.exports = {
      markdown: {
        root: './', // A path relative to which markdown files are imported
        encoding: 'utf8', // Encoding for imported Markdown files
        markdownit: {}, // Options passed to markdown-it
        plugins: [], // Plugins for markdown-it
      }
    }
    ```
    */
    markdown?: MarkdownConfig;

    /**
    Batch-replace strings in your HTML.

    @default {}

    @example
    ```
    module.exports = {
      replaceStrings: {
        'replace this exact string': 'with this one',
        '\\s?data-src=""': '', // remove empty data-src="" attributes
      }
    }
    ```
    */
    replaceStrings?: Record<string, string>;
  }

  interface RenderOptions {
    /**
    A Maizzle configuration object.

    @default {}

    @example
    ```
    const Maizzle = require('@maizzle/framework');

    Maizzle
      .render(`html string`, {
        maizzle: {
          inlineCSS: true,
        }
      })
      .then(({html, config}) => console.log(html, config))
    ```
    */
    maizzle: Config;

    /**
    Tailwind CSS configuration object.

    @default {}

    @example
    ```
    const Maizzle = require('@maizzle/framework');

    Maizzle
      .render(`html string`, {
        tailwind: {
          config: './tailwind-custom.config.js',
        },
      })
      .then(({html, config}) => console.log(html, config))
    ```
     */
    tailwind?: TailwindConfig;

    /**
    A function that runs after the Template's config has been computed, but just before it is compiled.

    It exposes the Template's config, as well as the HTML.

    @default undefined

    @example
    ```
    const Maizzle = require('@maizzle/framework');

    Maizzle
      .render(`html string`, {
        beforeRender: (html, config) => {
          // do something with html and config
          return html;
        },
      })
      .then(({html, config}) => console.log(html, config))
    ```
    */
    beforeRender?: (html: string, config: Config) => string;

    /**
    A function that runs after the Template has been compiled, but before any Transformers have been applied.

    Exposes the rendered html string and the Templates' config.

    @default undefined

    @example
    ```
    const Maizzle = require('@maizzle/framework');

    Maizzle
      .render(`html string`, {
        afterRender: (html, config) => {
          // do something with html and config
          return html;
        },
      })
      .then(({html, config}) => console.log(html, config))
    ```
    */
    afterRender?: (html: string, config: Config) => string;

    /**
    A function that runs after all Transformers have been applied, just before the final HTML is returned.

    It exposes the Template's config, as well as the HTML.

    @default undefined

    @example
    ```
    const Maizzle = require('@maizzle/framework');

    Maizzle
      .render(`html string`, {
        afterTransformers: (html, config) => {
          // do something with html and config
          return html;
        },
      })
      .then(({html, config}) => console.log(html, config))
    ```
    */
    afterTransformers?: (html: string, config: Config) => string;
  }

  type RenderOutput = {
    /**
    The rendered HTML.
    */
    html: string;

    /**
    The Maizzle configuration object.
    */
    config: Config;
  };

  /**
  Compile an HTML string with Maizzle.

  @param {string} html The HTML string to render.
  @param {RenderOptions} [options] Options to pass to the renderer.
  */
  function render(html: string, options?: RenderOptions): Promise<RenderOutput>;

  /**
  Normalize escaped character class names like `\:` or `\/` by replacing them with email-safe alternatives.

  @param {string} html The HTML string to render.
  @param {object} replacements Customize replacements strategy.
   */
  function safeClassNames(html: string, replacements: Record<string, string>): string;

  /**
  Compile Markdown to HTML.

  @param {string} input String to compile with Markdown.
  @param {Options} [options] markdown-it options.
   */
  function markdown(input: string, options?: MarkdownItOptions): string;

  /**
  Prevent widow words inside a tag by adding a `&nbsp;` between its last two words.

  @param {string} html The HTML string to render.
  @param {WidowWordsConfig} [options] Options to pass to the transformer.
  */
  function preventWidows(html: string, options?: WidowWordsConfig): string;

  /**
  Duplicate HTML attributes to inline CSS.

  @param {string} html The HTML string to render.
  @param {AttributeToStyleSupportedAttributes} [options] Options to pass to the transformer.
  */
  function attributeToStyle(
    html: string,
    options?: AttributeToStyleSupportedAttributes[]
  ): string;

  /**
  Inline CSS styles from `<style>` tags found in `<head>`.

  @param {string} html The HTML string to render.
  @param {InlineCSSConfig} [options] Options to pass to the transformer.
  */
  function inlineCSS(html: string, options?: InlineCSSConfig): string;

  /**
  Rewrite longhand CSS inside style attributes with shorthand syntax.
  Only works with margin, padding and border, and only when all sides are specified.

  @param {string} html The HTML string to render.
  */
  function shorthandCSS(html: string): string;

  /**
  Remove unused CSS from `<style>` tags and HTML elements.

  @param {string} html The HTML string to use.
  @param {RemoveUnusedCSSConfig} [options] Options to pass to the transformer.
  */
  function removeUnusedCSS(html: string, options?: RemoveUnusedCSSConfig): string;

  /**
  Automatically remove HTML attributes.
  @param {string} html The HTML string to use.
  @param options Either an array of attribute names, or an array of objects with `name` and `value` properties.
  */
  function removeAttributes(
    html: string,
    options?:
    | string[]
    | Array<{
      name: string;
      value: string | RegExp;
    }>
  ): string;

  /**
  Add attributes to elements in your HTML.

  @param {string} html The HTML string to use.
  @param {object} options Attributes to add.
  */
  function addAttributes(html: string, options?: Record<string, unknown>): string;

  /**
  Pretty print HTML code so that it's nicely indented and more human-readable.
  @param {string} html The HTML string to prettify.
  @param {CoreBeautifyOptions} [options] Options to pass to the prettifier.
  */
  function prettify(html: string, options?: CoreBeautifyOptions): string;

  /**
  Prepend a string to sources and hrefs in an HTML string.

  @param {string} html The HTML string to use.
  @param {BaseURLConfig} [options] Options to pass to the transformer.
  */
  function applyBaseURL(html: string, options?: string | BaseURLConfig): string;

  /**
  Append parameters to URLs in an HTML string.
  @param {string} html The HTML string to use.
  @param {URLParametersConfig} [options] Options to pass to the transformer.
  */
  function addURLParameters(html: string, options?: URLParametersConfig): string;

  /**
  Ensure that all your HEX colors inside `bgcolor` and `color` attributes are defined with six digits.

  @param {string} html The HTML string to use.
  */
  function ensureSixHex(html: string): string;

  /**
  Minify a string of HTML code.

  @param {string} html The HTML string to minify.
  @param {MinifyConfig} [options] Options to pass to the minifier.
  */
  function minify(html: string, options?: MinifyConfig): string;

  /**
  Batch-replace strings in an HTML string.

  @param {string} html The HTML string to use.
  @param {object} replacements Strings to find and replace.
  */
  function replaceStrings(html: string, replacements?: Record<string, string>): string;

  /**
  Generate a plaintext version of an HTML string.

  @param {string} html The HTML string to use.
  @param {PlaintextConfig} [options] Options to pass to the plaintext generator.
  */
  function plaintext(html: string, options?: PlaintextConfig): Promise<{
    html: string;
    plaintext: string;
    destination: string;
  }>;

  export {
    // Configurations
    Config,
    RenderOptions,
    RenderOutput,
    LayoutsConfig,
    TemplatesConfig,
    ComponentsConfig,
    ExpressionsConfig,
    TailwindConfig,
    BrowserSyncConfig,
    PostHTMLConfig,
    BuildConfig,
    InlineCSSConfig,
    RemoveUnusedCSSConfig,
    URLParametersConfig,
    AttributeToStyleSupportedAttributes,
    WidowWordsConfig,
    MinifyConfig,
    MarkdownConfig,
    BaseURLConfig,
    // Functions
    render,
    safeClassNames,
    markdown,
    preventWidows,
    attributeToStyle,
    inlineCSS,
    shorthandCSS,
    removeUnusedCSS,
    removeAttributes,
    addAttributes,
    prettify,
    applyBaseURL,
    addURLParameters,
    ensureSixHex,
    minify,
    plaintext,
    replaceStrings
  };
}

export = MaizzleFramework;
