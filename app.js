// ツガイラボ 恋愛診断 — 画面の切り替え、診断、結果
const PER_PAGE = 6;
const STORE_KEY = "kokoro-love-v1";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const smooth = () => (reduceMotion ? "auto" : "smooth");
const BASE_URL = () => location.href.split("#")[0];

function parseAnswers(str) {
  const a = (str || "").split("-").map((v) => (v === "x" ? null : Number(v)));
  const ok = a.length === QUESTIONS.length && a.every((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 100));
  return ok && a.some((v) => v !== null) ? a : null;
}
const encodeAnswers = (answers) => answers.map((v) => (v === null ? "x" : v)).join("-");
// A寄り〜B寄りの6段階。数字は「Aにあてはまる度合い」（0〜100）
const SCALE6 = [
  { v: 100, label: "とてもA" }, { v: 80, label: "A" }, { v: 60, label: "どちらかと言えばA" },
  { v: 40, label: "どちらかと言えばB" }, { v: 20, label: "B" }, { v: 0, label: "とてもB" },
];
// 0〜100 の答えを「とてもA」などの言葉にする（中間の値は近い段階にまとめる）
// 「ある・ない」で答える質問（levels あり）は、「何度もある」「一度もない」などの言葉にする
const scaleLabel = (a, q) => {
  const k = SCALE6.reduce((p, o, j) => (Math.abs(o.v - a) < Math.abs(SCALE6[p].v - a) ? j : p), 0);
  return q && q.levels ? q.levels[k] : SCALE6[k].label;
};
const HEART_PATH = "M12 21 C5 16 1 12 1 7.5 C1 4.4 3.4 2 6.4 2 C8.6 2 10.6 3.3 12 5.3 C13.4 3.3 15.4 2 17.6 2 C20.6 2 23 4.4 23 7.5 C23 12 19 16 12 21 Z";
// X・LINE・Threadsのシェアボタン。どれもアプリが入っているスマホではアプリが開き、投稿画面に文章とリンクが入る
// （入っていなければブラウザ版が開く）。スマホの共有メニューが使えるときは「ほかのアプリで送る」も出す
function shareRow(text, url, verb = "シェア") {
  const e = encodeURIComponent;
  return `<div class="sns-row">
    <a class="sns sns-x" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${e(text)}&url=${e(url)}">Xで${verb}</a>
    <a class="sns sns-line" target="_blank" rel="noopener" href="https://line.me/R/share?text=${e(text + "\n" + url)}">LINEで${verb === "シェア" ? "送る" : verb}</a>
    <a class="sns sns-threads" target="_blank" rel="noopener" href="https://www.threads.com/intent/post?text=${e(text + " " + url)}">Threadsで${verb}</a>
    <button type="button" class="sns sns-more" data-text="${esc(text)}" data-url="${esc(url)}" hidden>ほかのアプリで送る</button>
  </div>`;
}
function bindShareMore(root) {
  if (!navigator.share) return;
  root.querySelectorAll(".sns-more").forEach((b) => {
    b.hidden = false;
    b.addEventListener("click", () => navigator.share({ text: b.dataset.text, url: b.dataset.url }).catch(() => {}));
  });
}

let state = loadState();
let page = firstOpenPage();
let justFinished = false;

/* ---------- メールアドレス ---------- */
// 送信先：setup/google-sheets.gs をウェブアプリとして公開したURL（README.md 参照）。空のあいだはどこにも送らない
const LEAD_ENDPOINT = "";
const LEAD_KEY = "kokoro-lead";
const GATE_KEY = "kokoro-gate";
const PROFILE_KEY = "kokoro-profile";

function loadLead() { try { return JSON.parse(localStorage.getItem(LEAD_KEY)); } catch (e) { return null; } }
function saveLead(lead) { try { localStorage.setItem(LEAD_KEY, JSON.stringify(lead)); } catch (e) {} }
function loadProfile() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch (e) { return null; } }
function saveProfile(p) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {} }
function setGate(hash) { try { localStorage.setItem(GATE_KEY, hash); } catch (e) {} }
function clearGate() { try { localStorage.removeItem(GATE_KEY); } catch (e) {} }
function gatePending() { try { return localStorage.getItem(GATE_KEY) === location.hash; } catch (e) { return false; } }

async function submitLead(data) {
  if (!LEAD_ENDPOINT) return;
  try {
    await fetch(LEAD_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(data) });
  } catch (e) {}
}
// スプレッドシートの1行ぶん。[見出し, 値] の順に並べる
function leadPayload(lead, hash) {
  const p = loadProfile() || {};
  const [, , target, str] = hash.split("/");
  const answers = parseAnswers(str) || [];
  const labelOf = (opts, key) => (opts.find((o) => o.key === key) || {}).label || "";
  const fields = [
    ["メールアドレス", lead.email],
    ["お知らせメール", lead.optIn ? "受け取る" : "受け取らない"],
    ["年齢", labelOf(AGE_OPTIONS, p.age)],
    ["いまの状況", labelOf(STATUS_OPTIONS, p.status)],
  ];
  if (TARGETS[target] && answers.length) {
    const r = evaluate(target, answers);
    fields.push(
      ["恋愛対象", TARGETS[target].label],
      ["診断", r.rows.length === QUESTIONS.length ? `${QUESTIONS.length}問` : `かんたん${r.rows.length}問`],
      ["恋愛タイプ", TYPES[r.code].name],
      ["タイプコード", r.code],
      ["レア度", `★${r.rank.stars} ${r.rank.name}`],
    );
  }
  fields.push(["結果ページ", BASE_URL() + hash]);
  QUESTIONS.forEach((q, i) => fields.push([`Q${i + 1} ${q.lead}（A=${q.a}／B=${q.b}）`, answers[i] == null ? "" : scaleLabel(answers[i], q)]));
  return { kind: "result", fields };
}

function renderGate(done) {
  const lead = loadLead() || {};
  const prof = loadProfile() || {};
  const choice = (name, opts, cur) => opts.map((o) => `<label class="choice"><input type="radio" name="${name}" value="${o.key}" ${cur === o.key ? "checked" : ""}><span>${o.label}</span></label>`).join("");
  $("loading").hidden = true; $("resultBody").hidden = false;
  $("resultBody").innerHTML = `
    <section class="gate">
      <div class="gate-art">${mascotSVG(null, { mystery: true })}</div>
      <h1>結果ができました</h1>
      <p class="gate-lead">3つ答えると、結果が見られます。あなたに合った内容をお届けするために使います。</p>
      <form id="gateForm" novalidate>
        <fieldset class="choices"><legend>年齢</legend><div class="choice-row">${choice("age", AGE_OPTIONS, prof.age)}</div></fieldset>
        <fieldset class="choices"><legend>いまの状況</legend><div class="choice-row">${choice("status", STATUS_OPTIONS, prof.status)}</div></fieldset>
        <label class="field"><span>メールアドレス</span>
          <input type="email" id="gateEmail" required autocomplete="email" inputmode="email" placeholder="example@mail.com" value="${esc(lead.email || "")}"></label>
        <p class="gate-error" id="gateError" role="alert"></p>
        <label class="check"><input type="checkbox" id="gateOptIn" ${lead.optIn ? "checked" : ""}><span>新しい診断やおすすめ情報（広告を含む）のメールも受け取る</span></label>
        <button class="btn btn-primary btn-big" type="submit">結果を見る</button>
        <p class="gate-note"><a href="#/privacy">プライバシーポリシー</a>に同意のうえ送信してください。お知らせメールはいつでも配信停止できます。</p>
      </form>
    </section>`;
  $("gateForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const age = ($("gateForm").querySelector('input[name="age"]:checked') || {}).value;
    const status = ($("gateForm").querySelector('input[name="status"]:checked') || {}).value;
    const email = $("gateEmail").value.trim();
    const err = !age ? "年齢を選んでください" : !status ? "いまの状況を選んでください"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "メールアドレスの形をご確認ください（例：example@mail.com）" : "";
    if (err) { $("gateError").textContent = err; return; }
    saveProfile({ age, status });
    const next = { email, optIn: $("gateOptIn").checked };
    saveLead(next);
    clearGate();
    submitLead(leadPayload(next, location.hash));
    done();
  });
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    const okTarget = TARGETS[s && s.target] && (s.mode === "quick" || s.mode === "full");
    if (okTarget && Array.isArray(s.answers) && s.answers.length === QUESTIONS.length) return s;
  } catch (e) {}
  return { target: null, answers: Array(QUESTIONS.length).fill(null) };
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}
// 再読みこみしたときに開くページ。かんたん診断では12問の中での位置で数える
function firstOpenPage() {
  const idx = state.mode === "quick" ? QUICK : QUESTIONS.map((_, i) => i);
  const k = idx.findIndex((i) => state.answers[i] === null);
  return Math.floor((k === -1 ? idx.length - 1 : k) / PER_PAGE);
}

/* ---------- ホームの飾り ---------- */
function renderDecor() {
  $("logoMark").innerHTML = mascotSVG("SFKW");
  // トップの水引のまわりに、キャラクターを6匹
  $("heroChars").innerHTML = ["HCKN", "HFON", "SFKW", "HFKW", "SCKN", "HCON"]
    .map((c, i) => `<a class="hero-char hc-${i}" href="${typeUrl(c)}" aria-label="${TYPES[c].name}（${TYPES[c].animal}タイプ）">${mascotSVG(c)}</a>`).join("");
  $("stepArt1").innerHTML = mascotSVG(null, { mystery: true });
  $("stepArt2").innerHTML = mascotSVG("SCKW");
  $("stepArt3").innerHTML = ["HFKN", "HCKW", "SFKW"].map((c) => mascotSVG(c)).join("");

}

/* ---------- 診断 ---------- */
const activeIdx = () => (state.mode === "quick" ? QUICK : QUESTIONS.map((_, i) => i));
const chosenMode = () => (document.querySelector('input[name="mode"]:checked') || {}).value || "quick";

function startTest(target) {
  const mode = chosenMode();
  if (state.target !== target || state.mode !== mode) {
    state = { target, mode, answers: Array(QUESTIONS.length).fill(null) };
    page = 0;
    saveState();
  }
  $("test").hidden = false;
  renderPage();
  $("test").scrollIntoView({ behavior: smooth() });
  const first = document.querySelector(".q:not(.done) input");
  if (first) setTimeout(() => first.focus({ preventScroll: true }), reduceMotion ? 0 : 600);
}

function renderPage() {
  $("modeChip").textContent = `${TARGETS[state.target].avg}とくらべる`;
  $("modeChip").dataset.target = state.target;
  const idx = activeIdx();
  const start = page * PER_PAGE;
  $("questions").innerHTML = idx.slice(start, start + PER_PAGE).map((n, k) => {
    const q = QUESTIONS[n];
    const v = state.answers[n];
    return `<li class="q ${v !== null ? "done" : ""}" data-n="${n}">
      <fieldset>
        <legend class="q-lead"><span class="q-no">Q${start + k + 1}</span>${q.lead}</legend>
        <p class="q-ab"><span class="ab-a">A.</span>${q.a}</p>
        <p class="q-ab"><span class="ab-b">B.</span>${q.b}</p>
        <div class="heart-scale">
          ${SCALE6.map((o, j) => `<label class="hs hs-${j}">
            <input type="radio" name="q${n}" value="${o.v}" ${v === o.v ? "checked" : ""}>
            <svg viewBox="0 0 24 23" aria-hidden="true"><path d="${HEART_PATH}"/></svg>
            <span class="visually-hidden">${o.label}</span>
          </label>`).join("")}
        </div>
        <div class="hs-ends" aria-hidden="true"><span>A</span><span>B</span></div>
        ${q.levels ? `<p class="hs-hint">「ある」は回数が多いほど、「ない」は一度もないほど外側のハートを選んでください。</p>` : ""}
      </fieldset>
    </li>`;
  }).join("");
  updateProgress();
}

function setAnswer(li, v) {
  state.answers[Number(li.dataset.n)] = v;
  saveState();
  li.classList.add("done");
  updateProgress();
}

function goNextQuestion(li) {
  const next = li.nextElementSibling;
  if (next && !next.classList.contains("done")) {
    next.scrollIntoView({ behavior: smooth(), block: "center" });
  }
}

$("questions").addEventListener("change", (e) => {
  if (e.target.type !== "radio") return;
  const li = e.target.closest(".q");
  const wasDone = li.classList.contains("done");
  setAnswer(li, Number(e.target.value));
  if (!wasDone) goNextQuestion(li);
});

function updateProgress() {
  const idx = activeIdx();
  const done = idx.filter((n) => state.answers[n] !== null).length;
  $("progressFill").style.width = (done / idx.length) * 100 + "%";
  $("progressText").textContent = `${done} / ${idx.length}`;
  const start = page * PER_PAGE;
  const slice = idx.slice(start, start + PER_PAGE);
  const left = slice.filter((n) => state.answers[n] === null).length;
  const last = (page + 1) * PER_PAGE >= idx.length;
  $("nextBtn").disabled = left > 0;
  $("nextBtn").textContent = last ? "結果を見る" : "つぎへ";
  $("prevBtn").hidden = page === 0;
  $("testHint").textContent = left ? `このページはあと${left}問です` : "";
}

$("nextBtn").addEventListener("click", () => {
  if ((page + 1) * PER_PAGE >= activeIdx().length) {
    justFinished = true;
    const hash = `#/result/${state.target}/${encodeAnswers(state.answers)}`;
    const lead = loadLead();
    // 一度入力した人には毎回聞かず、結果だけ送る
    if (lead && loadProfile()) submitLead(leadPayload(lead, hash));
    else setGate(hash);
    location.hash = hash;
    return;
  }
  page++;
  renderPage();
  $("test").scrollIntoView({ behavior: smooth() });
});
$("prevBtn").addEventListener("click", () => {
  page = Math.max(0, page - 1);
  renderPage();
  $("test").scrollIntoView({ behavior: smooth() });
});
document.querySelectorAll("[data-target]").forEach((b) => b.addEventListener("click", () => startTest(b.dataset.target)));

/* ---------- 採点 ---------- */
function evaluate(target, answers) {
  const rows = QUESTIONS.map((q, i) => ({ q, i, a: answers[i], stat: q[target] }))
    .filter((r) => r.a !== null)
    // no: 画面に出した質問番号（かんたん12問なら1〜12） / same: 同じ側を選んだ人の割合 / minor: 少数派の答え
    .map((r, k) => {
      const same = r.a >= 50 ? r.stat : 100 - r.stat;
      return { ...r, no: k + 1, side: r.a >= 50 ? "a" : "b", same, minor: same < 50, label: scaleLabel(r.a, r.q) };
    });
  const axes = axisScores(answers);
  const code = codeOf(axes);
  const rank = rarityOf(target, rows);
  const cats = Object.entries(CATEGORIES)
    .map(([key, c]) => ({ key, name: c.name, list: rows.filter((r) => r.q.cat === key) }))
    .filter((c) => c.list.length)
    .map((c) => ({ key: c.key, name: c.name, rank: rarityOf(target, c.list), rated: c.list.length >= 2 }));
  return { rows, axes, code, rank, cats, mode: rows.length === QUESTIONS.length ? "full" : "quick" };
}

function renderResult(target, answers, shared = false) {
  const tg = TARGETS[target];
  const r = evaluate(target, answers);
  // シェアされた結果を見ている人は年齢がわからないので "unknown"
  const segment = shared ? "unknown" : segmentOf(loadProfile());
  const t = TYPES[r.code];
  const who = shared ? "この人" : "あなた";
  const majority = r.rows.filter((x) => !x.minor).sort((a, b) => b.same - a.same).slice(0, 3);
  const minority = r.rows.filter((x) => x.minor).sort((a, b) => a.same - b.same).slice(0, 3);
  const chosen = (x) => x.side === "a" ? x.q.a : x.q.b;
  // 答えも％で出す：選んだ側（A・B）にどれくらい寄っているか（ハートの濃さ）と、同じ側を選んだ人の割合
  // 「ある・ない」の質問は％ではなく「何度もある」などの言葉で出す
  const lean = (x) => (x.q.levels ? `答え「${x.label}」` : `${x.side.toUpperCase()}寄り度 ${x.side === "a" ? x.a : 100 - x.a}%`);
  // シェアされた結果では、どちらの性別とくらべたかがわからないように、アンケートの％と「女性・男性」は出さない
  const pickItem = (x) => `<li><b>Q${x.no}</b>${x.q.lead}「${chosen(x)}」<span>${who}の${lean(x)}${shared ? "" : ` ／ ${x.q.levels ? `「${chosen(x)}」と答えた` : `${x.side.toUpperCase()}を選んだ`}${tg.label} ${fmt(x.same)}%`}</span></li>`;
  const pct = (v) => (shared ? "" : `<b>${fmt(v)}%</b>`);
  // ★は2問以上答えたジャンルだけ（1問だけだと、その1問で★が決まってしまうため）
  const rated = r.cats.filter((c) => c.rated);
  const unrated = r.cats.filter((c) => !c.rated);
  const catsSorted = [...rated].sort((a, b) => b.rank.common - a.rank.common);

  // シェアしたリンクを開くと、結果ページ（シェア用の表示）が出る
  const shareUrl = `${BASE_URL().replace(/index\.html$/, "")}s/${r.code.toLowerCase()}.html#${target}/${encodeAnswers(answers)}`;
  const shareText = `わたしの恋愛観のレア度は${starsOf(r.rank.stars)}（${r.rank.name}）、恋愛タイプは「${t.name}」（${shareNote(r.code, r.mode)}）でした！ #ツガイラボ`;

  const answerItem = (x) => {
    const s = SOURCES[x.q.src];
    return `<li class="answer${x.minor ? " minor" : ""}">
      <div class="answer-head">
        <span class="q-no">Q${x.no}</span>
        <span class="side-key">${x.minor ? "少数派の答え" : "多数派の答え"}</span>
      </div>
      <p class="answer-q">${x.q.lead}</p>
      <ul class="ab-split">
        <li class="${x.side === "a" ? "chosen" : ""}"><span class="ab-a">A.</span><span>${x.q.a}</span>${pct(x.stat)}</li>
        <li class="${x.side === "b" ? "chosen" : ""}"><span class="ab-b">B.</span><span>${x.q.b}</span>${pct(100 - x.stat)}</li>
      </ul>
      ${shared ? "" : `<div class="ab-bar" aria-hidden="true"><span style="width:${x.stat}%"></span><span style="width:${100 - x.stat}%"></span></div>`}
      <p class="answer-you">${who}の答え：<b>${x.label}</b>${x.q.levels ? "" : `（${lean(x)}）`}</p>
      <p class="answer-src">${shared ? "出典：" : `「${x.q.survey}」と答えた${tg.label}は${fmt(x.stat)}%。`}<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>（${s.detail}）</p>
    </li>`;
  };

  $("resultBody").innerHTML = `
    ${shared ? `<section class="shared-banner">
      <p><b>シェアされた診断結果です</b>かんたん12問（約2分）に答えると、あなたの恋愛タイプと恋愛観のレア度もわかります。</p>
      <div class="shared-actions">
        <a class="btn btn-primary" href="#/" data-home>自分も診断する</a>
      </div>
    </section>` : ""}

    <section class="sync-card" style="--sync:${r.rank.stars * 20}">
      <div class="gauge" role="img" aria-label="レア度 5段階中${r.rank.stars}">
        <div class="gauge-inner"><span class="gauge-label">レア度</span><span class="gauge-stars">${starsOf(r.rank.stars)}</span></div>
      </div>
      <div class="sync-copy">
        <p class="result-kicker">${who}の恋愛観のレア度</p>
        <h1>${r.rank.name}</h1>
        <p>${r.rank.note.replaceAll("あなた", who)}</p>
        ${catsSorted.length >= 2 ? `<p class="sync-cats">いちばん多数派に近かったのは<b>「${catsSorted[0].name}」</b>、いちばんレアだったのは<b>「${catsSorted[catsSorted.length - 1].name}」</b>でした。</p>` : ""}
      </div>
    </section>

    ${typeHero(r.code, `${who}の恋愛タイプは…`, shared ? null : target, r.mode)}

    ${segment === "konkatsu" ? konkatsuBlock(r.code, answers, r.axes) : ""}

    ${shared ? "" : `<section class="card share-card">
      <h2>結果をシェアする</h2>
      <p>恋愛タイプとレア度を、友達ともくらべてみよう。</p>
      ${shareRow(shareText, shareUrl)}
    </section>`}

    ${adSlot("A", r.code, segment)}

    <div class="result-grid">
      <section class="card wide">
        <h2>ジャンル別のレア度</h2>
        <ul class="cat-bars">
          ${rated.map((c) => `<li><span class="cat-name">${c.name}</span><span class="cat-stars" aria-label="レア度 5段階中${c.rank.stars}">${starsOf(c.rank.stars)}</span><b>${c.rank.name}</b></li>`).join("")}
        </ul>
        ${unrated.length ? `<p class="cat-note">${unrated.map((c) => `「${c.name}」`).join("")}は答えた質問が1問だけなので、★は出していません。${r.rows.length < QUESTIONS.length ? `${QUESTIONS.length}問の診断なら、すべてのジャンルのレア度がわかります。` : ""}</p>` : ""}
      </section>
      <section class="card wide">
        <h2>${who}の${AXES.length}つの傾向</h2>
        <p class="axes-lead">ピンクが左側、青が右側の割合です。</p>
        <ul class="axes">
          ${AXES.map((ax, i) => {
            const L = r.axes[i];          // 左側の傾向の％（右側は 100 − L）
            const leftWins = L >= 50;
            // ピンクが左側の％、青が右側の％。境目（●）は左はしから L% の位置
            return `<li class="axis">
              <div class="axis-head">
                <span class="pole ${leftWins ? "win" : ""}">${ax.leftName}<b>${L}%</b></span>
                <span class="pole right ${leftWins ? "" : "win"}"><b>${100 - L}%</b>${ax.rightName}</span>
              </div>
              <div class="axis-track">
                <div class="axis-fill" style="left:0;width:${L}%"></div>
                <div class="axis-fill right" style="left:${L}%;width:${100 - L}%"></div>
                <span class="axis-you" style="left:${L}%" title="${who}"></span>
              </div>
              <p class="axis-desc">${leftWins ? ax.leftDesc : ax.rightDesc}</p>
            </li>`;
          }).join("")}
        </ul>
      </section>
      ${loveMaps(r.axes, who)}
      ${typeCards(r.code)}
      <section class="card">
        <h2>多数派と同じだった答え</h2>
        ${majority.length ? "" : `<p class="pick-empty">多数派と同じ答えはありませんでした。</p>`}
        <ol class="pick-list">${majority.map(pickItem).join("")}</ol>
      </section>
      <section class="card">
        <h2>少数派だった答え</h2>
        ${minority.length ? "" : `<p class="pick-empty">少数派の答えはありませんでした。</p>`}
        <ol class="pick-list worst">${minority.map(pickItem).join("")}</ol>
      </section>
    </div>

    <section class="answers" aria-labelledby="ansTitle">
      <h2 id="ansTitle" class="section-title">${r.rows.length}問の答え合わせ</h2>
      <details class="all-answers">
      <summary>1問ずつ見る（出典つき）</summary>
      <p class="answers-lead">${shared ? `囲みが${who}の選んだ側です。アンケートの割合は、自分で診断するとくらべて見られます。` : `％は、アンケートでA・Bそれぞれの側だった${tg.label}の割合です。囲みが${who}の選んだ側です。`}</p>
      ${r.cats.map(({ key, name }) => `
        <h3 class="answers-cat">${name}${r.cats.find((x) => x.key === key).rated ? `<span>レア度 ${starsOf(r.cats.find((x) => x.key === key).rank.stars)}</span>` : ""}</h3>
        <ol class="answer-list">${r.rows.filter((x) => x.q.cat === key).map(answerItem).join("")}</ol>`).join("")}
      </details>
    </section>

    ${adSlot("B", r.code, segment)}

    <div class="result-actions">
      ${shared
        ? `<a class="btn btn-primary" href="#/" data-home>自分も診断する</a>`
        : `<button class="btn btn-primary" id="retryBtn">もう一度診断する</button>`}
    </div>`;

  bindShareMore($("resultBody"));
  if ($("retryBtn")) $("retryBtn").addEventListener("click", () => {
    state = { target: null, answers: Array(QUESTIONS.length).fill(null) };
    saveState();
    page = 0;
    $("test").hidden = true;
    location.hash = "#/";
    window.scrollTo(0, 0);
  });
}

function renderTypePage(code) {
  $("resultBody").innerHTML = `
    ${typeHero(code, "16の恋愛タイプから")}
    ${adSlot("A", code, segmentOf(loadProfile()))}
    <div class="result-grid">${typeCards(code)}</div>
    <div class="result-actions">
      <a class="btn btn-primary" href="#/" data-home>自分のタイプを診断する</a>
      <a class="btn btn-ghost" href="#/types">16タイプ図鑑を見る</a>
    </div>`;
}

function renderTypes() {
  $("typesBody").innerHTML = `
    <ul class="axis-legend">
      ${AXES.map((ax) => `<li><b>${ax.leftName}</b><span>または</span><b>${ax.rightName}</b></li>`).join("")}
    </ul>
    <div class="group-grid">
    ${Object.entries(GROUPS).map(([key, g]) => `
      <section class="group" style="--group:${g.hex}">
        <div class="group-head"><h2>${g.name}</h2><p>${g.desc}</p></div>
        <ul class="type-grid">
          ${TYPE_ORDER.filter((c) => groupOf(c) === key).map((c) => `
            <li><a class="type-card" href="${typeUrl(c)}">
              <div class="type-mascot">${mascotSVG(c, { label: TYPES[c].name })}</div>
              <h3 class="type-name">${nameHTML(c)}</h3>
              <p class="type-card-animal">${TYPES[c].animal}タイプ</p>
              <p class="type-card-catch">${TYPES[c].catch}</p>
              <p class="type-card-share">女性 ${typeShares().F[c].toFixed(1)}%・男性 ${typeShares().M[c].toFixed(1)}%</p>
            </a></li>`).join("")}
        </ul>
      </section>`).join("")}
    </div>`;
}

// 番号は30問の番号。かんたん12問にも出る質問には、そちらの番号も添える。質問は診断と同じA・Bの形で出す
function renderData() {
  $("dataBody").innerHTML = `
    <p class="data-note">番号は「じっくり30問」の番号です。かんたん12問で答えた質問には、12問での番号も書いています。グラフはAを選んだ人（アンケートでそう答えた人）の割合です。</p>
    <ol class="data-list">
      ${QUESTIONS.map((q, i) => {
        const s = SOURCES[q.src];
        const k = QUICK.indexOf(i);
        return `<li class="card data-item">
          <p class="q-no">Q${i + 1}${k >= 0 ? `<span class="q-no-quick">かんたん12問ではQ${k + 1}</span>` : ""}</p>
          <h2>${q.lead}</h2>
          <p class="q-ab"><span class="ab-a">A.</span>${q.a}</p>
          <p class="q-ab"><span class="ab-b">B.</span>${q.b}</p>
          <p class="data-survey">調査の項目：「${q.survey}」</p>
          <div class="data-bars">
            <div class="data-bar f"><span>女性</span><div class="bar"><i style="width:${q.F}%"></i></div><b>${fmt(q.F)}%</b></div>
            <div class="data-bar m"><span>男性</span><div class="bar"><i style="width:${q.M}%"></i></div><b>${fmt(q.M)}%</b></div>
          </div>
          <p class="answer-src"><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>（${s.detail}）</p>
        </li>`;
      }).join("")}
    </ol>`;
}

/* ---------- ルーター ---------- */
function show(view, nav) {
  ["home", "result", "types", "data", "privacy"].forEach((v) => ($(`view-${v}`).hidden = v !== view));
  document.querySelectorAll("[data-nav]").forEach((a) => a.toggleAttribute("aria-current", a.dataset.nav === nav));
}

// 診断直後はメール入力（未入力なら）→ ドキドキ演出 → 結果
function openResult(render) {
  show("result", "home");
  window.scrollTo(0, 0);
  const reveal = () => {
    $("loading").hidden = true; $("resultBody").hidden = false;
    render();
    window.scrollTo(0, 0);
  };
  const withLoading = () => {
    if (reduceMotion) return reveal();
    $("loading").hidden = false; $("resultBody").hidden = true;
    $("loadingHeart").innerHTML = mascotSVG(null, { mystery: true });
    setTimeout(reveal, 1400);
  };
  // 診断直後か、メール・年齢・状況をまだ入力していない人には、結果の前にゲートを出す
  if (gatePending() || !loadLead() || !loadProfile()) { justFinished = false; renderGate(withLoading); return; }
  if (justFinished) { justFinished = false; withLoading(); } else reveal();
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "result" && TARGETS[parts[1]]) {
    const answers = parseAnswers(parts[2]);
    if (!answers) { location.hash = "#/"; return; }
    openResult(() => renderResult(parts[1], answers));
  } else if (parts[0] === "s" && TARGETS[parts[1]] && parseAnswers(parts[2])) {
    // シェアされたリンク：メール入力なしで、すぐ結果を表示
    show("result", "home");
    $("loading").hidden = true; $("resultBody").hidden = false;
    renderResult(parts[1], parseAnswers(parts[2]), true);
    window.scrollTo(0, 0);
  } else if (parts[0] === "type" && TYPES[parts[1]]) {
    show("result", "types");
    $("loading").hidden = true; $("resultBody").hidden = false;
    renderTypePage(parts[1]);
    window.scrollTo(0, 0);
  } else if (parts[0] === "types") {
    show("types", "types");
    renderTypes();
    window.scrollTo(0, 0);
  } else if (parts[0] === "privacy") {
    show("privacy", "");
    window.scrollTo(0, 0);
  } else if (parts[0] === "data") {
    show("data", "data");
    renderData();
    window.scrollTo(0, 0);
  } else {
    show("home", "home");
  }
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

renderDecor();
if (state.target) {
  // 途中の診断があるときは「かんたん／じっくり」の選択もそろえる（ずれていると、ボタンを押したときに答えが消えてしまう）
  const modeInput = document.querySelector(`input[name="mode"][value="${state.mode}"]`);
  if (modeInput) modeInput.checked = true;
  $("test").hidden = false;
  renderPage();
}
window.addEventListener("hashchange", route);
route();
