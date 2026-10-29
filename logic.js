// ツガイラボ — 採点・タイプ表示の共通部分
// ブラウザ（app.js）と、静的ページを作る build.mjs の両方から使う

// 静的ページ（types/ や columns/ の中）から読むときは "../" にする
var LINK_BASE = typeof LINK_BASE === "string" ? LINK_BASE : "";
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
// タイプごとの専用ページ（build.mjs が types/ に作る）
// タイプ名の改行位置（「|」の位置でだけ改行する。1文字だけ次の行に落ちるのを防ぐ）
const NAME_BREAKS = {
  HCKW: "ドラマチック|純愛家", HCKN: "胸キュン|主人公", HCOW: "運命|ダッシュ系", HCON: "全力|ラブハンター",
  HFKW: "スマート|王道派", HFKN: "さわやか|恋の旅人", HFOW: "ひらめき|未来派", HFON: "気まぐれ|恋花火",
  SCKW: "ひだまり|尽くし系", SCKN: "癒やしの|保健室", SCOW: "あったか|巣づくり派", SCON: "こっそり|甘えんぼ",
  SFKW: "誠実な|しっかり者", SFKN: "ていねい|恋愛ノート", SFOW: "しずかな|月の恋人", SFON: "マイペース|恋愛職人",
};
const nameHTML = (code) => esc(NAME_BREAKS[code] || TYPES[code].name).split("|").join("<wbr>");
const typeUrl = (code) => `${LINK_BASE}types/${code.toLowerCase()}.html`;
// 診断アプリの中の画面へのリンク
const siteLink = (hash) => (LINK_BASE ? `${LINK_BASE}index.html${hash}` : hash);

/* ---------- 採点 ---------- */
// 乱数は固定のたねから作るので、同じ入力なら毎回同じ結果になる
function seededRand(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 恋愛観のレア度。各質問で「あなたと同じ側を選んだ人の割合」（A なら調査の％、B なら 100 − ％）を平均する。
// 同じ質問にアンケートの割合どおり答える人を RARITY_RUNS 人ぶん試算し、あなたより少数派寄りの人がどれくらいいるかで★を決める
const RARITY_RUNS = 2000;
function rarityOf(target, items) {
  const share = (i, sideA) => (sideA ? QUESTIONS[i][target] : 100 - QUESTIONS[i][target]);
  const mine = items.reduce((s, x) => s + share(x.i, x.a >= 50), 0) / items.length;
  const rand = seededRand(20261028 + items.length);
  let rarer = 0;
  for (let n = 0; n < RARITY_RUNS; n++) {
    const sim = items.reduce((s, x) => s + share(x.i, rand() * 100 < QUESTIONS[x.i][target]), 0) / items.length;
    rarer += sim < mine ? 1 : sim === mine ? 0.5 : 0;
  }
  // common は「あなたより少数派寄りの人」の割合。大きいほど多数派寄り（ジャンルの並べ替えに使う）
  const common = rarer / RARITY_RUNS;
  return { ...RARITY.find((r) => common >= r.min), common };
}
const starsOf = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const avg = (xs) => Math.round(xs.reduce((s, v) => s + v, 0) / xs.length);

// 傾向は「男女の平均（各質問の F と M の真ん中）」より上か下かで決める。50が平均的な人
function axisScores(answers) {
  return AXES.map((ax) => {
    const devs = QUESTIONS.map((q, i) => (q.axis === ax.key && answers[i] !== null && answers[i] !== undefined ? (q.rev ? -1 : 1) * (answers[i] - (q.F + q.M) / 2) : null)).filter((v) => v !== null);
    if (!devs.length) return 50;
    return Math.max(0, Math.min(100, Math.round(50 + devs.reduce((s, v) => s + v, 0) / devs.length)));
  });
}
const codeOf = (axes) => AXES.map((ax, i) => (axes[i] >= 50 ? ax.left : ax.right)).join("");

// 各タイプが女性・男性の中に何%いるかの推定。mode は "quick"（かんたん12問）か "full"（30問）。
// 答える質問が変わるとタイプの出方も変わるので、それぞれ別に数える。
// 各質問で、実際の調査の割合を中心に答えが散らばる（標準偏差 SHARE_SPREAD）と仮定して、
// 男女それぞれ SHARE_RUNS 人ぶん答えを作り、どのタイプになるかを数える。乱数は固定なので毎回同じ結果になる
const SHARE_RUNS = 10000;
const SHARE_SPREAD = 28;
const typeShareCache = {};
function typeShares(mode = "quick") {
  if (typeShareCache[mode]) return typeShareCache[mode];
  const rand = seededRand(20261021);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const shares = {};
  for (const g of ["F", "M"]) {
    const count = Object.fromEntries(TYPE_ORDER.map((c) => [c, 0]));
    for (let n = 0; n < SHARE_RUNS; n++) {
      const ans = QUESTIONS.map((q, i) => (mode === "quick" && !QUICK.includes(i) ? null : Math.max(0, Math.min(100, Math.round(q[g] + gauss() * SHARE_SPREAD)))));
      count[codeOf(axisScores(ans))]++;
    }
    shares[g] = Object.fromEntries(TYPE_ORDER.map((c) => [c, Math.round((count[c] / SHARE_RUNS) * 1000) / 10]));
  }
  return (typeShareCache[mode] = shares);
}
const MODE_LABEL = { quick: "かんたん12問", full: "じっくり30問" };
// 男女の割合から、ひとことの説明をつける
function shareNote(code, mode = "quick") {
  const { F, M } = typeShares(mode);
  const f = F[code], m = M[code];
  if (f < 3 && m < 3) return "男女どちらにも少ない、めずらしいタイプ";
  if (f >= m * 3) return m < 3 ? "女性に多く、男性では少ないタイプ" : "女性に多いタイプ";
  if (m >= f * 3) return f < 3 ? "男性に多く、女性では少ないタイプ" : "男性に多いタイプ";
  if (f >= m * 1.5) return "やや女性に多いタイプ";
  if (m >= f * 1.5) return "やや男性に多いタイプ";
  return "男女どちらにも同じくらいいるタイプ";
}
// タイプの割合は、グラフにせず短い文章でまとめる（全部推定値）
function shareBlock(code, target, mode = "quick") {
  const { F, M } = typeShares(mode);
  const per100 = (p) => (p < 1 ? "100人に1人いるかどうか" : `100人に約${Math.round(p)}人`);
  // 見出しの「100人に約◯人」と食いちがわないように、四捨五入した人数で分ける
  const level = (p) => { const n = Math.round(p); return n < 3 ? "めずらしいタイプ" : n < 6 ? "少なめのタイプ" : n < 10 ? "よくいるタイプ" : "多数派のタイプ"; };
  const pct = `女性では約${F[code].toFixed(1)}%、男性では約${M[code].toFixed(1)}%。`;
  const p = target ? (target === "F" ? F : M)[code] : null;
  const head = target
    ? `${TARGETS[target].label}の中では、<b>${per100(p)}</b>の${level(p)}`
    : shareNote(code, mode);
  return `<div class="type-share">
    <p class="type-share-target">${head}</p>
    <p class="type-share-sum">${pct}${target ? `${shareNote(code, mode)}です。` : ""}16タイプの平均は約6.3%です。</p>
    <p class="type-share-cap">割合は、アンケート結果をもとにした推定です（${MODE_LABEL[mode]}の場合）。</p>
  </div>`;
}

// 相性：ベストは match、1文字ちがいは似たもの、全部ちがうのはちょっと注意
function compatOf(code) {
  const diffCount = (a, b) => [...a].filter((ch, i) => ch !== b[i]).length;
  const others = TYPE_ORDER.filter((c) => c !== code);
  return {
    best: TYPES[code].match,
    near: others.filter((c) => diffCount(c, code) === 1 && c !== TYPES[code].match),
    far: others.filter((c) => diffCount(c, code) === code.length),
  };
}

/* ---------- 年齢・状況（広告と婚活版の出し分け） ---------- */
const AGE_OPTIONS = [
  { key: "u18", label: "17歳以下", min: 0 },
  { key: "18", label: "18〜24歳", min: 18 },
  { key: "25", label: "25〜29歳", min: 25 },
  { key: "30", label: "30〜34歳", min: 30 },
  { key: "35", label: "35〜39歳", min: 35 },
  { key: "40", label: "40歳以上", min: 40 },
];
const STATUS_OPTIONS = [
  { key: "konkatsu", label: "婚活中" },
  { key: "seeking", label: "恋人募集中" },
  { key: "dating", label: "交際中" },
  { key: "married", label: "既婚" },
  { key: "other", label: "その他" },
];
// 広告と婚活版の出し分けに使う区分。17歳以下には、恋愛・婚活サービスの広告を出さない
function segmentOf(profile) {
  if (!profile || !profile.age || !profile.status) return "unknown";
  const age = AGE_OPTIONS.find((a) => a.key === profile.age);
  if (!age || age.min < 18) return "minor";
  const looking = profile.status === "konkatsu" || profile.status === "seeking";
  if (!looking) return profile.status;
  return age.min >= 25 ? "konkatsu" : "single";
}

/* ---------- 婚活版（25歳以上で婚活中・恋人募集中の人だけ） ---------- */
// 結婚向き度：結婚観の傾向（将来を見すえる側の％）と「いずれは結婚したい」の答えから出す
function marriageScore(answers, axes) {
  const fi = AXES.findIndex((a) => a.key === "future");
  const qi = QUESTIONS.findIndex((q) => q.survey === "「いずれ結婚するつもり」");
  return answers[qi] === null ? axes[fi] : Math.round(axes[fi] * 0.6 + answers[qi] * 0.4);
}
const MARRIAGE_BANDS = [
  { min: 80, name: "結婚に向けて、準備ばんたん", note: "将来を具体的に考えていて、結婚への気持ちもはっきりしています。結婚観を最初に確認できる出会い方が向いています。" },
  { min: 60, name: "結婚に前向き", note: "結婚を前向きに考えています。相手の価値観や暮らし方を、少しずつ確かめていくと安心です。" },
  { min: 40, name: "いい人がいれば", note: "結婚は「相手しだい」。まずは一緒にいて楽しい人と出会うことが、結婚への近道になりそうです。" },
  { min: 0, name: "いまの恋を楽しみたい", note: "いまは結婚より、恋そのものを大切にしたい時期。焦らず、自分のペースで大丈夫です。" },
];
// 結婚相手としての相性：ベストの相性に加えて、距離感と結婚観が同じタイプ（暮らしの感覚が近い）
function marriagePartnersOf(code) {
  const best = TYPES[code].match;
  const same = TYPE_ORDER.filter((c) => c !== code && c !== best && c[1] === code[1] && c[3] === code[3]);
  return [best, ...same].slice(0, 3);
}
function konkatsuBlock(code, answers, axes) {
  const score = marriageScore(answers, axes);
  const band = MARRIAGE_BANDS.find((b) => score >= b.min);
  const partners = marriagePartnersOf(code);
  return `<section class="konkatsu" aria-labelledby="konkatsuTitle">
    <h2 id="konkatsuTitle">婚活版の診断結果</h2>
    <div class="konkatsu-score">
      <div class="konkatsu-num"><span>結婚向き度</span><b>${score}</b><small>/ 100</small></div>
      <div><h3>${band.name}</h3><p>${band.note}</p></div>
    </div>
    <h3 class="konkatsu-sub">結婚相手として相性のいいタイプ</h3>
    <ul class="konkatsu-partners">
      ${partners.map((c, i) => `<li><a href="${typeUrl(c)}" style="--group:${typeColor(c)}">
        <span class="mini-mascot">${mascotSVG(c)}</span>
        <span><b>${TYPES[c].name}</b><small>${i === 0 ? "おたがいを補いあえる、いちばんの相性" : "暮らしの距離感と結婚観が近い"}</small></span>
      </a></li>`).join("")}
    </ul>
  </section>`;
}

/* ---------- 広告枠（中身は ads.js で設定） ---------- */
// segment … segmentOf() の結果。年齢がわからないページ（タイプページ・コラム）は "unknown"
function adSlot(id, code, segment = "unknown") {
  if (!["konkatsu", "single", "unknown"].includes(segment)) return "";
  const slot = ADS.slots[id];
  const title = esc(slot[segment] || slot.unknown).replace("{type}", code ? `${nameHTML(code)}<wbr>` : "あなた");
  const live = ADS.items.filter((it) => it.url && it.name && (it.audience || []).includes(segment));
  // タイプの出会い方の文は、広告枠Aだけに出す（Bは同じ文のくり返しになるため）
  const lead = code && id === "A" ? `<p class="ad-lead">${TYPES[code].meet}</p>` : "";
  if (!live.length) {
    // 紹介するサービスがまだないときは、何も出さない（場所を確かめたいときは ads.js の showPlaceholders を true に）
    if (!ADS.showPlaceholders) return "";
    const who = { konkatsu: "25歳以上で婚活中・恋人募集中の人", single: "18〜24歳で恋人募集中の人", unknown: "年齢がわからない人" }[segment];
    return `<aside class="ad-slot ad-empty" data-ad-slot="${id}" aria-label="広告枠${id}">
      <p class="ad-tag"><span class="pr-chip">PR</span>広告枠${id}（準備中）</p>
      <h2 class="type-name">${title}</h2>${lead}
      <div class="ad-placeholder">ここに紹介サービスが入ります（${who}向け）<br><small>ads.js の items に url・name・audience を入れると表示されます</small></div>
      <p class="ad-age">${ADS.ageNotice}</p>
    </aside>`;
  }
  return `<aside class="ad-slot" data-ad-slot="${id}" aria-label="広告">
    <p class="ad-tag"><span class="pr-chip">PR</span>広告</p>
    <h2 class="type-name">${title}</h2>${lead}
    <ul class="ad-list">
      ${live.map((it) => `<li class="ad-item">
        <div><b>${esc(it.name)}</b><p>${esc(it.catch || "")}</p></div>
        <a class="btn btn-primary" href="${esc(it.url)}" target="_blank" rel="sponsored noopener">${esc(it.button || "公式サイトを見る")}</a>
      </li>`).join("")}
    </ul>
    <p class="ad-age">${ADS.ageNotice}</p>
  </aside>`;
}

/* ---------- 結果 ---------- */
function typeHero(code, kicker, target, mode = "quick") {
  const t = TYPES[code];
  const g = GROUPS[groupOf(code)];
  return `<div class="result-hero" style="--group:${g.hex}">
    <div class="result-stage"><div class="burst" style="--burst:${g.hex}"></div><div class="result-mascot">${mascotSVG(code, { label: t.name })}</div></div>
    <div class="result-copy">
      <p class="result-kicker">${kicker}</p>
      <h1 class="type-name">${nameHTML(code)}</h1>
      <p class="result-code"><a class="group-chip" href="${siteLink("#/types")}">${g.name}</a><span class="animal-chip">${t.animal}タイプ</span></p>
      <p class="speech">${t.catch}</p>
      ${shareBlock(code, target, mode)}
    </div>
  </div>`;
}

function typeCards(code) {
  const t = TYPES[code];
  const c = compatOf(code);
  const mini = (x) => `<a class="mini-type" href="${typeUrl(x)}" style="--group:${typeColor(x)}"><span class="mini-mascot">${mascotSVG(x)}</span>${TYPES[x].name}</a>`;
  return `
    <section class="card wide">
      <h2 class="type-name">${nameHTML(code)}<wbr>ってこんな人</h2>
      <p>${t.desc}</p>
      <dl class="type-facts">
        <div><dt>恋の始まり方</dt><dd>${t.love}</dd></div>
        <div><dt>デートのスタイル</dt><dd>${t.date}</dd></div>
        <div><dt>やりがちなこと</dt><dd>${t.ng}</dd></div>
      </dl>
    </section>
    <section class="card">
      <h2>恋がうまくいくヒント</h2>
      <ul class="hearts">${t.tips.map((s) => `<li>${s}</li>`).join("")}</ul>
    </section>
    <section class="card compat">
      <h2>タイプ別の相性</h2>
      <p class="compat-label">相性ばつぐん</p>
      <div class="mini-row">${mini(c.best)}</div>
      <p class="compat-label">価値観が近い</p>
      <div class="mini-row">${c.near.map(mini).join("")}</div>
      <p class="compat-label">ちがいを楽しめれば◎</p>
      <div class="mini-row">${c.far.map(mini).join("")}</div>
    </section>`;
}


/* ---------- 恋愛観マップ（2つの傾向を組み合わせた2次元のグラフ） ---------- */
// x・y は傾向の左側の％（0〜100）。たいていの人は 30〜70 に入るので、25〜75 をグラフの端から端に広げて見やすくする
const MAPS = [
  { x: "heat", y: "future", title: "ときめき方 × 結婚観",
    corners: ["運命を信じる|結婚派", "堅実に結婚を|考える派", "恋を楽しむ|情熱派", "マイペースに|恋する派"] },
  { x: "close", y: "style", title: "距離感 × 恋の進め方",
    corners: ["寄り添う|王道派", "大人の|王道派", "ふたりの|世界派", "自立した|自由派"] },
];
function loveMap(m, axes, who) {
  const xi = AXES.findIndex((a) => a.key === m.x), yi = AXES.findIndex((a) => a.key === m.y);
  const ax = AXES[xi], ay = AXES[yi];
  const stretch = (v) => Math.max(3, Math.min(97, 50 + (v - 50) * 2));
  // 左上＝xの左側・yの左側。左側の％が高いほど、左・上に置く
  const px = 40 + (100 - stretch(axes[xi])) * 2.2;
  const py = 40 + (100 - stretch(axes[yi])) * 2.2;
  const q = (axes[xi] >= 50 ? 0 : 1) + (axes[yi] >= 50 ? 0 : 2);
  const cx = [40, 150, 40, 150], cy = [40, 40, 150, 150];
  const name = (i) => m.corners[i].replace("|", "");
  // エリア名は外側の端に置く。●がそこにかかるときだけ、同じエリアの反対側へ逃がす
  const labelY = (i) => {
    const outer = i < 2 ? cy[i] + 26 : cy[i] + 82, inner = i < 2 ? cy[i] + 82 : cy[i] + 26;
    const hits = (y) => Math.abs(px - (cx[i] + 55)) < 52 && py + 12 > y - 12 && py - 12 < y + 20;
    return hits(outer) ? inner : outer;
  };
  const desc = `${ax.leftName} ${axes[xi]}%・${ax.rightName} ${100 - axes[xi]}%、${ay.leftName} ${axes[yi]}%・${ay.rightName} ${100 - axes[yi]}%。${name(q)}のエリアです。`;
  return `<figure class="love-map">
    <figcaption><b>${m.title}</b><span>${who}は「${name(q)}」</span></figcaption>
    <svg viewBox="0 0 300 290" role="img" aria-label="${m.title}の位置。${desc}">
      <rect x="${cx[q]}" y="${cy[q]}" width="110" height="110" class="lm-zone"/>
      <rect x="40" y="40" width="220" height="220" class="lm-frame"/>
      <line x1="150" y1="40" x2="150" y2="260" class="lm-mid"/>
      <line x1="40" y1="150" x2="260" y2="150" class="lm-mid"/>
      ${m.corners.map((c, i) => { const [l1, l2] = c.split("|"); return `<text x="${cx[i] + 55}" y="${labelY(i)}" text-anchor="middle" class="lm-corner ${i === q ? "on" : ""}"><tspan x="${cx[i] + 55}">${l1}</tspan><tspan x="${cx[i] + 55}" dy="15">${l2}</tspan></text>`; }).join("")}
      <text x="150" y="30" text-anchor="middle" class="lm-axis">↑ ${ay.leftName}</text>
      <text x="150" y="280" text-anchor="middle" class="lm-axis">↓ ${ay.rightName}</text>
      <text x="20" y="150" text-anchor="middle" class="lm-axis lm-side">${ax.leftName}</text>
      <text x="280" y="150" text-anchor="middle" class="lm-axis lm-side">${ax.rightName}</text>
      <g class="lm-dot" tabindex="0">
        <title>${desc}</title>
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="18" class="lm-hit"/>
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="9" class="lm-you"/>
      </g>
    </svg>
    <p class="lm-desc">${desc}</p>
  </figure>`;
}
function loveMaps(axes, who) {
  return `<section class="card wide love-maps">
    <h2>${who}の恋愛観マップ</h2>
    <p class="axes-lead">4つの傾向を2つずつ組み合わせて、${who}の位置を●で表しています。中心に近いほど、どちらにも偏らないバランス型です。</p>
    <div class="love-map-grid">${MAPS.map((m) => loveMap(m, axes, who)).join("")}</div>
  </section>`;
}
