import { expect } from "@std/expect";
import { externalToRegex } from "../src/plugin.ts";

Deno.test("externalToRegex", () => {
  expect(externalToRegex("foo")).toEqual(/^foo$/);
  expect(externalToRegex("/foo*")).toEqual(/^\/foo.*$/);
  expect(externalToRegex("*.png")).toEqual(/^.*\.png$/);
});
