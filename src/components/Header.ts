export function renderHeader(root: HTMLElement, onRestart: () => void): void {
  const header = document.createElement('header');
  header.innerHTML = `
    <div class="brand">
      <span>Pinyin</span>Type
    </div>
  `;
  
  const brand = header.querySelector('.brand') as HTMLElement;
  brand.style.cursor = 'pointer';
  brand.onclick = onRestart;
  
  root.appendChild(header);
  // #region agent log
  // #endregion
}
