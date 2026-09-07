/** Overlay HTML for climb power gets. No image or SVG file imports — Node tests load this. */

const MAPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <ellipse cx="15" cy="54" rx="12" ry="6.5" fill="#e4b87a" stroke="#6b3a14" stroke-width="2.2"/>
  <ellipse cx="49" cy="54" rx="12" ry="6.5" fill="#e4b87a" stroke="#6b3a14" stroke-width="2.2"/>
  <ellipse cx="32" cy="40" rx="25" ry="18" fill="#f3d7a4" stroke="#6b3a14" stroke-width="2.6"/>
  <ellipse cx="32" cy="46" rx="14" ry="9" fill="#fff6e0" opacity="0.72"/>
  <circle cx="20" cy="20" r="10" fill="#f6dfb2" stroke="#6b3a14" stroke-width="2.6"/>
  <circle cx="44" cy="20" r="10" fill="#f6dfb2" stroke="#6b3a14" stroke-width="2.6"/>
  <circle cx="20" cy="20" r="4" fill="#2a160a"/>
  <circle cx="44" cy="20" r="4" fill="#2a160a"/>
  <circle cx="22" cy="18.2" r="1.35" fill="#fff8ea"/>
  <circle cx="46" cy="18.2" r="1.35" fill="#fff8ea"/>
  <path d="M21 41c4.5 8.5 17.5 8.5 22 0" fill="none" stroke="#6b3a14" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

const WALNUT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <ellipse cx="15" cy="54" rx="12" ry="6.5" fill="#3a1c0c" stroke="#140804" stroke-width="2.2"/>
  <ellipse cx="49" cy="54" rx="12" ry="6.5" fill="#3a1c0c" stroke="#140804" stroke-width="2.2"/>
  <path d="M7 52l-3 4M12 55l-2 4M18 55l2 4" fill="none" stroke="#140804" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M57 52l3 4M52 55l2 4M46 55l-2 4" fill="none" stroke="#140804" stroke-width="1.8" stroke-linecap="round"/>
  <ellipse cx="32" cy="40" rx="25" ry="18" fill="#5a3218" stroke="#140804" stroke-width="2.6"/>
  <ellipse cx="32" cy="47" rx="12" ry="8" fill="#2a1408" opacity="0.55"/>
  <ellipse cx="20" cy="21" rx="10.2" ry="9.4" fill="#4a2812" stroke="#140804" stroke-width="2.6"/>
  <ellipse cx="44" cy="21" rx="10.2" ry="9.4" fill="#4a2812" stroke="#140804" stroke-width="2.6"/>
  <ellipse cx="23" cy="22.5" rx="2.4" ry="4.6" fill="#e8c547"/>
  <ellipse cx="41" cy="22.5" rx="2.4" ry="4.6" fill="#e8c547"/>
  <path d="M9 12l20 7" fill="none" stroke="#140804" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M55 12l-20 7" fill="none" stroke="#140804" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M21 46c4.5-7.5 17.5-7.5 22 0" fill="none" stroke="#140804" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M26 43l2.2 7 2.4-6z" fill="#f3d7a4" stroke="#140804" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M34 44l2.2 7 2.4-6z" fill="#f3d7a4" stroke="#140804" stroke-width="1.1" stroke-linejoin="round"/>
</svg>`;

function poster(scene: string, stamp: string, body: string): string {
  return `<div class="get-poster get-${scene}" role="dialog" aria-live="assertive">
    <div class="get-art">${body}</div>
    <p class="get-stamp">YOU GOT ${stamp}!</p>
  </div>`;
}

function frog(svg: string, extra = ""): string {
  return `<span class="get-frog ${extra}">${svg}</span>`;
}

export function sceneMarkup(scene: string, name: string): string {
  const stamp = scene === "back2Back" ? "BACK 2 BACK" : name.toUpperCase();
  const you = frog(MAPLE_SVG);
  const them = frog(WALNUT_SVG);
  const sleep = frog(WALNUT_SVG, "asleep");
  const king = frog(MAPLE_SVG, "crowned");
  const art: Record<string, string> = {
    backJump: `<div class="get-felt">${you}<i class="pip n"></i><i class="pip e"></i><i class="pip s"></i><i class="pip w"></i></div>`,
    flyingKings: `<div class="get-felt long"><i class="slide"></i>${king}</div>`,
    recruit: `<div class="get-felt row">${you}${frog(MAPLE_SVG, "wave")}</div>`,
    lastRites: `<div class="get-felt far">${king}</div>`,
    openKing: `<div class="get-felt">${king}</div>`,
    extraMan: `<div class="get-felt extra">${you}${you}</div>`,
    hopCrown: `<div class="get-felt party"><i class="spark"></i>${king}</div>`,
    farJump: `<div class="get-felt leap">${you}${them}<i class="star"></i></div>`,
    doubleCrown: `<div class="get-felt">${king}${king}</div>`,
    trapdoor: `<div class="get-felt pit"><i class="hole"></i><i class="star"></i>${you}</div>`,
    scout: `<div class="get-felt mid">${you}</div>`,
    widePond: `<figure class="get-wide-frame"><div class="get-wide-art" role="img" aria-label="Wide Pond"></div></figure>`,
    napTime: `<div class="get-felt sleep">${sleep}${sleep}<i class="zzz">Zzz</i></div>`,
    back2Back: `<div class="get-felt pair"><i class="ring"></i>${you}${you}<b class="times">×2</b></div>`,
  };
  return poster(scene, stamp, art[scene] ?? "");
}
