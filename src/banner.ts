const banner = document.getElementById("banner");
let bannerTimer: ReturnType<typeof setTimeout> | null = null;

export function showBanner(text: string): void {
  if (!banner) return;
  banner.textContent = text;
  banner.classList.add("show");
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove("show"), 1800);
}
