# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2024-??-??

These are notes for the release, not the actual release notes.

### New Features

- files: ['test/fixtures/**/*.html', '!test/fixtures/build/beforeCreate.html'], -> document how to negate file paths
- template sources (build.files) can no longer be a function, only an array of globs; show how to use a function to generate these globs in the docs, because we now have top level await (ie fetch from some api maybe?)
- note: binary files alongside templates in build.files globs will only be copied if the glob covers all files, i.e. `**/*.*` and not `**/*.html` or `**/file.html`

### Added

### Changed

- event payloads can now be destructured into {html, config, render}
- returning HTML from events is now optional, if missing the original HTML will be used

### Fixed

- fixed an issue with identical file names in different root folders when using multiple template sources
  For example, if you had `source: ['foo', 'src/templates'],` and a `index.html` in each, the one in `src/templates` would overwrite the first one in the build output, because the directory structure was not being preserved correctly.

### Removed

- removed `inlineCSS.preferBgColorAttribute`


## [2.5.0] - 2020-11-06

### Added

- Use Tailwind CSS inside `<outlook>` conditional tags (#349)
- Define top-level data objects in your config (#350)

### Changed

- default to Tailwind's PurgeCSS extractor

### Fixed

- always remove the `<plaintext>` tag from the HTML version

## [2.4.1] - 2020-10-31

- the plaintext generator now accepts `options`, if you need to configure string-strip-html.

## [2.4.0] - 2020-10-30

### Added

- new plaintext method d95846a
- use purging from tailwind config if set f440db8

### Fixed

- disable decodeEntities by default 1cb15d4

### Changed

- always set NODE_ENV to production if not developing locally 8e420a4

## [2.3.4] - 2020-10-29

### Fixed

- fix: disable decodeEntities in all transformers 8af4342

## [2.3.3] - 2020-10-29

### Fixed

- Fixed an issue with entities being decoded into symbols (#348)
- Fixed an issue where `{{ }}` curly braces for expressions were being output as `{{ }` because of a loose regex when using `mergeLonghand` (#347)

## [2.3.2] - 2020-10-29

### Fixed

- Fix issue where parser would break `<%= =>` tags (#346)
- Fix issue with mergeLongHand always enabled

## [2.3.1] - 2020-10-23

### Fixed

- fix: beforeCreate event in serve method c368555
- fix: events in serve method 3d01f3a

### Changed

- refactor: cli message when compiling a template 05f234c
- chore: update package keywords 17555d6
- chore: update package description 28c417e
- refactor(tests): use default import for path module 943d0c0

## [2.3.0] - 2020-10-01

### Added

- Maizzle now uses `bs-html-injector` to 'hot reload' your changes without reloading the browser page

### Changed

- Much faster local development: maizzle serve now only re-compiles the template that was changed/edited

### Fixed

- Browsersync will now correctly watch the file you have specified in `build.tailwind.config` in your `config.js`
- fix: local dev tailwind compilation 09fffc7

## [2.2.0] - 2020-09-28

### Changed

- updated to the latest PurgeCSS version, so you can now use the new `safelist` and `blocklist` options
- minifier now works out of the box just by enabling it, no need to set `removeLineBreaks: true` (fixes #307)


## [2.1.2] - 2020-09-11

### Fixed

- fix(todisk): report correct number of templates parsed bd2f1e7

## [2.1.1] - 2020-09-11

### Fixed

- fix(generators): read plaintext option correctly from template config 9705f2e

## [2.1.0] - 2020-09-08

### Added

- Maizzle now sets `process.env.NODE_ENV` to your current build `env` value

## [2.0.1] - 2020-09-07

### Changed

- build(tailwind): add purge layers future flag bcebc54

## [2.0.0] - 2020-09-01

### Added

- support for multiple destination directories
- support multiple template sources
- exposed `html` in `beforeRender`

### Changed

- new `build.templates` config
- `toString` now returns object
- build(deps): bump posthtml-expressions from 1.4.6 to 1.4.7 51d65c8
- build(deps): bump tailwindcss from 1.7.5 to 1.7.6 257cb0c
- build(deps): bump tailwindcss from 1.7.3 to 1.7.5 87448ac

### Fixed

- fix(todisk): show correct number of templates built 73e079f
- fix(todisk): return array of all files d281396
- fix: plaintext and todisk generators 5c3c06a

## [1.4.3] - 2020-08-28

### Fixed

- fix(tailwind): remove css-mqpacker postcss plugin 3dba076

### Changed

- ci: add node 14 7079ea7
- docs: update github ci shield url 5137193
- build(deps): bump string-strip-html from 5.0.0 to 5.0.1 8a0ca9e
- build(deps): [security] bump dot-prop from 4.2.0 to 4.2.1 94c742e

## [1.4.2] - 2020-08-24

### Fixed

- fixed #269 by updating posthtml-expressions to v1.4.6, and also updates some of the dependencies

## [1.4.1] - 2020-08-20

### Changed

- build(deps): bump tailwindcss to 1.7.3 1ac6611
- revert(posthtml): evaluate expressions first ccc9bcc

## [1.4.0] - 2020-08-20

### Added

#### Tailwind CSS v1.7.0

- Layouts: templating has been improved and you can now do more stuff with layouts/extending
- Expressions: you can now use expressions inside the `src=""` attribute when extending a layout
- Added support for using custom tag names instead of `<extends>`
- Use custom slot/fill tag names, instead of the `<block>` tag

## [1.3.1] - 2020-08-05

### Changed

- test(tailwind): fix failing tests c75c95e
- build(deps): bump tailwindcss from 1.5.2 to 1.6.2 35acb14
- build(deps-dev): bump ava from 3.11.0 to 3.11.1 48a7c7d

## [1.3.0] - 2020-07-27

### Added

#### Pass config object to serve()

### Changed

- build(deps): bump posthtml-url-parameters from 1.0.3 to 1.0.4 95f894f
- build(deps): bump tailwindcss from 1.4.6 to 1.5.2 478decc
- build(deps-dev): bump ava from 3.10.1 to 3.11.0 9b77d6c
- build(deps): bump browser-sync from 2.26.7 to 2.26.12 6587b85
- build(deps): bump ora from 4.0.4 to 4.0.5 0689100
- build(deps): [security] bump lodash from 4.17.14 to 4.17.19 c67b973
- build(deps-dev): bump np from 6.3.1 to 6.3.2 fa908d1
- build(deps): bump postcss-nested from 4.2.2 to 4.2.3 8f0e7b3
- build(deps): bump juice from 6.0.0 to 7.0.0 a9bc488

## [1.2.1] - 2020-07-08

### Changed

- build(deps-dev): bump np from 6.3.0 to 6.3.1 f2ad173
- build(deps): bump posthtml-modules from 0.6.1 to 0.6.2 39cc7b2
- build(deps): bump posthtml-expressions from 1.4.4 to 1.4.5 89ff144
- build(deps-dev): bump ava from 3.10.0 to 3.10.1 bbfb50f
- build(deps-dev): bump np from 6.2.5 to 6.3.0 22fd4e6
- build(deps-dev): bump xo from 0.32.0 to 0.32.1 d8fe3aa
- build(deps): bump postcss-nested from 4.2.1 to 4.2.2 853889f
- build(deps): bump html-crush from 1.9.36 to 2.0.0 2d66fd7
- build(deps-dev): bump ava from 3.9.0 to 3.10.0 60937c6

## [1.2.0] - 2020-07-02

### Added
- feat: support all browsersync options 00f4196

### Fixed

- skip inexistent asset paths ded92b2
- external engine variables break urlParameters #213 (fixed in posthtml/posthtml-url-parameters#3)
- `<raw>` tag not working inside `<if>` condition (fixed in posthtml/posthtml-expressions#87)
- escape custom delimiters when ignoring expressions (fixed in posthtml/posthtml-expressions#91)
- correctly output nested components (fixed in posthtml/posthtml-modules#44)

## [1.1.1] - 2020-05-29

### Fixed

- fix(posthtml): don't pass expressions plugin to modules 95cd4ba (fixes #194)

## [1.1.0] - 2020-05-28

### Added

- Added support for multiple asset paths
- Support disabling the `safeClassNames` transformer

### Changed

- Use PostHTML for `extraAttributes` too (replacing `cheerio`)

## [1.0.9] - 2020-05-23

### Changed

- build: update dependencies 828e397
- build(deps): bump front-matter from 3.1.0 to 3.2.1 21ba57a
- build(deps): bump email-comb from 3.9.14 to 3.9.16 21935ea
- build(deps): bump string-strip-html from 4.4.3 to 4.4.5 c6249a3
- build(deps): bump postcss from 7.0.29 to 7.0.30 7bd7f37
- build(deps): bump posthtml-expressions from 1.4.0 to 1.4.1 737b0ec
- build(deps): bump html-crush from 1.9.31 to 1.9.33 a0ec0cd

## [1.0.8] - 2020-05-11

### Fixed

- fix(posthtml): use expressions plugin last 211d64e
- fix(tailwind): prepend passed css string to css from existing file aad35d1

### Changed

- test: add tests for helpers d0b1281
- test(tostring): add inheritance test 0792e13
- revert(posthtml): remove initial option from modules plugin 9a2abc8
- refactor(tailwind): use a single function for css compilation 9c329cd

## [1.0.7] - 2020-05-08

### Changed

- chore: bump posthtml-safe-class-names 8f40131
- build(deps): bump postcss from 7.0.28 to 7.0.29 1446d9a
- build(deps): bump posthtml-mso from 1.0.0 to 1.0.1 cd5dad2
- build(deps): bump tailwindcss from 1.4.0 to 1.4.4 4ddd93c
- build(deps): bump postcss from 7.0.27 to 7.0.28 90518bb
- build(deps-dev): bump np from 6.2.2 to 6.2.3 e92835a

## [1.0.6] - 2020-05-03

### Fixed

- fix(tailwind): pick up config changes when watching files 0885127

## [1.0.5] - 2020-05-01

### Fixed

- fix(generators): use initial option with modules plugin 7dab46d

## [1.0.4] - 2020-05-01

### Fixed

- fix(transformers): add extra attribute only if it doesn't exist 0610c62

## [1.0.3] - 2020-04-30

### Added

- feat(tailwind): allow omitting config file path 1548434

## [1.0.2] - 2020-04-30

### Added

- feat(tailwind): use target and purge options when compiling from string c642836
- feat(tailwind): use purge options from tailwind config e756cdd
- feat(tailwind): use ie11 as default target 0de0e73

### Changed

- chore: bump tailwindcss version to 1.4 d9fe4b6

## [1.0.1] - 2020-04-30

### Fixed

- fix(todisk): remove plaintext tags only when generating plaintext 6031701

## [1.0.0] - 2020-04-28

### Changed

- [BREAKING] Use PostHTML instead of Nunjucks
- [BREAKING] New `config.js` structure
- [BREAKING] Requires Node 10 or later

### Added

- PostHTML templating (see [layouts](https://v1.maizzle.com/docs/layouts/), [templates](https://v1.maizzle.com/docs/templates/), [tags](https://v1.maizzle.com/docs/tags/))
- New `<plaintext>` tag ([docs](https://v1.maizzle.com/docs/plaintext/))
- New `<outlook>` tags ([docs](https://v1.maizzle.com/docs/tags/#outlook))
- New `<fetch>` tag ([docs](https://v1.maizzle.com/docs/tags/#fetch))
- New transformer: `removeAttributes` ([docs](https://v1.maizzle.com/docs/code-cleanup/#removeattributes))
- Customizable safe class names ([docs](https://v1.maizzle.com/docs/code-cleanup/#safeclassnames))
- Default Browsersync paths 38664a5
- Default PurgeCSS sources db3c3c9
- Default extra attributes b36201c
- Merge inline CSS longhand to shorthand e4d3672
- Use `removeStyleTags` in CSS inliner options 48fda1c
- CLI: interactive prompt for scaffolding commands ([docs](https://v1.maizzle.com/docs/commands/#scaffolding))
- CLI: short commands for project scaffolding ([docs](https://v1.maizzle.com/docs/commands/#new))

### Fixed

- `maizzle serve` now works properly with multiple template paths 844a195
- Node.js: you can just pass in a string when using `render()`, no option is required
- Build error handling now lets you know which file failed to compile ([customizable](https://v1.maizzle.com/docs/build-config/#build-errors))
- Better minification (now using `html-crush`) 094d03b
- Better Markdown (now using `markdown-it`) 7d12277

### Removed

- Removed `afterConfig` event
- CLI: removed the need for `bootstrap.js` in project root maizzle/cli@30087b8

## [0.9.1] - 2020-03-18

### Fixed

- [security] bump acorn from 7.1.0 to 7.1.1 2fbb4bf

### Changed

- update ESLint fc9a806
- bump query-string from 6.11.0 to 6.11.1 2af6427
- bump email-comb from 3.9.3 to 3.9.4 1fdeb11
- bump string-strip-html from 4.3.16 to 4.3.17 5356a1b
- bump nunjucks from 3.2.0 to 3.2.1 0324913

## [0.9.0] - 2020-03-05

### Added

- Added new markdown parser
- Transform Contents transformer
- Support dots in utility class names

### Changed

- Use `<style postcss>` instead of `<style tailwind>` for Tailwind CSS

## [0.8.0] - 2020-02-29

### Added

- add `beforeCreate` event 9ef368f
- support async functions in `afterBuild` event 4f4829c

### Changed

- rename config variables. 9650e2d
- bump @fullhuman/postcss-purgecss from 2.0.5 to 2.1.0 d0e52cd
- bump postcss from 7.0.26 to 7.0.27 2903e2c
- bump np from 5.2.1 to 6.2.0 9d21f44
- bump email-comb from 3.9.0 to 3.9.3 060be57
- bump eslint-plugin-import from 2.20.0 to 2.20.1 cc13487
- bump query-string from 6.10.1 to 6.11.0 ff30eba
- bump string-strip-html from 4.3.15 to 4.3.16 f87c461

## [0.7.4] - 2020-02-12

### Fixed

- don't rewrite class names when developing locally 1cbe8fd
- fix Nunjucks inheritance 4d5efce

### Changed

- include `ui` browser sync option ab0b7c8

## [0.7.3] - 2020-02-07

### Changed

- bump tailwindcss from 1.1.4 to 1.2.0 ab15ec7

## [0.7.2] - 2020-02-04

### Added

- allow using `local` as environment name in config file 45b5ccd

## [0.7.1] - 2020-02-01

### Added

- add support for `%` in default PurgeCSS extractor dc8e0ab

### Changed

- replace `%` with `pc` in output HTML class names 4b90d7a

### Fixed

- update Tailwind separator replacer regex fcad256

## [0.7.0] - 2020-01-30

### Added

- add afterBuild hook 4e12a6f

### Fixed

- ensure parent object exists for `afterBuild` event 5b9fd9f

### Changed

- update FUNDING.yml 5cf30f0
- update FUNDING.yml 1750962
- update dependencies 49a2faa

## [0.6.4] - 2019-12-23

### Fixed

- pass env config in posthtml-content transformer 78f9b2c

## [0.6.3] - 2019-12-23

### Fixed

- fix purgeCSS when using multiple template sources 8a00ec6
- make use of layout in render() method, too fd9474c

### Changed

- simplify special character replacement regexes d204ad7
- don't ensure and read layout when compiling CSS eaae1c9

## [0.6.2] - 2019-12-20

### Added

- allow customizing purgeCSS `content` when building strings 4f127bd

## [0.6.1] - 2019-12-19

### Fixed

- make sure Nunjucks config exists before using it. 23ab1a1

## [0.6.0] - 2019-12-19

### Added

- support compiling templates from multiple sources. f627869
- allow configuring Nunjucks tags. 6beb37a
- allow configuring Nunjucks base path. c7f89c8
- add support for lifecycle hooks in config. bf91c8d
- allow customizing purgeCSS' defaultExtractor. d8f8380

### Changed

- update escaped character CSS class replacements. dfa1add

## [0.5.3] - 2019-12-17

### Changed

- prefer const for layout variable 5241e61
- also generate Tailwind components by default f3453a0
- update regex for escaped character class replace 61fd671

## [0.5.2] - 2019-12-12

### Fixed

- fix layout handling in `render()` method bed6dd5
- rework template inheritance 8bdb8dd

## [0.5.1] - 2019-12-12

### Changed

- roll back template inheritance 335a886

## [0.5.0] - 2019-12-12

### Added

- Added Lifecycle hooks
- Add support for `:` or `/` in CSS class names
- Added support for preventing widow words through the `prevent-widows` attribute

### Fixed

- Template inheritance

### Changed

- throw error if Tailwind config is not an object cf46651
- compile Tailwind only if needed 0f663d6
- copy assets to output dir as a final step 0ed5198
- start using ESLint 9b5d03a

## [0.4.4] - 2019-12-02

### Changed

- updated dependencies

## [0.4.3] - 2019-09-17

### Fixed

- bump email-comb from 3.7.1 to 3.8.0 ba0d2b7
- remove console.log f88c50e

## [0.4.2] - 2019-09-11

### Fixed

- update email-comb to 3.7.1 c55023c

## [0.4.1] - 2019-09-10

### Added

- add `replaceStrings` transformer 1779ddb

### Changed

- pass through minifier only if explicitly enabled 37f8f06

## [0.4.0] - 2019-09-10

### Fixed

- use Nunjucks extends in `render()` 05a5389

### Changed

- make `opts.tailwind.css` optional in `render()` 15898cf
- bump posthtml from 0.11.4 to 0.11.6 ee9fccf
- bump color-shorthand-hex-to-six-digit from 2.10.37 to 2.10.40 5eb3035
- bump query-string from 6.8.2 to 6.8.3 780ebd5
- bump email-comb from 3.5.1 to 3.6.1 f5fd1c5
- bump string-strip-html from 4.0.29 to 4.1.1 bbf1b33

## [0.3.3] - 2019-08-28

### Changed

- [security] bump set-value from 2.0.0 to 2.0.1 5da7c27
- [security] bump mixin-deep from 1.3.1 to 1.3.2 af7f0c4
- bump query-string from 6.8.1 to 6.8.2 d8eba9e
- bump color-shorthand-hex-to-six-digit from 2.10.35 to 2.10.37 9e63ac0
- bump email-comb from 3.4.8 to 3.5.1 1e5bf71
- bump tailwindcss from 1.0.6 to 1.1.2 13c8832
- bump string-strip-html from 4.0.27 to 4.0.29 227514a

## [0.3.2] - 2019-08-16

### Changed

- better media query sorting 99d1aa5

## [0.3.1] - 2019-08-13

### Fixed

- specify env when getting config in serve method acbeb91

## [0.3.0] - 2019-08-01

### Added

- allow using array for `build.templates.filetypes` ab361d2
- support falsy values for `baseImageURL`. 3412db5

### Changed

- dependency & security updates

### Fixed

- throw error if building `env` with missing config. 5ca5230
- don't add `baseImageURL` to empty attributes. a5e7e4a

### Removed

- remove fix for Tailwind CSS escaped characters. 9d0a870

## [0.2.4] - 2019-07-01

### Changed

- bump np from 4.0.2 to 5.0.3 4e0840c
- bump fs-extra from 8.0.1 to 8.1.0 58f932d
- bump color-shorthand-hex-to-six-digit from 2.10.26 to 2.10.27 822b4bf
- bump marked from 0.6.2 to 0.6.3 f477c37
- bump query-string from 6.4.0 to 6.8.1 5bde4c4

## [0.2.3] - 2019-06-24

### Changed

- updated dependencies

## [0.2.2] - 2019-06-12

### Fixed

- update baseImageURL replacement regex efd7463

### Changed

- parse template file path only when needed 8c79708

## [0.2.1] - 2019-06-12

### Fixed

- check if assets source path exists before copying. b5c163e

## [0.2.0] - 2019-06-10

### Changed

- parse Browsersync open option c9c9fe3
- updated dependencies 0befafb

## [0.1.5] - 2019-06-04

### Changed

- update email-comb f4c0d56
- update dependencies.d969560

## [0.1.4] - 2019-05-22

### Changed

- Update TailwindCSS to stable release. 0f78e7e

## [0.1.3] - 2019-04-03

### Fixed

- Fixes a race condition while developing locally

## [0.1.2] - 2019-04-01

## Added

- Exposes environment name to templates. Use `env` in a template to get the current build environment name

## [0.1.1] - 2019-03-28

First release! 🎉
