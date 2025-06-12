# Deno esbuild plugin

This package adds support for Deno-style resolution and loading to
[`esbuild`](https://esbuild.github.io/). It's based on
[`@deno-/loader`](https://jsr.io/@deno/loader).

The key difference to
[`@luca/esbuild-deno-loader`](https://jsr.io/@luca/esbuild-deno-loader) is that
leverages a WASM build of the same Rust crates that Deno itself uses for
resolving and loading modules.

It supports the following specifiers:

- `file:`
- `data:`
- `npm:`
- `jsr:`
- `http:` + `https:`

## Usage

1. Install this package
2. Import it and add it to the `esbuild` config.

```ts
import * as esbuild from "esbuild";
import { denoPlugin } from "@deno/esbuild-plugin";

await esbuild.build({
  entryPoints: ["app.js"],
  bundle: true,
  outfile: "out.js",
  plugins: [denoPlugin()],
});
```

## License

MIT, see the [LICENSE file](./LICENSE).
