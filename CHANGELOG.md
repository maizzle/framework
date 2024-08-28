# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
