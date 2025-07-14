import {
  MediaType,
  RequestedModuleType,
  ResolutionMode,
  Workspace,
} from "@deno/loader";
import type {
  Loader,
  OnLoadArgs,
  OnLoadResult,
  OnResolveArgs,
  OnResolveResult,
  Plugin,
} from "esbuild";
import * as path from "@std/path";
import { isBuiltin } from "node:module";

export interface DenoPluginOptions {
  /** Show debugging logs */
  debug?: boolean;
  /** Use this path to a `deno.json` instead of auto-discovering it. */
  configPath?: string;
  /** Don't transpile files when loading them */
  noTranspile?: boolean;
  /** Keep JSX as is, instead of transpiling it according to compilerOptions. */
  preserveJsx?: boolean;
}

/**
 * Create an instance of the Deno plugin for esbuild
 */
export function denoPlugin(options: DenoPluginOptions = {}): Plugin {
  return {
    name: "deno",
    async setup(ctx) {
      const workspace = new Workspace({
        debug: options.debug,
        configPath: options.configPath,
        nodeConditions: ctx.initialOptions.conditions,
        noTranspile: options.noTranspile,
        preserveJsx: options.preserveJsx,
      });

      // Normalize entrypoints for deno graph
      const entrypoints: string[] = [];
      const rawEntries = ctx.initialOptions.entryPoints;
      if (rawEntries !== undefined) {
        if (Array.isArray(rawEntries)) {
          for (const entry of rawEntries) {
            if (typeof entry === "string") {
              entrypoints.push(entry);
            } else {
              entrypoints.push(entry.in);
            }
          }
        } else {
          for (const [_name, file] of Object.entries(rawEntries)) {
            entrypoints.push(file);
          }
        }
      }

      const loader = await workspace.createLoader({
        entrypoints,
      });

      const onResolve = async (
        args: OnResolveArgs,
      ): Promise<OnResolveResult | null> => {
        if (isBuiltin(args.path)) {
          return {
            path: args.path,
            external: true,
          };
        }
        const kind =
          args.kind === "require-call" || args.kind === "require-resolve"
            ? ResolutionMode.Require
            : ResolutionMode.Import;

        const res = await loader.resolve(args.path, args.importer, kind);

        let namespace: string | undefined;
        if (res.startsWith("file:")) {
          namespace = "file";
        } else if (res.startsWith("http:")) {
          namespace = "http";
        } else if (res.startsWith("https:")) {
          namespace = "https";
        } else if (res.startsWith("npm:")) {
          namespace = "npm";
        } else if (res.startsWith("jsr:")) {
          namespace = "jsr";
        }

        const resolved = res.startsWith("file:") ? path.fromFileUrl(res) : res;

        return {
          path: resolved,
          namespace,
        };
      };

      // Esbuild doesn't detect namespaces in entrypoints. We need
      // a catchall resolver for that.
      ctx.onResolve({ filter: /.*/ }, onResolve);
      ctx.onResolve({ filter: /.*/, namespace: "file" }, onResolve);
      ctx.onResolve({ filter: /.*/, namespace: "http" }, onResolve);
      ctx.onResolve({ filter: /.*/, namespace: "https" }, onResolve);
      ctx.onResolve({ filter: /.*/, namespace: "data" }, onResolve);
      ctx.onResolve({ filter: /.*/, namespace: "npm" }, onResolve);
      ctx.onResolve({ filter: /.*/, namespace: "jsr" }, onResolve);

      const onLoad = async (
        args: OnLoadArgs,
      ): Promise<OnLoadResult | null> => {
        const url =
          args.path.startsWith("http:") || args.path.startsWith("https:") ||
            args.path.startsWith("npm:") || args.path.startsWith("jsr:")
            ? args.path
            : path.toFileUrl(args.path).toString();

        const moduleType = getModuleType(args.with);
        const res = await loader.load(url, moduleType);

        if (res.kind === "external") {
          return null;
        }

        return {
          contents: res.code,
          loader: mediaToLoader(res.mediaType),
        };
      };
      ctx.onLoad({ filter: /.*/, namespace: "file" }, onLoad);
      ctx.onLoad({ filter: /.*/, namespace: "jsr" }, onLoad);
      ctx.onLoad({ filter: /.*/, namespace: "npm" }, onLoad);
      ctx.onLoad({ filter: /.*/, namespace: "http" }, onLoad);
      ctx.onLoad({ filter: /.*/, namespace: "https" }, onLoad);
      ctx.onLoad({ filter: /.*/, namespace: "data" }, onLoad);
    },
  };
}

function mediaToLoader(type: MediaType): Loader {
  switch (type) {
    case MediaType.Jsx:
      return "jsx";
    case MediaType.JavaScript:
    case MediaType.Mjs:
    case MediaType.Cjs:
      return "js";
    case MediaType.TypeScript:
    case MediaType.Mts:
    case MediaType.Dmts:
    case MediaType.Dcts:
      return "ts";
    case MediaType.Tsx:
      return "tsx";
    case MediaType.Css:
      return "css";
    case MediaType.Json:
      return "json";
    case MediaType.Html:
      return "default";
    case MediaType.Sql:
      return "default";
    case MediaType.Wasm:
      return "binary";
    case MediaType.SourceMap:
      return "json";
    case MediaType.Unknown:
      return "default";
    default:
      return "default";
  }
}

function getModuleType(withArgs: Record<string, string>): RequestedModuleType {
  switch (withArgs.type) {
    case "text":
      return RequestedModuleType.Text;
    case "bytes":
      return RequestedModuleType.Bytes;
    case "json":
      return RequestedModuleType.Json;
    default:
      return RequestedModuleType.Default;
  }
}
