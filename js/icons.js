/** Shared SVG icons for UI (ad disclosure for Yandex moderation) */

export const TV_ICON_SVG = `
<svg class="icon-tv" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
  <rect x="2" y="5" width="20" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="11.5" r="2.2" fill="currentColor"/>
  <path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 18v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export function rewardButtonInner(labelHtml) {
  return `${TV_ICON_SVG}<span class="btn-reward-label">${labelHtml}</span>`;
}
