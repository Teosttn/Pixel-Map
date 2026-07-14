import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const daily = readFileSync(".github/workflows/daily-news.yml", "utf8");
const pages = readFileSync(".github/workflows/nextjs.yml", "utf8");

assert.match(daily, /cron: "30 0 \* \* \*"/);
assert.match(daily, /cron: "10 1 \* \* \*"/);
assert.match(daily, /\n  generate:\n/);
assert.match(daily, /\n  deploy:\n/);
assert.match(daily, /group: daily-news/);
assert.match(daily, /group: pages/);
assert.match(daily, /timeout-minutes: 20/);
assert.match(daily, /OPENAI_API_KEY: \$\{\{ secrets\.OPENAI_API_KEY \}\}/);
assert.match(daily, /test -n "\$OPENAI_API_KEY"/);
assert.doesNotMatch(daily, /--allow-source-fallback/);
assert.match(daily, /npm run test:news/);
assert.match(daily, /npm run test:content/);
assert.match(daily, /npm run typecheck/);
assert.match(daily, /npm run build/);
assert.match(daily, /actions\/upload-pages-artifact@v4/);
assert.match(daily, /needs: generate/);
assert.match(daily, /needs\.generate\.outputs\.changed == 'true'/);
assert.match(daily, /actions\/deploy-pages@v5/);

assert.doesNotMatch(pages, /^concurrency:/m);
assert.match(pages, /\n  deploy:\n[\s\S]*?group: pages/);
assert.match(pages, /actions\/upload-pages-artifact@v4/);
assert.doesNotMatch(pages, /test -f out\/admin\/index\.html/);
assert.match(pages, /test ! -f out\/admin\/index\.html/);
