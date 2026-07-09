import { runNewsBot } from "./news-bot.mjs";

const result = await runNewsBot();

console.log(
  `[news-bot] fetched=${result.fetchedCount} selected=${result.selectedCount} written=${result.written.length}`
);
for (const file of result.written) {
  console.log(`[news-bot] wrote ${file}`);
}
