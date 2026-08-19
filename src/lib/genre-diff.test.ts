/**
 * CLI: npx tsx src/lib/genre-diff.test.ts
 */
import { runFullGenreEval } from "./genre-eval-runner";

async function main() {
  const result = await runFullGenreEval();
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) {
    console.error("GENRE_DIFF_FAIL");
    process.exit(1);
  }
  console.log("GENRE_DIFF_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
