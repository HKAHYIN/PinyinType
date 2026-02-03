export function renderHeader(root: HTMLElement, onRestart: () => void): void {
  const header = document.createElement('header');
  header.innerHTML = `
    <div class="header-container">
      <div class="brand">
        <span>Pinyin</span>Type
      </div>
      <div class="header-controls">
        <label class="toggle-switch">
          <input type="checkbox" id="disable-space-toggle">
          <span class="slider round"></span>
        </label>
        <span class="toggle-label">No Space</span>
      </div>
    </div>
  `;
  
  const brand = header.querySelector('.brand') as HTMLElement;
  brand.style.cursor = 'pointer';
  brand.onclick = onRestart;
  
  // Initialize toggle state from localStorage (default to true)
  const toggle = header.querySelector('#disable-space-toggle') as HTMLInputElement;
  const storedValue = localStorage.getItem('disableSpace');
  const isSpaceDisabled = storedValue === null ? true : storedValue === 'true';
  toggle.checked = isSpaceDisabled;
  
  // Save default if not present
  if (storedValue === null) {
    localStorage.setItem('disableSpace', 'true');
  }
  
  toggle.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    localStorage.setItem('disableSpace', String(target.checked));
  });
  
  root.appendChild(header);
}
