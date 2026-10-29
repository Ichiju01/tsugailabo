// ツガイラボ — 16タイプのキャラクター（動物モチーフ）をSVGで描く
//
// 丸いメダルの中に、動物を1匹ずつ。
// ・体の上端は頭の下にもぐり込ませて、首と胴体を必ずつなげる
// ・小道具は男女どちらが持っても自然なものだけ。顔（口元）には重ねない
// まばたき（.eyes）・呼吸（.char）・耳（.ear-l / .ear-r）の動きは styles.css で付ける。
const INK = "#2B2433";
const GOLD = "#B08D57";
const CREAM = "#F7F1E8";
const BLUSH = "#E39AA9";
const PLUM = "#8E4A63";
const RED = "#C0505E";

let mascotId = 0;

function tint(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * (1 - amount));
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

/* ---------- 共通パーツ ---------- */
// 胴体。上端（top）を頭の下にもぐり込ませる
const body = (fill, top = 132, w = 64, stroke = "") =>
  `<path d="M${100 - w - 4} 210 C${100 - w} 168 ${100 - w * 0.55} ${top} 100 ${top} C${100 + w * 0.55} ${top} ${100 + w} 168 ${100 + w + 4} 210 Z" fill="${fill}" ${stroke}/>`;
const bib = (fill, top = 160, w = 22) => `<path d="M${100 - w} 210 C${100 - w} 182 ${100 - w * 0.5} ${top} 100 ${top} C${100 + w * 0.5} ${top} ${100 + w} 182 ${100 + w} 210 Z" fill="${fill}"/>`;

const E = {
  dot: (x1, x2, y, s = 1) => `<g class="eyes">${[x1, x2].map((x) => `<ellipse cx="${x}" cy="${y}" rx="${3.8 * s}" ry="${4.8 * s}" fill="${INK}"/><circle cx="${x - 1.2 * s}" cy="${y - 1.8 * s}" r="${1.3 * s}" fill="#fff"/>`).join("")}</g>`,
  sparkle: (x1, x2, y, s = 1) => `<g class="eyes">${[x1, x2].map((x) => `<ellipse cx="${x}" cy="${y}" rx="${5 * s}" ry="${6.2 * s}" fill="${INK}"/><circle cx="${x - 1.6 * s}" cy="${y - 2.4 * s}" r="${1.9 * s}" fill="#fff"/><circle cx="${x + 1.8 * s}" cy="${y + 2 * s}" r="${0.9 * s}" fill="#fff"/>`).join("")}</g>`,
  happy: (x1, x2, y, w = 5) => `<g class="eyes" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round">${[x1, x2].map((x) => `<path d="M${x - w} ${y + 1.5} Q${x} ${y - w} ${x + w} ${y + 1.5}"/>`).join("")}</g>`,
  sleepy: (x1, x2, y, w = 5) => `<g class="eyes">${[x1, x2].map((x) => `<path d="M${x - w} ${y} Q${x} ${y + w * 1.1} ${x + w} ${y} Z" fill="${INK}"/><path d="M${x - w - 1} ${y} H${x + w + 1}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`).join("")}</g>`,
  almond: (x1, x2, y, w = 6.5) => `<g class="eyes">${[[x1, 1], [x2, -1]].map(([x, d]) => `<path d="M${x - w} ${y + d} Q${x - 1} ${y - 8} ${x + w} ${y - d} Q${x + 1} ${y + 6} ${x - w} ${y + d} Z" fill="${INK}"/><circle cx="${x - 1.4}" cy="${y - 1.8}" r="1.6" fill="#fff"/>`).join("")}</g>`,
  big: (x1, x2, y) => `<g class="eyes">${[x1, x2].map((x) => `<circle cx="${x}" cy="${y}" r="6" fill="${INK}"/><circle cx="${x - 2}" cy="${y - 2.2}" r="2.2" fill="#fff"/>`).join("")}</g>`,
};
const blush = (x1, x2, y, r = 7) => `<ellipse cx="${x1}" cy="${y}" rx="${r}" ry="${r * 0.55}" fill="${BLUSH}" opacity=".42"/><ellipse cx="${x2}" cy="${y}" rx="${r}" ry="${r * 0.55}" fill="${BLUSH}" opacity=".42"/>`;
const mouth = (open, x, y) => open
  ? `<path d="M${x - 4.5} ${y} Q${x} ${y + 6.5} ${x + 4.5} ${y} Z" fill="${INK}"/><path d="M${x - 2.4} ${y + 2.6} Q${x} ${y + 4.6} ${x + 2.4} ${y + 2.6}" fill="#D98C9C"/>`
  : `<path d="M${x - 5} ${y} q2.5 3.2 5 0 q2.5 3.2 5 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
const star = (cx, cy, r, fill) => {
  let d = "";
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2, rr = i % 2 ? r * 0.38 : r;
    d += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
};
const heart = (cx, cy, s, fill) => `<path transform="translate(${cx} ${cy}) scale(${s})" d="M0 6 C-4 3 -7 0.5 -7 -2.5 C-7 -5 -5 -6.5 -3 -6.5 C-1.6 -6.5 -0.5 -5.6 0 -4.5 C0.5 -5.6 1.6 -6.5 3 -6.5 C5 -6.5 7 -5 7 -2.5 C7 0.5 4 3 0 6 Z" fill="${fill}"/>`;
const paw = (x, y, fill, rx = 8, ry = 6.5) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;

/* ---------- 16匹 ---------- */
const CHARACTERS = {
  // ドラマチック純愛家：白鳥（正面・ハートの風船）
  HCKW: (o) => `
    ${heart(148, 54, 2.2, RED)}
    <path d="M138 46 C139 42 143 41 145 43" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M148 67 C142 92 152 120 136 166" fill="none" stroke="#B9AEBF" stroke-width="1.3"/>
    ${body("#FBF9F5", 150, 70, `stroke="#E2DACE" stroke-width="1.5"`)}
    <path d="M34 206 C38 178 58 160 86 158 C76 170 70 188 72 206 Z" fill="#F3EFE8" stroke="#E2DACE" stroke-width="1.4"/>
    <path d="M166 206 C162 178 142 160 114 158 C124 170 130 188 128 206 Z" fill="#F3EFE8" stroke="#E2DACE" stroke-width="1.4"/>
    <path d="M48 186 C56 176 66 170 76 168 M52 198 C60 190 68 186 74 184 M152 186 C144 176 134 170 124 168 M148 198 C140 190 132 186 126 184" fill="none" stroke="#E2DACE" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M94 164 C92 142 108 130 106 112 C105 100 92 98 86 88 C80 78 86 60 101 60 C113 60 119 70 117 81 C115 92 126 104 126 120 C126 136 116 148 118 164 Z" fill="#FBF9F5"/>
    <path d="M96 150 C97 136 108 126 106 112 C105 100 92 98 86 88 C80 78 86 60 101 60 C113 60 119 70 117 81 C115 92 126 104 126 120 C126 132 120 142 118 150" fill="none" stroke="#E2DACE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M86 70 C80 72 72 77 65 85 C72 87 80 85 87 80 Z" fill="#E08A4A"/>
    <path d="M87 68 C84 71 84 78 87 81" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <g class="eyes"><ellipse cx="99" cy="72" rx="4" ry="5" fill="${INK}"/><circle cx="97.8" cy="70" r="1.5" fill="#fff"/></g>
    <ellipse cx="104" cy="83" rx="5.5" ry="3.2" fill="${BLUSH}" opacity=".42"/>`,

  // 胸キュン主人公：うさぎ（ヘッドホン・ラブレター）
  HCKN: (o) => `
    ${body("#E9DCCB", 132, 60, `stroke="#C7B39E" stroke-width="1.6"`)}
    <g class="ear-l"><ellipse cx="82" cy="54" rx="12.5" ry="30" transform="rotate(-10 82 54)" fill="#E9DCCB" stroke="#C7B39E" stroke-width="1.6"/><ellipse cx="82" cy="57" rx="5.5" ry="20" transform="rotate(-10 82 57)" fill="#E7B3BE"/></g>
    <g class="ear-r"><ellipse cx="118" cy="54" rx="12.5" ry="30" transform="rotate(10 118 54)" fill="#E9DCCB" stroke="#C7B39E" stroke-width="1.6"/><ellipse cx="118" cy="57" rx="5.5" ry="20" transform="rotate(10 118 57)" fill="#E7B3BE"/></g>
    <ellipse cx="100" cy="106" rx="40" ry="35" fill="#E9DCCB" stroke="#C7B39E" stroke-width="1.6"/>
    <path d="M62 102 C62 74 80 64 100 64 C120 64 138 74 138 102" fill="none" stroke="#5E8FB0" stroke-width="5" stroke-linecap="round"/>
    <rect x="54" y="94" width="14" height="22" rx="7" fill="#5E8FB0"/><rect x="132" y="94" width="14" height="22" rx="7" fill="#5E8FB0"/>
    ${E.sparkle(86, 114, 104)}${blush(76, 124, 117)}
    <path d="M97 113 L103 113 L100 117 Z" fill="#C97C8A"/>
    ${mouth(o, 100, 120)}
    <g transform="translate(0 -12) rotate(-10 128 176)"><rect x="110" y="164" width="36" height="25" rx="3" fill="#fff" stroke="#C7B39E" stroke-width="1.4"/><path d="M110 166 L128 179 L146 166" fill="none" stroke="#C7B39E" stroke-width="1.4"/>${heart(128, 178, 0.75, RED)}</g>
    ${paw(112, 166, "#E9DCCB")}`,

  // 運命ダッシュ系：柴犬（バンダナ・ハートの迷子札）
  HCOW: (o) => `
    ${heart(48, 72, 1.1, RED)}${heart(38, 92, 0.6, RED)}
    ${body("#D59E6A", 132, 62)}${bib(CREAM, 156, 20)}
    <path d="M70 140 Q100 158 130 140 L120 156 Q100 170 80 156 Z" fill="#5E8FB0"/>
    <g fill="#fff" opacity=".8"><circle cx="90" cy="152" r="1.6"/><circle cx="100" cy="157" r="1.6"/><circle cx="110" cy="152" r="1.6"/></g>
    <g class="ear-l"><path d="M62 92 L68 46 L96 72 Z" fill="#D59E6A"/><path d="M69 82 L72 56 L88 72 Z" fill="#B0724A"/></g>
    <g class="ear-r"><path d="M138 92 L132 46 L104 72 Z" fill="#D59E6A"/><path d="M131 82 L128 56 L112 72 Z" fill="#B0724A"/></g>
    <path d="M100 144 C74 144 56 128 56 108 C56 88 74 72 100 72 C126 72 144 88 144 108 C144 128 126 144 100 144 Z" fill="#D59E6A"/>
    <path d="M100 144 C80 144 62 132 60 114 C72 118 86 112 100 110 C114 112 128 118 140 114 C138 132 120 144 100 144 Z" fill="${CREAM}"/>
    <ellipse cx="87" cy="90" rx="4.2" ry="2.6" fill="${CREAM}"/><ellipse cx="113" cy="90" rx="4.2" ry="2.6" fill="${CREAM}"/>
    ${E.dot(87, 113, 102)}${blush(73, 127, 118)}
    <ellipse cx="100" cy="116" rx="5.5" ry="3.8" fill="${INK}"/>
    ${mouth(o, 100, 123)}
    <circle cx="100" cy="167" r="3.2" fill="none" stroke="${GOLD}" stroke-width="1.8"/>
    ${heart(100, 179, 1.45, RED)}
    <path d="M94.5 175 C95.5 173 97.5 172.5 98.5 173.5" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>`,

  // 全力ラブハンター：きつね（肩にかついだキューピッドの矢・しっぽ）
  HCON: (o) => `
    <path d="M148 206 C176 182 182 140 166 116 C160 140 150 160 130 174 Z" fill="#C97A50"/><path d="M168 120 C174 130 174 146 168 154 C164 142 164 130 168 120 Z" fill="${CREAM}"/>
    ${body("#C97A50", 134, 60)}${bib(CREAM, 160, 18)}
    <g class="ear-l"><path d="M70 80 L60 34 L96 62 Z" fill="#C97A50"/><path d="M72 70 L67 46 L88 62 Z" fill="#6E3F2C"/></g>
    <g class="ear-r"><path d="M130 80 L140 34 L104 62 Z" fill="#C97A50"/><path d="M128 70 L133 46 L112 62 Z" fill="#6E3F2C"/></g>
    <path d="M100 146 L88 142 L78 144 L72 136 L60 134 L60 124 L50 116 L56 106 C56 84 76 64 100 64 C124 64 144 84 144 106 L150 116 L140 124 L140 134 L128 136 L122 144 L112 142 Z" fill="#C97A50"/>
    <path d="M100 146 L88 142 L78 144 L72 136 L64 132 C70 120 86 118 100 128 C114 118 130 120 136 132 L128 136 L122 144 L112 142 Z" fill="${CREAM}"/>
    ${E.almond(84, 116, 102)}${blush(72, 128, 116)}
    <ellipse cx="100" cy="126" rx="4.5" ry="3.2" fill="${INK}"/>
    ${mouth(o, 100, 132)}
    <g transform="rotate(-20 100 166)"><path d="M62 166 H130" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/><g transform="translate(134 166) rotate(-90)">${heart(0, 0, 1.15, RED)}</g><path d="M70 166 L63 159 M70 166 L63 173 M77 166 L70 159 M77 166 L70 173" stroke="${PLUM}" stroke-width="2.4" stroke-linecap="round"/></g>
    ${paw(92, 170, "#C97A50", 9, 7.5)}
    ${heart(150, 70, 1.2, RED)}`,

  // スマート王道派：ペンギン（卵形の全身・マフラー・予定表）
  HFKW: (o) => `
    <ellipse cx="82" cy="200" rx="12" ry="6" fill="#D49A5A"/><ellipse cx="118" cy="200" rx="12" ry="6" fill="#D49A5A"/>
    <path d="M58 128 C44 142 40 160 46 176 C56 168 62 154 64 138 Z" fill="#33364D"/>
    <ellipse cx="100" cy="122" rx="44" ry="70" fill="#3D405A"/>
    <ellipse cx="100" cy="146" rx="30" ry="46" fill="#FAF8F4"/>
    <path d="M100 118 C80 118 68 104 68 90 C68 76 80 68 90 72 C95 74 98 78 100 82 C102 78 105 74 110 72 C120 68 132 76 132 90 C132 104 120 118 100 118 Z" fill="#FAF8F4"/>
    ${E.dot(88, 112, 92)}${blush(80, 120, 104, 6)}
    <path d="M94 100 L106 100 L100 109 Z" fill="#D49A5A"/>
    <path d="M66 124 Q100 140 134 124 L134 134 Q100 150 66 134 Z" fill="${RED}"/><path d="M118 134 L122 164 L132 162 L130 132 Z" fill="#A9404D"/>
    <path d="M70 128 H130" stroke="#fff" stroke-width="1.4" opacity=".5" stroke-dasharray="3 4"/>
    <g transform="translate(-8 -6) rotate(8 146 156)"><rect x="128" y="138" width="34" height="38" rx="3" fill="#fff" stroke="#C9BFB3" stroke-width="1.4"/><rect x="128" y="138" width="34" height="8" rx="2" fill="#5E8FB0"/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${132 + c * 7.5}" y="${150 + r * 7.5}" width="5" height="5" fill="#E6E0EA"/>`).join("")).join("")}${heart(147, 160, 0.42, RED)}</g>
    <path d="M142 128 C150 138 152 152 146 162 C140 154 138 142 138 134 Z" fill="#33364D"/>`,

  // さわやか恋の旅人：つばめ（翼を広げた姿・頭にのせたサングラス・スカーフ）
  HFKN: (o) => `
    <g transform="translate(0 -10)">
    <path d="M92 176 L70 210 L78 210 L98 180 Z M108 176 L130 210 L122 210 L102 180 Z" fill="#26405E"/>
    <path d="M74 132 C62 112 48 92 30 78 C34 100 44 120 60 134 C52 134 46 138 42 142 C54 148 66 148 78 144 Z" fill="#26405E"/>
    <path d="M126 132 C138 112 152 92 170 78 C166 100 156 120 140 134 C148 134 154 138 158 142 C146 148 134 148 122 144 Z" fill="#26405E"/>
    <path d="M38 88 C46 104 54 116 64 126 M162 88 C154 104 146 116 136 126 M50 140 C56 136 62 134 68 134" stroke="#4A6688" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="128" rx="38" ry="50" fill="#2F4868"/>
    <path d="M100 178 C80 178 68 164 70 146 C80 142 90 140 100 140 C110 140 120 142 130 146 C132 164 120 178 100 178 Z" fill="${CREAM}"/>
    <path d="M82 118 C86 132 96 138 100 138 C104 138 114 132 118 118 C110 124 90 124 82 118 Z" fill="#B5524A"/>
    <path d="M92 88 C94 83 106 83 108 88 C104 90 96 90 92 88 Z" fill="#B5524A"/>
    <path d="M8 182 Q100 190 192 182" fill="none" stroke="#8C8193" stroke-width="1.6"/>
    <path d="M88 186 q2 -6 4 0 q2 -6 4 0 M104 186 q2 -6 4 0 q2 -6 4 0" fill="none" stroke="#3A3440" stroke-width="2" stroke-linecap="round"/>
    ${E.dot(87, 113, 104)}${blush(78, 122, 114, 5.5)}
    <path d="M95 111 L105 111 L100 118 Z" fill="#D49A5A"/>
    </g>
    <path d="M118 52 C130 54 140 52 152 46" fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-dasharray="3 4" stroke-linecap="round"/>
    <g transform="translate(160 42) rotate(-18)"><path d="M-14 2 L14 -6 L-2 10 Z" fill="#fff" stroke="#C9BFB3" stroke-width="1.2" stroke-linejoin="round"/><path d="M14 -6 L-4 4 L-2 10" fill="none" stroke="#C9BFB3" stroke-width="1.2" stroke-linejoin="round"/></g>`,

  // ひらめき未来派：イルカ（波から顔を出す・電球・泡）
  HFOW: (o) => `
    <path d="M70 120 C56 112 46 98 44 84 C58 90 70 100 78 112 Z" fill="#5F879E"/>
    <path d="M66 206 C60 150 66 96 100 78 C116 70 134 76 140 92 C144 102 142 110 146 112 C154 114 162 116 164 122 C164 128 154 130 142 130 C136 130 132 134 132 142 C132 166 136 186 138 206 Z" fill="#7EA5BB"/>
    <path d="M138 206 C136 186 132 166 132 142 C132 136 136 132 142 131 C152 131 160 130 163 126 C160 134 150 138 140 140 C138 160 118 168 106 206 Z" fill="#DCE9F0"/>
    <path d="M128 124 C140 128 152 128 162 124" fill="none" stroke="#4E7389" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M86 92 C92 84 102 80 112 80" fill="none" stroke="#A9C6D6" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <g class="eyes"><ellipse cx="116" cy="104" rx="5.4" ry="6.6" fill="${INK}"/><circle cx="114.2" cy="101.4" r="2" fill="#fff"/><circle cx="118" cy="106.6" r="1" fill="#fff"/></g>
    <ellipse cx="128" cy="116" rx="6" ry="3.4" fill="${BLUSH}" opacity=".42"/>
    <path d="M96 156 C88 162 82 172 84 180 C92 176 100 168 104 160 Z" fill="#5F879E"/>
    <path d="M8 178 Q28 168 48 178 T88 178 T128 178 T168 178 T208 178 V210 H8 Z" fill="#5E8FB0" opacity=".88"/>
    <path d="M8 190 Q28 182 48 190 T88 190 T128 190 T168 190 T208 190" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>
    <g fill="#fff" opacity=".85"><circle cx="58" cy="168" r="2.6"/><circle cx="50" cy="160" r="1.8"/><circle cx="150" cy="168" r="2.4"/><circle cx="158" cy="160" r="1.6"/></g>
    <g fill="none" stroke="#fff" stroke-width="1.6" opacity=".9"><circle cx="40" cy="130" r="4.5"/><circle cx="34" cy="112" r="3"/></g>
    <g transform="translate(150 58)"><path d="M-10 0 A10 10 0 1 1 10 0 C10 5 6 7 5 11 H-5 C-6 7 -10 5 -10 0 Z" fill="#F3D98A"/><rect x="-5" y="11" width="10" height="6" rx="1.5" fill="#B9AEBF"/><path d="M-17 -8 l-5 -3 M17 -8 l5 -3 M0 -15 v-6" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/></g>`,

  // 気まぐれ恋花火：ねこ（三毛・眠そうな目・鈴・線香花火）
  HFON: (o) => `
    <path d="M150 206 C168 186 176 160 168 140 C182 150 184 180 166 206 Z" fill="#C8895B"/>
    ${body("#F1EBE3", 132, 60, `stroke="#D9CFC4" stroke-width="1.4"`)}
    <g class="ear-l"><path d="M58 94 L62 48 L94 72 Z" fill="#3B3842"/><path d="M66 84 L68 60 L86 72 Z" fill="#E7B8C2"/></g>
    <g class="ear-r"><path d="M142 94 L138 48 L106 72 Z" fill="#F1EBE3" stroke="#D9CFC4" stroke-width="1.4"/><path d="M134 84 L132 60 L114 72 Z" fill="#E7B8C2"/></g>
    <path d="M100 144 C74 144 52 132 50 110 C48 92 64 70 100 70 C136 70 152 92 150 110 C148 132 126 144 100 144 Z" fill="#F1EBE3" stroke="#D9CFC4" stroke-width="1.4"/>
    <path d="M52 106 C52 88 66 74 86 72 C86 88 78 98 64 108 Z" fill="#3B3842"/>
    <path d="M124 74 C138 78 148 90 149 104 C138 102 126 94 120 82 Z" fill="#C8895B"/>
    ${E.sleepy(84, 116, 104)}${blush(72, 128, 118)}
    <path d="M96.5 114 L103.5 114 L100 118 Z" fill="#D98C9C"/>
    ${mouth(o, 100, 122)}
    <path d="M56 114 L76 116 M56 122 L76 120 M144 114 L124 116 M144 122 L124 120" stroke="#B9AFA6" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M72 146 Q100 158 128 146" fill="none" stroke="#5E8FB0" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="156" r="6" fill="${GOLD}"/><path d="M96 157 H104" stroke="#8F7040" stroke-width="1.4"/>
    ${paw(136, 182, "#F1EBE3", 9, 7)}
    <path d="M136 180 L150 148" stroke="#8C6A4E" stroke-width="2" stroke-linecap="round"/>
    <g transform="translate(152 142)">${star(0, 0, 9, "#E8C46A")}<path d="M-12 -4 l-6 -2 M12 -4 l6 -2 M-8 -12 l-3 -5 M8 -12 l3 -5 M0 -14 v-6" stroke="#E8A35A" stroke-width="1.6" stroke-linecap="round"/></g>`,

  // ひだまり尽くし系：ひつじ（にっこり目・小さな植木鉢・太陽）
  SCKW: (o) => `
    <g transform="translate(152 46)"><circle r="10" fill="#F3D98A"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (Math.PI / 4) * i; return `<path d="M${(14 * Math.cos(a)).toFixed(1)} ${(14 * Math.sin(a)).toFixed(1)} L${(19 * Math.cos(a)).toFixed(1)} ${(19 * Math.sin(a)).toFixed(1)}" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>`; }).join("")}</g>
    <g fill="#F3ECDF" stroke="#DDD2C0" stroke-width="2.6"><circle cx="52" cy="186" r="22"/><circle cx="148" cy="186" r="22"/><circle cx="76" cy="166" r="22"/><circle cx="124" cy="166" r="22"/><circle cx="100" cy="160" r="24"/><circle cx="100" cy="196" r="24"/></g><g fill="#F3ECDF"><circle cx="52" cy="186" r="22"/><circle cx="148" cy="186" r="22"/><circle cx="76" cy="166" r="22"/><circle cx="124" cy="166" r="22"/><circle cx="100" cy="160" r="24"/><circle cx="100" cy="196" r="24"/></g>
    <g class="ear-l"><ellipse cx="60" cy="104" rx="17" ry="8" transform="rotate(22 60 104)" fill="#D9C2A6"/></g>
    <g class="ear-r"><ellipse cx="140" cy="104" rx="17" ry="8" transform="rotate(-22 140 104)" fill="#D9C2A6"/></g>
    <g fill="#F3ECDF" stroke="#DDD2C0" stroke-width="2.6"><circle cx="74" cy="78" r="18"/><circle cx="100" cy="68" r="21"/><circle cx="126" cy="78" r="18"/><circle cx="64" cy="96" r="14"/><circle cx="136" cy="96" r="14"/></g><g fill="#F3ECDF"><circle cx="74" cy="78" r="18"/><circle cx="100" cy="68" r="21"/><circle cx="126" cy="78" r="18"/><circle cx="64" cy="96" r="14"/><circle cx="136" cy="96" r="14"/></g>
    <path d="M100 146 C82 146 72 130 72 112 C72 96 84 86 100 86 C116 86 128 96 128 112 C128 130 118 146 100 146 Z" fill="#E6D3BC"/>
    <g fill="#F7F1E8"><circle cx="88" cy="86" r="10"/><circle cx="100" cy="82" r="11"/><circle cx="112" cy="86" r="10"/></g>
    ${E.happy(89, 111, 112, 4.5)}${blush(82, 118, 122, 6)}
    <ellipse cx="100" cy="126" rx="4" ry="2.8" fill="#9C7E66"/>
    ${mouth(o, 100, 132)}
    <g transform="translate(-4 -14)"><path d="M118 176 H146 L142 196 H122 Z" fill="#C98A5E"/><rect x="116" y="172" width="32" height="6" rx="2" fill="#B57A50"/>
    <path d="M132 172 C132 160 132 154 132 150" stroke="#6E9E86" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M132 158 C124 152 118 154 116 158 C122 162 128 162 132 158 Z M132 152 C140 146 146 148 148 152 C142 156 136 156 132 152 Z" fill="#6E9E86"/></g>
    ${paw(110, 172, "#E6D3BC", 7, 6)}`,

  // 癒やしの保健室：コアラ（眠そうな目・ユーカリの葉・横に持ったマグ）
  SCKN: (o) => `
    ${body("#A9AAB4", 132, 62)}${bib("#E5E3EA", 158, 22)}
    <g class="ear-l"><circle cx="58" cy="78" r="24" fill="#A9AAB4"/><circle cx="60" cy="80" r="14" fill="#E5E3EA"/></g>
    <g class="ear-r"><circle cx="142" cy="78" r="24" fill="#A9AAB4"/><circle cx="140" cy="80" r="14" fill="#E5E3EA"/></g>
    <path d="M100 144 C72 144 56 128 56 106 C56 84 74 70 100 70 C126 70 144 84 144 106 C144 128 128 144 100 144 Z" fill="#A9AAB4"/>
    ${E.sleepy(80, 120, 100, 5.5)}${blush(70, 130, 118)}
    <path d="M90 102 C90 96 110 96 110 102 L110 116 C110 124 90 124 90 116 Z" fill="#4A4552"/>
    <ellipse cx="96" cy="106" rx="2.4" ry="3.4" fill="#fff" opacity=".45"/>
    ${mouth(o, 100, 131)}
    <g transform="translate(-4 -14)"><path d="M122 168 H148 V184 C148 192 142 196 135 196 C128 196 122 192 122 184 Z" fill="${CREAM}" stroke="#C9BFB3" stroke-width="1.4"/><path d="M148 172 C156 172 156 184 148 184" fill="none" stroke="#C9BFB3" stroke-width="3"/>
    <path d="M135 188 C128 184 128 176 135 172 C142 176 142 184 135 188 Z" fill="#7E9A72"/><path d="M135 188 V174" stroke="#5F7A55" stroke-width="1"/>
    <path d="M130 162 C126 156 134 152 130 146 M140 162 C136 156 144 152 140 146" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/></g>
    ${paw(116, 170, "#A9AAB4", 8, 7)}`,

  // あったか巣づくり派：リス（ふさふさのしっぽ・横に抱えたどんぐり・葉っぱ）
  SCOW: (o) => `
    <path d="M142 206 C186 176 190 118 160 92 C144 80 124 90 134 106 C150 130 140 160 120 182 Z" fill="#B57C4F"/>
    <path d="M150 190 C174 166 178 128 158 104" fill="none" stroke="#D8A982" stroke-width="7" stroke-linecap="round"/>
    ${body("#C08A5B", 132, 56)}${bib(CREAM, 156, 18)}
    <g class="ear-l"><path d="M66 86 C60 68 62 48 74 40 C80 36 86 40 87 50 C88 62 88 74 86 84 Z" fill="#C08A5B"/><path d="M71 80 C68 66 69 54 75 49 C79 47 81 52 81 58 C82 66 81 74 80 80 Z" fill="#E6B99A"/></g>
    <g class="ear-r"><path d="M134 86 C140 68 138 48 126 40 C120 36 114 40 113 50 C112 62 112 74 114 84 Z" fill="#C08A5B"/><path d="M129 80 C132 66 131 54 125 49 C121 47 119 52 119 58 C118 66 119 74 120 80 Z" fill="#E6B99A"/></g>
    <path d="M100 142 C76 142 62 126 62 106 C62 86 78 72 100 72 C122 72 138 86 138 106 C138 126 124 142 100 142 Z" fill="#C08A5B"/>
    <ellipse cx="78" cy="120" rx="15" ry="12" fill="${CREAM}"/><ellipse cx="122" cy="120" rx="15" ry="12" fill="${CREAM}"/>
    <path d="M100 72 C96 84 96 94 100 102 C104 94 104 84 100 72 Z" fill="#A8744A"/>
    ${E.sparkle(86, 114, 102, 0.9)}${blush(74, 126, 114)}
    <ellipse cx="100" cy="114" rx="3.6" ry="2.6" fill="${INK}"/>
    ${mouth(o, 100, 120)}
    <path d="M88 168 C88 182 94 190 100 190 C106 190 112 182 112 168 Z" fill="#C99A62"/>
    <path d="M85 169 C85 158 115 158 115 169 C110 171 90 171 85 169 Z" fill="#7A5232"/>
    <path d="M90 164 L94 167 M97 162 L100 166 M104 162 L107 166 M110 164 L112 167" stroke="#5E3E24" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M100 160 C100 156 102 153 104 152" stroke="#5E3E24" stroke-width="2" stroke-linecap="round" fill="none"/>
    ${paw(86, 178, "#C08A5B", 7, 6.5)}${paw(114, 178, "#C08A5B", 7, 6.5)}`,

  // こっそり甘えんぼ：ハリネズミ（まんまるの体・照れた目・1輪の花）
  SCON: (o) => `
    <path d="M28 150 L20 126 L36 128 L28 100 L46 108 L44 80 L62 92 L66 64 L82 80 L92 54 L102 76 L114 54 L122 80 L138 64 L142 92 L160 80 L158 108 L176 100 L168 128 L184 126 L174 150 L182 172 L164 172 L168 196 L36 196 L40 172 L20 172 Z" fill="#7E604C"/>
    <path d="M60 206 C56 160 72 138 100 138 C128 138 144 160 140 206 Z" fill="#EFE2D0"/>
    <path d="M100 148 C76 148 62 132 62 114 C62 96 78 86 100 86 C122 86 138 96 138 114 C138 132 124 148 100 148 Z" fill="#EFE2D0"/>
    <g class="ear-l"><circle cx="72" cy="92" r="8" fill="#E3CDB4"/></g>
    <g class="ear-r"><circle cx="128" cy="92" r="8" fill="#E3CDB4"/></g>
    <g class="eyes"><ellipse cx="91" cy="112" rx="4" ry="5" fill="${INK}"/><ellipse cx="115" cy="112" rx="4" ry="5" fill="${INK}"/><circle cx="90" cy="110" r="1.3" fill="#fff"/><circle cx="114" cy="110" r="1.3" fill="#fff"/></g>
    ${blush(80, 124, 124, 9)}
    <path d="M78 120 l4 -4 M82 122 l4 -4 M118 120 l4 -4 M122 122 l4 -4" stroke="#C97C8A" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="103" cy="124" rx="4.5" ry="3.4" fill="${INK}"/>
    ${mouth(o, 103, 131)}
    <path d="M124 186 C126 172 130 164 134 158" fill="none" stroke="#7E9A72" stroke-width="2.4" stroke-linecap="round"/>
    <g transform="translate(136 154)">${[0, 1, 2, 3, 4].map((i) => { const a = (Math.PI * 2 * i) / 5 - Math.PI / 2; return `<circle cx="${(7 * Math.cos(a)).toFixed(1)}" cy="${(7 * Math.sin(a)).toFixed(1)}" r="5.5" fill="#F0B9C4"/>`; }).join("")}<circle r="3.2" fill="#E8C46A"/></g>
    ${paw(122, 184, "#E3CDB4", 8, 6.5)}${paw(80, 184, "#E3CDB4", 8, 6.5)}
    ${heart(152, 66, 1.2, RED)}`,

  // 誠実なしっかり者：フクロウ（丸メガネ・本）
  SFKW: (o) => `
    ${body("#8C7A64", 126, 66)}
    <path d="M70 210 C72 176 84 158 100 158 C116 158 128 176 130 210 Z" fill="#B6A389"/>
    <g class="ear-l"><path d="M62 80 L56 46 L84 68 Z" fill="#8C7A64"/></g>
    <g class="ear-r"><path d="M138 80 L144 46 L116 68 Z" fill="#8C7A64"/></g>
    <path d="M100 138 C70 138 54 122 54 100 C54 78 74 62 100 62 C126 62 146 78 146 100 C146 122 130 138 100 138 Z" fill="#8C7A64"/>
    <circle cx="82" cy="100" r="18" fill="#ECE0CD"/><circle cx="118" cy="100" r="18" fill="#ECE0CD"/>
    ${E.dot(82, 118, 100, 1.3)}
    <g fill="none" stroke="${GOLD}" stroke-width="1.8"><circle cx="82" cy="100" r="13"/><circle cx="118" cy="100" r="13"/><path d="M95 98 Q100 94 105 98"/></g>
    <path d="M95 114 L105 114 L100 124 Z" fill="#D49A5A"/>
    ${blush(68, 132, 122, 6)}
    <g transform="rotate(-4 100 178)"><path d="M64 166 Q82 160 100 168 Q118 160 136 166 L136 194 Q118 188 100 196 Q82 188 64 194 Z" fill="#fff" stroke="#C9BFB3" stroke-width="1.4"/><path d="M100 168 V196" stroke="#C9BFB3" stroke-width="1.4"/><path d="M72 172 H92 M72 178 H92 M72 184 H88 M108 172 H128 M108 178 H128 M108 184 H122" stroke="#D6CCC0" stroke-width="1.4"/></g>`,

  // ていねい恋愛ノート：子鹿（耳にかけたえんぴつ・横に持ったノート）
  SFKN: (o) => `
    ${body("#C79B6F", 132, 58)}${bib(CREAM, 160, 16)}
    <g fill="${CREAM}" opacity=".85"><circle cx="64" cy="184" r="3.4"/><circle cx="76" cy="172" r="3"/><circle cx="58" cy="196" r="3"/></g>
    <g class="ear-l"><ellipse cx="58" cy="92" rx="21" ry="9" transform="rotate(-28 58 92)" fill="#C79B6F"/><ellipse cx="60" cy="92" rx="13" ry="4.5" transform="rotate(-28 60 92)" fill="#E9C3B6"/></g>
    <g class="ear-r"><ellipse cx="142" cy="92" rx="21" ry="9" transform="rotate(28 142 92)" fill="#C79B6F"/><ellipse cx="140" cy="92" rx="13" ry="4.5" transform="rotate(28 140 92)" fill="#E9C3B6"/></g>
    <path d="M100 146 C82 146 68 132 68 110 C68 86 82 70 100 70 C118 70 132 86 132 110 C132 132 118 146 100 146 Z" fill="#C79B6F"/>
    <ellipse cx="100" cy="130" rx="17" ry="13" fill="${CREAM}"/>
    <g fill="${CREAM}" opacity=".8"><circle cx="92" cy="80" r="2.6"/><circle cx="108" cy="80" r="2.6"/><circle cx="100" cy="76" r="2.2"/></g>
    ${E.dot(87, 113, 104)}${blush(78, 122, 116, 6)}
    <ellipse cx="100" cy="124" rx="4.5" ry="3.2" fill="${INK}"/>
    ${mouth(o, 100, 131)}
    <g transform="translate(-2 -10) rotate(8 134 180)"><rect x="116" y="162" width="36" height="34" rx="3" fill="#F7F1E8" stroke="#C9BFB3" stroke-width="1.4"/><path d="M122 170 H148 M122 177 H148 M122 184 H140" stroke="#D6CCC0" stroke-width="1.4"/><rect x="116" y="162" width="5" height="34" fill="#5E8FB0"/>
    <g transform="rotate(30 146 172)"><rect x="143" y="150" width="6" height="30" fill="#E8C46A"/><path d="M143 180 L146 187 L149 180 Z" fill="#E8D3B0"/><rect x="143" y="146" width="6" height="5" fill="${RED}"/></g></g>
    ${paw(114, 174, "#C79B6F", 7, 6)}`,

  // しずかな月の恋人：オオカミ（月・マフラー・おだやかな目）
  SFOW: (o) => `
    <path d="M152 30 A16 16 0 1 0 165 56 A12 12 0 1 1 152 30 Z" fill="${GOLD}"/>
    ${star(40, 52, 4, "#E8C46A")}${star(56, 36, 2.6, "#E8C46A")}
    ${body("#7C8598", 134, 62)}
    <g class="ear-l"><path d="M64 86 L60 40 L94 66 Z" fill="#7C8598"/><path d="M69 76 L67 52 L86 66 Z" fill="#5C6475"/></g>
    <g class="ear-r"><path d="M136 86 L140 40 L106 66 Z" fill="#7C8598"/><path d="M131 76 L133 52 L114 66 Z" fill="#5C6475"/></g>
    <path d="M100 150 C76 150 56 134 54 110 C52 88 70 68 100 68 C130 68 148 88 146 110 C144 134 124 150 100 150 Z" fill="#7C8598"/>
    <path d="M100 150 C84 150 70 140 66 122 C78 120 90 124 100 134 C110 124 122 120 134 122 C130 140 116 150 100 150 Z" fill="#E8ECF1"/>
    <path d="M90 88 C94 84 106 84 110 88 L100 106 Z" fill="#E8ECF1" opacity=".7"/>
    ${E.sleepy(84, 116, 104, 5.5)}${blush(74, 126, 118)}
    <ellipse cx="100" cy="130" rx="5" ry="3.6" fill="${INK}"/>
    ${mouth(o, 100, 137)}
    <path d="M58 156 Q100 174 142 156 L144 170 Q100 188 56 170 Z" fill="#6B5B8E"/>
    <path d="M118 170 L126 204 L138 202 L130 166 Z" fill="#5A4B7C"/>
    <path d="M60 162 Q100 178 140 162" stroke="#8C7DAE" stroke-width="1.6" fill="none"/>`,

  // マイペース恋愛職人：カメ（正面・甲羅は背中側・ベレー帽・パレット）
  SFON: (o) => `
    <ellipse cx="100" cy="182" rx="76" ry="52" fill="#7E9A72"/>
    <ellipse cx="100" cy="182" rx="76" ry="52" fill="none" stroke="#5F7A55" stroke-width="2.4"/>
    <g fill="#8FAA82" stroke="#5F7A55" stroke-width="2" stroke-linejoin="round">${[[46, 158], [154, 158], [36, 190], [164, 190]].map(([x, y]) => `<path d="M${x - 11} ${y} L${x - 5.5} ${y - 9.5} L${x + 5.5} ${y - 9.5} L${x + 11} ${y} L${x + 5.5} ${y + 9.5} L${x - 5.5} ${y + 9.5} Z"/>`).join("")}</g>
    ${body("#A8C39A", 130, 48)}
    <path d="M78 210 C78 178 88 160 100 160 C112 160 122 178 122 210 Z" fill="#E6DDB0"/>
    <path d="M86 176 H114 M84 192 H116" stroke="#C9BE8C" stroke-width="1.8"/>
    <path d="M100 140 C76 140 64 124 64 104 C64 82 80 68 100 68 C120 68 136 82 136 104 C136 124 124 140 100 140 Z" fill="#A8C39A"/>
    ${E.dot(88, 112, 100)}${blush(78, 122, 114, 6)}
    ${mouth(o, 100, 120)}
    <g class="ear-l"><ellipse cx="94" cy="70" rx="30" ry="10" transform="rotate(-12 94 70)" fill="${PLUM}"/><circle cx="104" cy="60" r="3.4" fill="#6E3550"/></g>
    <g transform="translate(-4 -12) rotate(-12 140 180)"><path d="M120 176 C120 164 134 158 150 162 C162 166 164 178 156 184 C150 188 146 182 140 186 C132 192 120 188 120 176 Z" fill="#F7F1E8" stroke="#C9BFB3" stroke-width="1.4"/><circle cx="132" cy="170" r="3.6" fill="${RED}"/><circle cx="143" cy="167" r="3.6" fill="#E8C46A"/><circle cx="153" cy="173" r="3.6" fill="#5E8FB0"/><circle cx="130" cy="180" r="3.4" fill="#6E9E86"/></g>
    ${paw(120, 168, "#A8C39A", 8, 7)}${paw(80, 172, "#A8C39A", 8, 7)}`,
};

// code: 例 "HCKW"。opts.mystery で「？」のシルエット
function mascotSVG(code, opts = {}) {
  const id = ++mascotId;
  const color = opts.mystery ? "#B9AEBF" : typeColor(code);
  const inner = opts.mystery
    ? `${body("#E6E0EA", 132, 62)}<ellipse cx="100" cy="106" rx="40" ry="37" fill="#E6E0EA"/>
       <text x="100" y="120" text-anchor="middle" font-family="'Shippori Mincho B1', serif" font-size="38" fill="#8C8193">？</text>`
    : CHARACTERS[code](isOpen(code));
  return `<svg class="mascot" viewBox="0 0 200 200" role="img" aria-label="${opts.label || ""}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="medal${id}"><circle cx="100" cy="100" r="92"/></clipPath></defs>
    <circle cx="100" cy="100" r="92" fill="${tint(color, 0.22)}"/>
    <g clip-path="url(#medal${id})"><g class="char" style="--d:${(id % 7) * 0.7}s">${inner}</g></g>
    <circle cx="100" cy="100" r="92" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
    <circle cx="100" cy="100" r="96.5" fill="none" stroke="${GOLD}" stroke-width=".7" opacity=".6"/>
  </svg>`;
}
