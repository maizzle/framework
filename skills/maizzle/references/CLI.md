# CLI
Run via `npx maizzle …` or install globally with `npm i -g maizzle`.

| Command | Description |
|---|---|
| `maizzle new [starter] [dir]` | Scaffold a project (interactive without args). Flags: `-i/--install`, `--pm <npm\|yarn\|pnpm\|bun>`. |
| `maizzle serve` (alias `dev`) | Start the Vite dev server with HMR. Flags: `-c/--config <path>`, `-p/--port <n>`, `--host [addr]`. |
| `maizzle build` | Production build. Flags: `-c/--config`, `-o/--output <dir>`, `--ext <extension>`, `--dir <path>` (source glob), `--pretty`, `--minify`, `--plaintext`. |
| `maizzle prepare` | Regenerate `.maizzle/` IDE typings. Flag: `-c/--config`. |
| `maizzle make:template [filepath]` | Scaffold a template. |
| `maizzle make:layout [filepath]` | Scaffold a layout. |
| `maizzle make:component [filepath]` | Scaffold a component. |
| `maizzle make:config [name]` | Scaffold a config file. |
