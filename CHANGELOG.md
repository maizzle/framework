# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.2.1] - 2025-06-25

This is just a maintenance release to update dependencies.

- build(deps): bump posthtml-base-url from 3.1.7 to 3.1.8  9144f5d
- fix: specify correct posthtml-base-url minimum version  f2f8434
- build(deps): bump posthtml-url-parameters from 3.1.2 to 3.1.3  03a33ea
- build(deps): bump posthtml-markdownit from 3.1.1 to 3.1.2  142002c
- build(deps): bump posthtml-fetch from 4.0.2 to 4.0.3  ebbdfd7
- build(deps): bump posthtml-extra-attributes from 3.1.3 to 3.1.4  fc578ec
- build(deps): bump posthtml-postcss-merge-longhand from 3.1.3 to 3.1.4  3b10c6f

## [5.2.0] - 2025-06-24

This release adds support for configuring multiple static asset folders, allowing you to specify multiple directories from which static assets will be copied to the build output.

### Added

- feature: support an array of objects with source and destination  13d4379

### Fixed

- fix: ignoring production folders as static files sources for server  a3e4044

## [5.1.0] - 2025-06-13

This release adds support for using Tailwind CSS color opacity modifiers in Gmail by automatically converting modern rgb/a syntax to the legacy, comma-separated syntax.

- feat: use commas instead of slash for css color opacity modifiers f26774b

## [5.0.9] - 2025-06-12

This release fixes an issue where builds failed because `preferUnitlessValues` (which is on by default) was throwing an error when encountering invalid inline CSS.

- fix: skip parsing invalid css in `preferUnitlessValues` e891c14

## [5.0.8] - 2025-04-15

This release fixes an issue that prevented the use of `posthtml.plugins.before` and `posthtml.plugins.after` simultaneously.

### Fixed

- fix: `posthtml.plugins.before` 4374706
- build(deps): bump vite from 6.2.5 to 6.2.6 cafa1f6

## [5.0.7] - 2025-04-03

### Fixed

- fixed an issue with `alt` attribute values being overwritten  f083636

### Changed

- chore: add license and changelog to dist  4685745
- chore: update types  a5c08ce

## [5.0.6] - 2025-03-12

### Fixed

- fix: skip vml tags when replacing sources inside mso comments  e1a867f

https://github.com/maizzle/framework/compare/v5.0.5...v5.0.6

## [5.0.5] - 2025-03-10

### Fixed

- fix: broad regex when checking for selectors to preserve  97073e4

https://github.com/maizzle/framework/compare/v5.0.4...v5.0.5

## [5.0.4] - 2025-03-10

### Fixed

- fix: handling of pseudo-classes when inlining css  c0b7457

https://github.com/maizzle/framework/compare/v5.0.3...v5.0.4

## [5.0.3] - 2025-03-10

### Fixed

- fix: handling of base64 encoded css values in `preferUnitlessValues`  2e0b456

https://github.com/maizzle/framework/compare/v5.0.2...v5.0.3

## [5.0.2] - 2025-03-04

### Fixed

- fix: handle baseUrl inside mso comments for non-vml tags  935d4fb
- build(deps): bump posthtml-base-url from 3.1.6 to 3.1.7  35306ff
- fix: export correct generatePlaintext type definition  0dc868a
- fix: plaintext files output path  9fba8f7
- fix: output files at root of output.path  bdc66b6
- fix: ensure node exists  85c4685

https://github.com/maizzle/framework/compare/v5.0.1...v5.0.2

## [5.0.1] - 2025-02-24

### Fixed

- fixed an issue with HMR in workspaces and pnpm projects
- fixed an issue preventing `<fetch>` from working

### Changed

- updated dependencies (see compare link below)

https://github.com/maizzle/framework/compare/v5.0.0...v5.0.1

## [5.0.0] - 2024-12-16

## Maizzle 5

Maizzle 5 comes with awesome new features like:

- New dev server with HMR*
- 10x faster local dev
- Streamlined configs
- Streamlined Tailwind CSS
- `npx create-maizzle`
- Revamped CLI
- Content source globs
- Updated template
- Better modern CSS support (vars, calc)
- Improved type definitions
- New tags (`<env:?>`, `<template>`)
- Enhanced events/hooks

Maizzle 5 requires Node.js 18.20+

\* Hot Markup Replacement&trade;

Upgrade guide: https://maizzle.com/docs/upgrade-guide

## [5.0.0-beta.38] - 2024-11-30

### Fixed

- fix: `attributes.remove` type  d10dc05
- fix: include user-defined `components.fileExtension` in list of component file extensions to scan for  005e2ee

### Changed

- refactor: access `baseURL` config only once  d42f405

## [5.0.0-beta.37] - 2024-11-29

### Fixed

- fix: use correct output file extensions  5c9421b

## [5.0.0-beta.36] - 2024-11-29

### Added

- build(deps): use posthtml-component@next  f725e50

This release uses `posthtml-component@next` which now supports `fileExtension` as an `Array` of file extensions to use when scanning for components.

The goal is to allow using templates with multiple file extensions, as right now only one extension can be used.

So for example you could have a project for Woocommerce emails with this structure:

```sh
emails
  ├── html
  │   └── order-received.html
  └── woocommerce
      └── order-received.php
```

### Fixed

- fix: server start time logging  ad4e8e0

## [5.0.0-beta.35] - 2024-11-28

### Fixed

- fix: css type declarations  e234e76
- chore: add `build.current` to server routes  a9160e2

### Changed

- build: update dependencies  596f4b2

## [5.0.0-beta.34] - 2024-11-26

### Added

- feat: add `css.resolveCalc` option  cde20d4

### Changed

- chore: remove duplicate declaration removal  619ef35

## [5.0.0-beta.33] - 2024-11-26

### Added

- feat: add `css.resolveProps` option  097e8d4

### Fixed

- fix: add back build.current in `maizzle serve`  9b53fcb

### Changed

- refactor: remove `beforeCreate` event in `maizzle serve`  653ec48

## [5.0.0-beta.32] - 2024-11-20

### Added

- feat: scan additional components folders  38e0ed4

## [5.0.0-beta.31] - 2024-11-19

### Added

- feat: add types for safelist options  6e1610f

## [5.0.0-beta.30] - 2024-11-19

### Added

- feat: `preservedSelectors` option for inliner  3598cf7

### Changed

- refactor: rename comb option to `safelist`  89d7051
- refactor: rename `preservedSelectors` to `safelist` 58f2e9c
- build(deps): update vitest  2917c80

## [5.0.0-beta.29] - 2024-11-17

### Fixed

- fix: list of templates to compile  9688ff9
- fix: copy source files to destination  0b4caab

## [5.0.0-beta.28] - 2024-11-16

### Changed

- build(deps): update dependencies  d24e49a
- refactor: use `posthtml-widows` instead of `string-remove-widows ` bccbd7b

## [5.0.0-beta.27] - 2024-11-04

### Fixed

- fix: default posthtml options  6a5249b

### Changed

- refactor: widow words default attribute name  01623cc

## [5.0.0-beta.26] - 2024-09-28

### Fixed

- fix: preserve email client target selectors when inlining  24a1a9b
- fix: using style[data-embed]  c735364
- test: generates plaintext file  e9fb327

### Changed

- build(deps): update dependencies  1d6a684
- refactor: transformers tests  a21172a
- refactor: transformer order  4a24a9b

## [5.0.0-beta.25] - 2024-09-10

### Added

- feat: toggle nested folders in dev index page  368f04b

### Fixed

- fix: config object in beforeCreate event  81288f8
- fix: encode index URI for special characters  d7053a8
- fix: error when filename has a space  5ca34b5

### Changed

- chore: update markdown type definition  9dd5708
- feat: return early in markdown transformer  daea021

https://github.com/maizzle/framework/compare/v5.0.0-beta.24...v5.0.0-beta.25

## [5.0.0-beta.24] - 2024-08-28

### Fixed

- synchronized scrolling  619fb51
- checking `<template>` tag for `preserve` attribute  f957568
- return tree from `prettify` transformer  1d15fc5
- use correct config object in events  e3a4b36

### Changed

- move expressions config object to root  43a1d76
- **[breaking]** bump required node version to `18.20`  b305d56
- updated dependencies  e42050d

https://github.com/maizzle/framework/compare/v5.0.0-beta.23...v5.0.0-beta.24

## [5.0.0-beta.23] - 2024-08-19

### Fixed

- plaintext generation  571c1cf

### Changed

- update inline type  dec0dd5
- bump `juice` to `10.0.1`  973a820
- updated index page  b8e6b83

https://github.com/maizzle/framework/compare/v5.0.0-beta.22...v5.0.0-beta.23

## [5.0.0-beta.22] - 2024-08-19

### Changed

- downgrade `cheerio` to `rc.12`  d9e2924

## [5.0.0-beta.21] - 2024-08-12

### Fixed

- update `cheerio` import path  dca3fb6

## [5.0.0-beta.20] - 2024-08-01

### Fixed

- create correct build output paths  398705c

### Changed

- add type for `build.output.from`  49b1955

https://github.com/maizzle/framework/compare/v5.0.0-beta.19...v5.0.0-beta.20

## [5.0.0-beta.19] - 2024-08-01

### Added

- add types for `build.current`  18c75f7
- 404 page for local dev  ce9416f

### Fixed

- locals passed to fetch plugin  cca8060
- serve static files added to watched paths after server was started  ab7eb6d
- wait for file contents to be written before reading them  8c9324c
- posthtml expression config  1f95625

### Changed

- start dev server spinner sooner  566dc54
- watch maizzle `.ts` config files  cdbf3dd
- watch more config file extensions  45575fb

https://github.com/maizzle/framework/compare/v5.0.0-beta.18...v5.0.0-beta.19

## [5.0.0-beta.18] - 2024-07-30

### Added

- allow capturing groups replacement in `replaceStrings` transformer  6a381b7

### Changed

- revert exposing posthtml compiler in events  50eb0ff
- revert automatically setting `baseURL`  dd6c321
- update github workflow  657cba3

https://github.com/maizzle/framework/compare/v5.0.0-beta.17...v5.0.0-beta.18


## [5.0.0-beta.17] - 2024-07-26

### Fixed

- `env` tags and attributes in components  bf33ee8

### Changed

- update events types  0847b46
- export `fetch` tag config types  b7e3a64
- define `fetch` key at root of config  0acd06b

https://github.com/maizzle/framework/compare/v5.0.0-beta.16...v5.0.0-beta.17

## [5.0.0-beta.16] - 2024-07-25

### Changed

- type definitions  6e59b4f
- updated dependencies  a96bf00

https://github.com/maizzle/framework/compare/v5.0.0-beta.15...v5.0.0-beta.16

## [5.0.0-beta.15] - 2024-07-25

### Added

- add `<fetch>` tag  7ec603b

### Fixed

- serve templates added after the watcher started  cc58423
- make keys optional in type definitions  faf910b

https://github.com/maizzle/framework/compare/v5.0.0-beta.14...v5.0.0-beta.15

## [5.0.0-beta.14] - 2024-07-24

### Fixed

- don't import transformers in build command  cf8acef

## [5.0.0-beta.13] - 2024-07-24

### Fixed

- pass posthtml options to parse function  d048b08

### Changed

- update `urlParameters` type definition  8ff5e1c
- update config types  504e158
- update build config type definitions  2e662da
- update events type definitions  e4ed0ed
- revert exposing transformers in events  9f0797c
- update transformers tests  41e864b
- ensure `addAttribute` adds default img attribute with no value  b36d92d

https://github.com/maizzle/framework/compare/v5.0.0-beta.12...v5.0.0-beta.13

## [5.0.0-beta.12] - 2024-07-23

### Added

- expose front matter object in events  9603739

### Changed

- events type definitions  9858437
- use posthtml default config when parsing front matter  dca806c

https://github.com/maizzle/framework/compare/v5.0.0-beta.11...v5.0.0-beta.12

## [5.0.0-beta.11] - 2024-07-23

### Added

- allow customizing the spinner when developing locally  7d06117

### Fixed

- use components options from user config  3cd3096

### Changed

- remove unused imports  430908d

https://github.com/maizzle/framework/compare/v5.0.0-beta.10...v5.0.0-beta.11

## [5.0.0-beta.10] - 2024-07-22

### Fixed

- copying static assets  43c28b6

Fixed an issue with static assets being copied twice if they were nested in the `static.source` directory.

For example this:

```sh
src/images
  /v1/hero.jpg
  logo.jpg
```

... was copied over to this:

```sh
build_production/images
  /v1/hero.jpg
  hero.jpg # this shouldn't be here!
  logo.jpg
```

https://github.com/maizzle/framework/compare/v5.0.0-beta.9...v5.0.0-beta.10


## [5.0.0-beta.9] - 2024-07-22

### Changed

- update posthtml-base-url  7362db8
- update dependencies  11d30b7
- update morphdom to 2.7.4  9a5b7cd

https://github.com/maizzle/framework/compare/v5.0.0-beta.8...v5.0.0-beta.9

## [5.0.0-beta.8] - 2024-07-20

### Added

- `<template>` tag  9ae94ee
- built templates count  ff28808

### Fixed

- inlining css values containing colons  66a5e34
- loose check for `env` tags  cf1d875
- srcset `baseUrl` path joins  eb49bd6

### Changed

- update `env` tag test  3e34c20

https://github.com/maizzle/framework/compare/v5.0.0-beta.7...v5.0.0-beta.8

## [5.0.0-beta.7] - 2024-07-19

### Added

- add support for `<env:...>` tags  aedc861

https://github.com/maizzle/framework/compare/v5.0.0-beta.6...v5.0.0-beta.7

## [5.0.0-beta.6] - 2024-07-19

### Added

- support more attribute names for preventing inlining  ee0523e

https://github.com/maizzle/framework/compare/v5.0.0-beta.5...v5.0.0-beta.6

## [5.0.0-beta.5] - 2024-07-18

### Added

- environment-based attribute values  d129e6a

https://github.com/maizzle/framework/compare/v5.0.0-beta.4...v5.0.0-beta.5

## [5.0.0-beta.4] - 2024-07-18

### Added

- expose transformers to `afterBuild` event  b1154e1
- expose posthtml and transformers to `render` events  ae1227a

### Fixed

- export types for `build.expressions`  8175e1b
- actually export transformers  66d5872
- `build.content` type definition  98ab301
- missing calc precision param  d128cd7

### Changed

- update events tests  9227365
- build command  9f84e35
- set `resolveCalc` precision to `2`  df006eb

https://github.com/maizzle/framework/compare/v5.0.0-beta.3...v5.0.0-beta.4

## [5.0.0-beta.3] - 2024-07-16

### Added

- add release script  56c78d8

### Changed

- `safeClassNames` option name  8dceb20
- update dependencies  d223968

https://github.com/maizzle/framework/compare/v5.0.0-beta.2...v5.0.0-beta.3

## [5.0.0-beta.2] - 2024-07-15

### Fixed

- morphdom path  e2bb669

### Changed

- force reload if no websocket support  a79a50c

https://github.com/maizzle/framework/compare/v5.0.0-beta.1...v5.0.0-beta.2

## [5.0.0-beta.1] - 2024-07-15

### Fixed

- git conflicts  fd73020

### Changed

- bump posthtml-attrs-parser from 1.1.0 to 1.1.1  2140655
- bump posthtml-markdownit from 1.3.1 to 3.1.0  6575567
- bump posthtml-content from 1.0.3 to 2.1.0  fad8740
- bump posthtml-mso from 2.0.1 to 3.1.0  ca2df93
- bump posthtml-postcss-merge-longhand from 3.1.1 to 3.1.2  925f21a
- bump postcss from 8.4.38 to 8.4.39  547659a

https://github.com/maizzle/framework/compare/v4.8.8...v5.0.0-beta.1

## [5.0.0-beta.0] - 2024-07-15
