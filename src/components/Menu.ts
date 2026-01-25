import { ARTICLES } from '../data/articles';
import { VOCABULARY } from '../data/vocabulary';

export class Menu {

  private container: HTMLElement;
  private onStart: (text: string) => void;

  constructor(root: HTMLElement, onStart: (text: string) => void) {
    this.onStart = onStart;
    
    // Create container
    this.container = document.createElement('div');
    this.container.style.width = '100%';
    
    // Create HTML structure
    this.container.innerHTML = `
      <div id="menu-grid" class="grid"></div>
      <div style="margin-top: 40px; border-top: 1px solid #444; padding-top: 20px;">
        <h3 style="color: var(--text-color); margin-bottom: 20px;">Random Mode</h3>
        <div style="margin-bottom: 15px;">
          <label style="color: var(--sub-color); display: block; margin-bottom: 8px;">Word Count:</label>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="word-count-btn" data-count="10">10</button>
            <button class="word-count-btn" data-count="25">25</button>
            <button class="word-count-btn" data-count="30">30</button>
            <button class="word-count-btn" data-count="40">40</button>
            <button class="word-count-btn" data-count="50">50</button>
            <button class="word-count-btn" data-count="100">100</button>
            <button class="word-count-btn" data-count="200">200</button>
          </div>
        </div>
        <button class="start-btn" id="btn-random">Start Random</button>
      </div>
      <div style="margin-top: 40px; border-top: 1px solid #444; padding-top: 20px;">
        <p style="color:#666">Or Custom Text:</p>
        <textarea id="custom-text" placeholder="Paste here..."></textarea>
        <br>
        <button class="start-btn" id="btn-custom">Start Custom</button>
      </div>
    `;
    
    root.appendChild(this.container);

    this.attachEvents();
  }

  private attachEvents() {
    const grid = this.container.querySelector('#menu-grid')!;

    
    // 1. Render Preset Cards
    ARTICLES.forEach(art => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>${art.title}</h3><p>${art.content}</p>`;
      card.onclick = () => {
        this.hide();
        this.onStart(art.content);
      };
      grid.appendChild(card);
    });

    // 2. Random Mode
    let selectedWordCount = 50; // Default
    const wordCountButtons = this.container.querySelectorAll('.word-count-btn');
    wordCountButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        wordCountButtons.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        selectedWordCount = parseInt(btn.getAttribute('data-count') || '50');
      });
    });
    // Set default active button (50)
    (wordCountButtons[4] as HTMLElement)?.classList.add('active'); // 50 is default
    
    const randomBtn = this.container.querySelector('#btn-random') as HTMLButtonElement;
    randomBtn.onclick = () => {
      this.hide();
      const randomText = this.generateRandomText(selectedWordCount);
      this.onStart(randomText);
    };

    // 3. Custom Input
    const btn = this.container.querySelector('#btn-custom') as HTMLButtonElement;
    const input = this.container.querySelector('#custom-text') as HTMLTextAreaElement;
    
    btn.onclick = () => {
      if(input.value.trim()) {
        this.hide();
        this.onStart(input.value);
      }
    };
  }

  private generateRandomText(wordCount: number): string {
    // Shuffle vocabulary array
    const shuffled = [...VOCABULARY].sort(() => Math.random() - 0.5);
    
    // Select words up to the requested count
    const selectedWords = shuffled.slice(0, Math.min(wordCount, shuffled.length));
    
    // Join words with spaces
    return selectedWords.join(' ');
  }

  public hide() { this.container.style.display = 'none'; }
  public show() { this.container.style.display = 'block'; }
}
