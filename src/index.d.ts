import type { CoreBeautifyOptions } from 'js-beautify';
import type { Options } from 'markdown-it';

declare namespace MaizzleFramework {
    interface LayoutsConfig {
        encoding?: string;
        slotTagName?: string;
        fillTagName?: string;
        root?: string;
        tagName?: string;
    }

    interface TemplatesConfig {
        source?: string | Array<string | TemplatesConfig> | ((config: Config) => string | string[]);
        filetypes?: string | string[];
        destination?: {
            path?: string;
            extension: string;
        }
        assets?: {
            source?: string;
            destination?: string;
        }
        omit?: string[];
        skip?: string | string[];
    }

    interface ComponentsConfig {
        root?: string;
        folders?: string[];
        tagPrefix?: string;
        tag?: string;
        attribute?: string;
        fileExtension?: string;
        yield?: string;
        slot?: string;
        fill?: string;
        slotSeparator?: string;
        push?: string;
        propsScriptAttribute?: string;
        propsContext?: string;
        propsAttribute?: string;
        propsSlot?: string;
        parserOptions?: Object;
        expressions?: Object;
        plugins?: Array<any>;
        attrsParserRules?: Object;
        strict?: boolean;
        utilities?: Object;
        elementAttributes?: Object;
        safeListAttributes?: string[];
        blackListAttributes?: string[];
    }

    interface ExpressionsConfig {
        delimiters?: string[];
        unescapeDelimiters?: string[];
        locals?: Object;
        localsAttr?: string;
        removeScriptLocals?: boolean;
        conditionalTags?: string[];
        switchTags?: string[];
        loopTags?: string[];
        scopeTags?: string[];
        ignoredTag?: string;
        strictMode?: boolean;
    }

    interface TailwindConfig {
        config?: string;
        css?: string;
        compiled?: string;
    }

    interface BrowserSyncConfig {
        directory?: boolean;
        notify?: boolean;
        open?: boolean | string;
        port?: number;
        tunnel?: boolean;
        ui?: Object | boolean;
        watch?: string[];
    }

    interface PostHTMLConfig {
        expressions?: ExpressionsConfig;
        directives?: Array<any>;
        xmlMode?: boolean;
        decodeEntities?: boolean;
        lowerCaseTags?: boolean;
        lowerCaseAttributeNames?: boolean;
        recognizeCDATA?: boolean;
        recognizeSelfClosing?: boolean;
        sourceLocations?: boolean;
        recognizeNoValueAttribute?: boolean;
        singleTags?: string[] | RegExp[];
        closingSingleTag?: 'tag' | 'slash';
        quoteAllAttributes?: boolean;
        replaceQuote?: boolean;
        quoteStyle?: 0 | 1 | 2;
        plugins?: Array<any>;
    }

    interface BuildConfig {
        templates: TemplatesConfig;
        tailwind?: TailwindConfig;
        layouts?: LayoutsConfig;
        components?: ComponentsConfig;
        posthtml?: PostHTMLConfig;
        browserSync?: BrowserSyncConfig;
        fail?: 'silent' | 'verboose';
    }

    type AttributeToStyleSupportedAttributes = 'width' | 'height' | 'bgcolor' | 'background' | 'align' | 'valign';

    interface InlineCSSConfig {
        styleToAttribute?: Object;
        attributeToStyle?: boolean | Array<AttributeToStyleSupportedAttributes>;
        applyWidthAttributes?: string[];
        applyHeightAttributes?: string[];
        keepOnlyAttributeSizes?: {
            width?: string[];
            height?: string[];
        };
        preferBgColorAttribute?: boolean | string[];
        excludedProperties?: string[];
        codeBlocks?: {
            EJS?: Object;
            HBS?: Object;
        };

    }

    interface RemoveUnusedCSSConfig {
        whitelist?: string[];
        backend?: Object[];
        removeHTMLComments?: boolean;
        removeCSSComments?: boolean;
        removeInlinedSelectors?: boolean;
        doNotRemoveHTMLCommentsWhoseOpeningTagContains: string[];
        uglify?: boolean;
    }

    interface URLParametersConfig {
        tags?: string[];
        strict?: boolean;
        qs?: Object;
        [key: string]: any;
    }

    interface WidowWordsConfig {
        attrName?: string;
        removeWindowPreventionMeasures?: boolean;
        convertEntities?: boolean;
        targetLanguage?: 'html' | 'css' | 'js';
        hyphens?: boolean;
        minWordCount?: number;
        minCharCount?: number;
        ignore?: string | string[];
    }

    interface Config {
        inlineCSS?: boolean | InlineCSSConfig;
        removeUnusedCSS?: boolean | RemoveUnusedCSSConfig;
        removeAttributes?: string[] | {
            name: string;
            value: string | RegExp;
        }[];
        widowWords?: WidowWordsConfig;
        extraAttributes?: boolean | Object;
        safeClassNames?: boolean | Object;
        shorthandCSS?: boolean | string[];
        applyTransformers?: boolean;
        css: string;
        build: BuildConfig;
        baseURL?: string | {
            url: string;
            tags?: string[] | Object;
            attributes?: Object;
            styleTag?: boolean;
            inlineCss?: boolean;

        };
        filters: Object;
        locals?: Object;
        urlParameters?: URLParametersConfig;
        sixHex?: boolean;
        prettify?: boolean | CoreBeautifyOptions;
        minify?: boolean | {
            lineLengthLimit?: number;
            removeIndentations?: boolean;
            removeLineBreaks?: boolean;
            removeHTMLComments?: boolean;
            removeCSSComments?: boolean;
            breakToTheLeftOf?: string[];
            mindTheInlineTags?: string[];
        };
        replaceStrings?: Object;
        [key: string]: any;
    }

    interface RenderOptions {
        maizzle: Object;
        tailwind?: {
            config?: Object;
            css?: string;
            compiled?: string;
        };
        beforeRender?: (html: string, config: Config) => string;
        afterRender?: (html: string, config: Config) => string;
        afterTransformers?: (html: string, config: Config) => string;
    }

    type RenderOutput = {
        html: string;
        config: Config;
    };

    function render(html: string, options?: RenderOptions): Promise<RenderOutput>;
    function safeClassNames(html: string, replacements: Object): string;
    function markdown(input: string, options?: Options): string;
    function preventWidows(html: string, options?: WidowWordsConfig): string;
    function attributeToStyle(html: string, options?: AttributeToStyleSupportedAttributes[]): string;
    function inlineCSS(html: string, options?: InlineCSSConfig): string;
    function shorthandCSS(html: string): string;
    function removeUnusedCSS(html: string, options?: {
        whitelist: string[];
        backend: {
            heads: string;
            tails: string;
        }[];
        uglify: boolean;
        removeHTMLComments: boolean;
        removeCSSComments: boolean;
        doNotRemoveHTMLCommentsWhoseOpeningTagContains: string[];
        reportProgressFunc: null | ((percDone: number) => void);
        reportProgressFuncFrom: number;
        reportProgressFuncTo: number;
    }): string;
    function removeAttributes(html: string, options?: string[] | {
        name: string;
        value: string | RegExp;
    }[]): string;
    function addAttributes(html: string, options?: Object): string;
    function prettify(html: string, options?: CoreBeautifyOptions): string;
    function applyBaseURL(html: string, options?: string | {
        url: string;
        tags?: string[] | Object;
        attributes?: Object;
        styleTag?: boolean;
        inlineCss?: boolean;
    }): string;
    function addURLParameters(html: string, options?: URLParametersConfig): string;
    function ensureSixHex(html: string): string;
    function minify(html: string, options?: {
        lineLengthLimit?: number;
        removeIndentations?: boolean;
        removeLineBreaks?: boolean;
        removeHTMLComments?: boolean;
        removeCSSComments?: boolean;
        breakToTheLeftOf?: string[];
        mindTheInlineTags?: string[];
    }): string;
    function replaceStrings(html: string, options?: Object): string;


    export {
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
        replaceStrings,
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
    };
}

export = MaizzleFramework;