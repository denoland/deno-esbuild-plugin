import { expect } from "@std/expect";
import { build, type BuildOptions } from "esbuild";
import { denoPlugin } from "@deno/esbuild-plugin";
import * as path from "@std/path";

async function testEsbuild(options: {
  jsx?: BuildOptions["jsx"];
  jsxDev?: BuildOptions["jsxDev"];
  jsxImportSource?: BuildOptions["jsxImportSource"];
  entryPoints: BuildOptions["entryPoints"];
  plugins?: BuildOptions["plugins"];
  external?: BuildOptions["external"];
  platform?: BuildOptions["platform"];
}) {
  const res = await build({
    entryPoints: options.entryPoints,
    write: false,
    format: "esm",
    bundle: true,
    jsx: options.jsx ?? "automatic",
    jsxDev: options.jsxDev ?? undefined,
    jsxImportSource: options.jsxImportSource ?? "preact",
    plugins: [denoPlugin(), ...(options.plugins ?? [])],
    external: options.external,
    platform: options.platform,
  });

  expect(res.errors).toEqual([]);
  expect(res.warnings).toEqual([]);
  expect(res.outputFiles.length).toEqual(1);

  return res;
}

function getFixture(name: string) {
  return path.join(import.meta.dirname!, "fixtures", name);
}

Deno.test({
  name: "entrypoints - string array",
  fn: async () => {
    await testEsbuild({
      entryPoints: [getFixture("simple.ts")],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "entrypoints - object array",
  fn: async () => {
    await testEsbuild({
      entryPoints: [
        {
          in: getFixture("simple.ts"),
          out: "foo",
        },
      ],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "entrypoints - record",
  fn: async () => {
    await testEsbuild({
      entryPoints: {
        foo: getFixture("simple.ts"),
      },
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolves/loads - mapped",
  fn: async () => {
    await testEsbuild({
      entryPoints: [getFixture("preact.ts")],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolves/loads - https:",
  fn: async () => {
    await testEsbuild({
      entryPoints: [getFixture("https.ts")],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolves/loads - npm:",
  fn: async () => {
    await testEsbuild({
      entryPoints: [getFixture("npm.ts")],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolves/loads - jsr:",
  fn: async () => {
    await testEsbuild({
      entryPoints: [getFixture("jsr.ts")],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolves/loads - node:",
  fn: async () => {
    await testEsbuild({
      entryPoints: [getFixture("node.ts")],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolves/loads - file:",
  fn: async () => {
    await testEsbuild({
      entryPoints: [path.toFileUrl(getFixture("simple.ts")).href],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolves/loads - tsx",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [path.toFileUrl(getFixture("jsx.tsx")).href],
    });

    expect(res.outputFiles[0].text).toContain('"div"');
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "plugins can participate in resolution",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [getFixture("mapped.ts")],
      plugins: [
        {
          name: "test",
          setup(ctx) {
            ctx.onResolve({ filter: /mapped$/ }, () => {
              return {
                path: getFixture("simple.ts"),
                namespace: "test-internal",
              };
            });

            ctx.onLoad({ filter: /.*/, namespace: "test-internal" }, () => {
              return {
                contents: "hey",
              };
            });
          },
        },
      ],
    });

    expect(res.outputFiles[0].text).toContain("hey");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "jsx import source",
  fn: async () => {
    const res = await testEsbuild({
      jsx: "automatic",
      jsxDev: true,
      jsxImportSource: "preact",
      entryPoints: [getFixture("jsx.tsx")],
    });

    expect(res.outputFiles[0].text).toContain("it works");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "with json",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [getFixture("with-json.ts")],
    });

    expect(res.outputFiles[0].text).toContain("it works");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "with text",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [getFixture("with-text.ts")],
    });

    expect(res.outputFiles[0].text).toContain("it works");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "with bytes",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [getFixture("with-bytes.ts")],
    });

    expect(res.outputFiles[0].text).toContain("it works");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "keep external specifiers",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [getFixture("external.ts")],
      external: ["mapped"],
    });

    expect(res.outputFiles[0].text).toContain(`import "mapped"`);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "ignore modules it cannot resolve",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [":::"],
      plugins: [
        {
          name: ":::",
          setup(build) {
            build.onResolve({ filter: /:::/ }, () => {
              return {
                path: getFixture("simple.ts"),
              };
            });
          },
        },
      ],
    });

    expect(res.outputFiles[0].text).toContain("hey");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "respects 'platform: browser'",
  fn: async () => {
    const res = await testEsbuild({
      entryPoints: [getFixture("platform.ts")],
      platform: "browser",
    });

    expect(res.outputFiles[0].text).not.toContain("worker_threads");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "bundle json require in npm module",
  fn: async () => {
    // This threw previously.
    await testEsbuild({
      entryPoints: [getFixture("mime-db.ts")],
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
