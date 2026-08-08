#!/usr/bin/env node
/**
 * build.js — ヘッダー・フッター一括更新スクリプト
 *
 * 使い方:
 *   node build.js
 *
 * _partials/header.html と _partials/footer.html を編集したあと
 * このスクリプトを実行すると、全ページの <!-- HEADER:START/END --> と
 * <!-- FOOTER:START/END --> マーカー間を自動で置き換えます。
 *
 * header.html 内の {{ROOT}} は、ページの階層に応じて自動変換されます。
 *   ルート直下 → "" (空文字)
 *   tips/ 配下  → "../"
 */

const fs   = require('fs');
const path = require('path');

// ---- 設定 ----
const PARTIALS_DIR = path.join(__dirname, '_partials');
const FILES = [
  { file: 'index.html',               root: ''    },
  { file: 'alliance-rules.html',      root: ''    },
  { file: 'warzone-rules.html',       root: ''    },
  { file: 'events.html',              root: ''    },
  { file: 'members.html',             root: ''    },
  { file: 'members-2.html',           root: ''    },
  { file: 'members-3.html',           root: ''    },
  { file: 'tips/training.html',       root: '../' },
  { file: 'tips/desert-combat.html',  root: '../' },
  { file: 'tips/alliance-duel.html',  root: '../' },
  { file: 'tips/combat.html',         root: '../' },
  { file: 'tips/season3.html',        root: '../' },
  { file: 'tips/season6.html',        root: '../' },
  { file: 'tips/tools.html',          root: '../' },
  { file: 'tips/alignment.html',      root: '../' },
  { file: 'tips/kinmyaku.html',       root: '../' },
  { file: 'tips/glossary.html',       root: '../' },
];

// ---- パーシャル読み込み ----
const headerTemplate = fs.readFileSync(path.join(PARTIALS_DIR, 'header.html'), 'utf8').trimEnd();
const footerTemplate = fs.readFileSync(path.join(PARTIALS_DIR, 'footer.html'), 'utf8').trimEnd();

// ---- ヘルパー ----

// マーカー間を新しいブロックで置き換える（マーカーが存在する場合）
// 見つかれば置換後の文字列を、なければ null を返す
function replaceMarkerBlock(content, tag, block) {
  const startMarker = `<!-- ${tag}:START -->`;
  const endMarker   = `<!-- ${tag}:END -->`;
  const si = content.indexOf(startMarker);
  const ei = content.indexOf(endMarker);
  if (si === -1 || ei === -1) return null;
  return content.slice(0, si) + block + content.slice(ei + endMarker.length);
}

// <tag>...</tag> をマーカー付きブロックで包む（初回移行用）
function wrapWithMarkers(content, tag, block) {
  const openTag  = `<${tag}>`;
  const closeTag = `</${tag}>`;
  const si = content.indexOf(openTag);
  const ei = content.indexOf(closeTag);
  if (si === -1 || ei === -1) {
    console.warn(`  警告: <${tag}> タグが見つかりません`);
    return content;
  }
  return content.slice(0, si) + block + content.slice(ei + closeTag.length);
}

function buildBlock(tag, html) {
  return `<!-- ${tag}:START -->\n${html}\n<!-- ${tag}:END -->`;
}

// ---- メイン処理 ----
let updated = 0;
let skipped = 0;

FILES.forEach(({ file, root }) => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.warn(`スキップ（ファイルなし）: ${file}`);
    skipped++;
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');

  const headerHtml = headerTemplate.replace(/\{\{ROOT\}\}/g, root);
  const footerHtml = footerTemplate;

  const headerBlock = buildBlock('HEADER', headerHtml);
  const footerBlock = buildBlock('FOOTER', footerHtml);

  let result = original;

  // ヘッダー置換（マーカーあり → 置換、なし → 初回ラップ）
  const withHeader = replaceMarkerBlock(result, 'HEADER', headerBlock);
  result = withHeader !== null ? withHeader : wrapWithMarkers(result, 'header', headerBlock);

  // フッター置換（同上）
  const withFooter = replaceMarkerBlock(result, 'FOOTER', footerBlock);
  result = withFooter !== null ? withFooter : wrapWithMarkers(result, 'footer', footerBlock);

  if (result === original) {
    console.log(`  変化なし: ${file}`);
  } else {
    fs.writeFileSync(filePath, result, 'utf8');
    console.log(`  ✓ 更新: ${file}`);
    updated++;
  }
});

console.log(`\n完了: ${updated}件更新, ${skipped}件スキップ`);
