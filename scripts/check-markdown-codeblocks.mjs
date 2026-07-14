import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadMarkdownRenderer() {
  const source = readFileSync(join(process.cwd(), "src", "lib", "content.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const module = { exports: {} };
  const moduleRequire = (specifier) =>
    specifier === "@/lib/site" ? { withBasePath: (href) => href } : require(specifier);

  new Function("exports", "require", "module", "__filename", "__dirname", compiled)(
    module.exports,
    moduleRequire,
    module,
    join(process.cwd(), "src", "lib", "content.ts"),
    join(process.cwd(), "src", "lib")
  );

  return module.exports.markdownToHtml;
}

const markdownToHtml = loadMarkdownRenderer();
const highlightedHtml = markdownToHtml("```js fixture.js\nconst answer = 42;\nconsole.log(answer);\n```");
assert.match(highlightedHtml, /class="hljs-keyword"/);
assert.match(highlightedHtml, /class="md-code-block__gutter"/);
assert.match(highlightedHtml, />1\n2</);

const unknownHtml = markdownToHtml("```not-a-language\n<script>alert('unsafe')</script>\n```");
assert.doesNotMatch(unknownHtml, /<script>/);
assert.match(unknownHtml, /&lt;script&gt;alert\(&#39;unsafe&#39;\)&lt;\/script&gt;/);

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
assert.match(articleHtml, /<pre><code class="language-js">[\s\S]*<span class="hljs-keyword">function<\/span>/);
assert.match(
  articleHtml,
  /ipcRenderer\.<span class="hljs-title function_">send<\/span>\(<span class="hljs-string">&quot;getDataList&quot;<\/span>\);/
);

const imageArticleHtml = readFileSync(
  join(process.cwd(), "out", "blog", "hexo-blog-image-insertion", "index.txt"),
  "utf8"
);

assert.match(imageArticleHtml, /<figure class="md-code-block" data-language="markdown">/);
assert.match(
  imageArticleHtml,
  /<pre><code class="language-markdown">!\[\]\(<span class="hljs-link">这里面写图片的网络链接<\/span>\)/
);
