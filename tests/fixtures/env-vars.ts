export const deno = Deno.env.get("TEST_PUBLIC_FOO");
export const deno2 = Deno.env.get("TEST_PUBLIC_FOO");
// deno-lint-ignore no-process-global
export const node = process.env.TEST_PUBLIC_FOO;
