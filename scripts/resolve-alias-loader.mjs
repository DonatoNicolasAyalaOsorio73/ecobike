// Node's test runner has no bundler, so it doesn't know the "@/" -> "src/"
// path alias every app file uses (tsconfig.json `paths`, resolved by
// Metro/tsc elsewhere). This tiny resolver hook is the whole fix — see
// package.json's "test" script.
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(pathToFileURL(target.pathname.replace(/^\/([A-Za-z]:)/, "$1")).href, context);
  }
  return nextResolve(specifier, context);
}
