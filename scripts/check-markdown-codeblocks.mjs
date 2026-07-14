import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const motionRuntime = readFileSync(join(process.cwd(), "src", "components", "motion", "MotionRuntime.tsx"), "utf8");
assert.doesNotMatch(
  motionRuntime,
  /querySelectorAll\(\s*["'`][^"'`]*\.prose/,
  "Markdown article bodies must not be hidden by the reveal observer"
);
assert.match(motionRuntime, /\.article-list > \*/);
assert.match(motionRuntime, /\.timeline-item/);

const articleHtml = readFileSync(
  join(process.cwd(), "out", "blog", "electron-vue-intro", "index.txt"),
  "utf8"
);

assert.match(articleHtml, /<figure class="md-code-block" data-language="js" data-filename="renderer\.js">/);
assert.match(articleHtml, /<figcaption class="md-code-block__meta">/);
assert.match(articleHtml, /<span class="md-code-block__filename">renderer\.js<\/span>/);
assert.match(articleHtml, /<span class="md-code-block__language">js<\/span>/);
assert.match(articleHtml, /<pre><code class="language-js">[\s\S]*ipcRenderer\.send\(&quot;getDataList&quot;\);/);

const imageArticleHtml = readFileSync(
  join(process.cwd(), "out", "blog", "hexo-blog-image-insertion", "index.txt"),
  "utf8"
);

assert.match(imageArticleHtml, /<figure class="md-code-block" data-language="markdown">/);
assert.match(imageArticleHtml, /<pre><code class="language-markdown">!\[\]\(这里面写图片的网络链接\)/);
