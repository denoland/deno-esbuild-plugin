import buffer from "./data.json" with { type: "bytes" };
// deno-lint-ignore no-console
console.log(new TextDecoder().decode(buffer));
