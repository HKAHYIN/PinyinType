import { pinyin } from 'pinyin-pro';

export class Game {
  private root: HTMLElement;
  private onRestart: () => void;
  private container: HTMLElement | null = null;
  private wordsWrapper: HTMLElement | null = null;
  private hiddenInput: HTMLInputElement | null = null;
  private currentText: string = '';
  private wordGroups: HTMLElement[] = [];
  private startTime: number = 0;
  private isActive: boolean = false;
  private errorCount: number = 0;
  private totalChars: number = 0;
  private isNormalizing: boolean = false;
  private lastScrolledRow: number = -1;
  private isPaused: boolean = false;
  private pauseStartTime: number = 0;
  private totalPauseTime: number = 0;
  private lastInputTime: number = 0;
  private pauseCheckInterval: number | null = null;
  private pauseMenu: HTMLElement | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor(root: HTMLElement, onRestart: () => void) {
    this.root = root;
    this.onRestart = () => {
      this.resetGame();
      onRestart();
    };
  }

  private resetGame(): void {
    this.isPaused = false;
    this.errorCount = 0;
    this.totalChars = 0;
    this.isActive = false;
    this.currentText = '';
    this.lastScrolledRow = -1;
    this.totalPauseTime = 0;
    this.lastInputTime = 0;
    // Cleanup pause detection
    this.cleanupPauseDetection();
    // Remove visibility change listener
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    // Remove pause menu
    this.hidePauseMenu();
    // Remove pause menu from DOM if it exists anywhere
    const pauseMenuInDOM = document.querySelector('#pause-menu');
    if (pauseMenuInDOM) {
      pauseMenuInDOM.remove();
    }
    // Remove event handlers from input
    if (this.hiddenInput) {
      this.hiddenInput.oninput = null;
      this.hiddenInput.onkeydown = null;
      this.hiddenInput.value = '';
    }
    // Remove results container if it exists
    const existingResults = this.root.querySelector('#results-container');
    if (existingResults) {
      existingResults.remove();
    }
    if (this.container) {
      this.container.style.display = 'none';
    }
    // Ensure pause menu cannot linger
    if (this.pauseMenu) {
      this.pauseMenu.remove();
      this.pauseMenu = null;
    }
  }

  public start(text: string): void {
    // Reset pause state
    this.isPaused = false;
    this.totalPauseTime = 0;
    this.pauseStartTime = 0;
    // Remove any lingering pause menu immediately
    if (this.pauseMenu) {
      this.pauseMenu.remove();
      this.pauseMenu = null;
    }
    const pauseMenuInDOM = document.querySelector('#pause-menu');
    if (pauseMenuInDOM) {
      pauseMenuInDOM.remove();
    }
    // Reset game state
    this.errorCount = 0;
    this.totalChars = 0;
    this.currentText = text;
    this.isActive = true;
    this.startTime = Date.now();
    this.lastScrolledRow = -1;
    // Hide menu if visible
    const menu = this.root.querySelector('[id^="menu"]')?.parentElement;
    if (menu) {
      (menu as HTMLElement).style.display = 'none';
    }
    // Remove any existing results container
    const existingResults = this.root.querySelector('#results-container');
    if (existingResults) {
      existingResults.remove();
    }
    // Create game container
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'game-container';
      this.root.appendChild(this.container);
    }
    this.container.style.display = 'flex';
    // Create words wrapper
    if (this.wordsWrapper) {
      this.wordsWrapper.remove();
    }
    this.wordsWrapper = document.createElement('div');
    this.wordsWrapper.id = 'words-wrapper';
    this.wordsWrapper.style.display = 'flex'; // Ensure it's visible
    this.container.appendChild(this.wordsWrapper);
    // Remove old input and create new one
    if (this.hiddenInput) {
      // Remove event handlers before removing element
      this.hiddenInput.oninput = null;
      this.hiddenInput.onkeydown = null;
      this.hiddenInput.remove();
    }
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.id = 'hidden-input';
    this.hiddenInput.type = 'text';
    this.hiddenInput.value = ''; // Explicitly clear value
    this.hiddenInput.autocomplete = 'off';
    this.hiddenInput.setAttribute('autocorrect', 'off');
    this.hiddenInput.setAttribute('autocapitalize', 'off');
    this.hiddenInput.spellcheck = false;
    this.hiddenInput.style.display = 'block'; // Ensure it's visible
    this.container.appendChild(this.hiddenInput);
    // Render words
    this.renderWords(text);
    // Reset pause state
    this.isPaused = false;
    this.totalPauseTime = 0;
    this.lastInputTime = Date.now();
    // Attach input handler
    this.hiddenInput.oninput = () => {
      this.lastInputTime = Date.now();
      if (this.isPaused) {
        this.resume();
      }
      this.handleInput();
    };
    this.hiddenInput.onkeydown = (e) => {
      if (e.key === 'Escape') {
        this.onRestart();
      }
    };

    this.setupPauseDetection();
    // tab visibility detection
    this.visibilityChangeHandler = () => {
      if (document.hidden && this.isActive && !this.isPaused) {
        this.pause();
      } else if (!document.hidden && this.isPaused) {
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    setTimeout(() => {
      this.hiddenInput?.focus();
    }, 100);
  }

  private renderWords(text: string): void {
    if (!this.wordsWrapper) return;

    this.wordGroups = [];
    const chars = Array.from(text);
    let isFirstGroup = true;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const isZh = /[\u4e00-\u9fa5]/.test(char);

      if (isZh) {
        // Chinese character - show hanzi with pinyin
        const py = pinyin(char, { toneType: 'none' });
        const wordGroup = document.createElement('div');
        wordGroup.className = 'word-group';
        const shouldBeActive = isFirstGroup;
        if (shouldBeActive) {
          wordGroup.classList.add('active');
          isFirstGroup = false;
        }

        const hanziEl = document.createElement('div');
        hanziEl.className = 'hanzi';
        hanziEl.textContent = char;

        const pinyinEl = document.createElement('div');
        pinyinEl.className = 'pinyin';

        // Split pinyin into characters for typing
        const pyChars = Array.from(py);
        pyChars.forEach((pyChar, idx) => {
          const charEl = document.createElement('span');
          charEl.className = 'char';
          charEl.textContent = pyChar;
          charEl.dataset.index = String(i);
          charEl.dataset.pinyinIndex = String(idx);
          // first character as active on initial render
          if (shouldBeActive && idx === 0) {
            charEl.classList.add('active');
          }
          pinyinEl.appendChild(charEl);
        });

        wordGroup.appendChild(hanziEl);
        wordGroup.appendChild(pinyinEl);
        this.wordsWrapper.appendChild(wordGroup);
        this.wordGroups.push(wordGroup);
      } else if (char.trim() || char === ' ') {
        // Non-Chinese character (punctuation, space, etc.) - including spaces
        const wordGroup = document.createElement('div');
        wordGroup.className = 'word-group';
        const shouldBeActive = isFirstGroup;
        if (shouldBeActive) {
          wordGroup.classList.add('active');
          isFirstGroup = false;
        }

        const charEl = document.createElement('div');
        charEl.className = 'char';
        // Make spaces visible
        if (char === ' ') {
          charEl.textContent = '';
          charEl.classList.add('space-char');
          charEl.setAttribute('data-space', 'true');
        } else {
          charEl.textContent = char;
        }
        charEl.dataset.index = String(i);
        // first character as active on initial render
        if (shouldBeActive) {
          charEl.classList.add('active');
          // Ensure space-char is maintained when active
          if (char === ' ') {
            charEl.classList.add('space-char');
          }
        }

        wordGroup.appendChild(charEl);
        this.wordsWrapper.appendChild(wordGroup);
        this.wordGroups.push(wordGroup);
      }
    }
  }

  private normalizeInput(input: string): string {
    // Convert any Chinese characters in the input to pinyin
    let normalized = '';
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (/[\u4e00-\u9fa5]/.test(char)) {
        // Chinese character - convert to pinyin
        normalized += pinyin(char, { toneType: 'none' });
      } else {
        // Keep other characters as-is
        normalized += char;
      }
    }
    return normalized;
  }

  private handleInput(): void {
    if (!this.isActive || !this.hiddenInput) return;
    
    if (this.isNormalizing) return;

    // Get input value
    const rawInput = this.hiddenInput.value;
    // Normalize input: convert any Chinese characters to pinyin
    let input = this.normalizeInput(rawInput);
    
    // Update the input field if normalization changed the value
    if (rawInput !== input && this.hiddenInput) {
      this.isNormalizing = true;
      const cursorPos = this.hiddenInput.selectionStart || 0;
      const inputDiff = input.length - rawInput.length;
      this.hiddenInput.value = input;
      // Adjust cursor position based on the length
      const newPos = Math.max(0, Math.min(cursorPos + inputDiff, input.length));
      this.hiddenInput.setSelectionRange(newPos, newPos);
      setTimeout(() => {
        this.isNormalizing = false;
        if (this.isActive && this.hiddenInput) {
          this.handleInput();
        }
      }, 10);
      return;
    }
    
    // convert Chinese to pinyin
    const expectedText = this.getExpectedText();
    const inputLength = input.length;
    
    // Reset all styling and active states
    this.wordGroups.forEach(group => {
      group.classList.remove('active');
      const chars = group.querySelectorAll('.char');
      chars.forEach(char => {
        char.classList.remove('correct', 'incorrect', 'typed', 'active');
      });
    });

    // Build mapping: expected text position -> word group info
    let expectedPos = 0;
    const groupMap: Array<{
      group: HTMLElement;
      startPos: number;
      endPos: number;
      type: 'pinyin' | 'single';
      expectedChars?: string;
    }> = [];

    for (let i = 0; i < this.wordGroups.length; i++) {
      const group = this.wordGroups[i];
      const pinyinChars = group.querySelectorAll('.pinyin .char');
      const singleChar = group.querySelector('.char:not(.pinyin .char)');

      if (pinyinChars.length > 0) {
        // Chinese character with pinyin
        const originalIndex = parseInt(pinyinChars[0].getAttribute('data-index') || '0');
        const char = this.currentText[originalIndex];
        const py = pinyin(char, { toneType: 'none' });
        const start = expectedPos;
        const end = expectedPos + py.length;
        
        groupMap.push({
          group,
          startPos: start,
          endPos: end,
          type: 'pinyin',
          expectedChars: py
        });
        expectedPos = end;
      } else if (singleChar) {
        const originalIndex = parseInt(singleChar.getAttribute('data-index') || '0');
        const expected = this.currentText[originalIndex];
        const start = expectedPos;
        const end = expectedPos + 1;
        
        groupMap.push({
          group,
          startPos: start,
          endPos: end,
          type: 'single',
          expectedChars: expected
        });
        expectedPos = end;
      }
    }

    // process input based on expected text positions
    let foundActive = false;
    
    for (const item of groupMap) {
      const { group, startPos, endPos, type, expectedChars } = item;

      if (type === 'pinyin' && expectedChars) {
        // Chinese character with pinyin
        if (inputLength >= startPos && inputLength < endPos) {
          if (!foundActive) {
            group.classList.add('active');
            this.updatePinyinChars(group, input.slice(startPos), expectedChars);
            foundActive = true;
            // Auto-scroll
            this.autoScrollToActive();
          }
          break;
        } else if (inputLength >= endPos) {
          // mark as completed
          this.updatePinyinChars(group, input.slice(startPos, endPos), expectedChars);
          const pinyinChars = group.querySelectorAll('.pinyin .char');
          pinyinChars.forEach(char => {
            const charEl = char as HTMLElement;
            if (charEl.classList.contains('correct')) {
              charEl.classList.add('typed');
            }
          });
        }
      } else if (type === 'single' && expectedChars) {
        if (inputLength === startPos) {
          // Currently at this character
          if (!foundActive) {
            group.classList.add('active');
            const singleChar = group.querySelector('.char:not(.pinyin .char)');
            if (singleChar) {
              // spaces check
              if (expectedChars === ' ') {
                singleChar.classList.add('space-char');
              }
              singleChar.classList.add('active');
            }
            foundActive = true;
            this.autoScrollToActive();
          }
          break;
        } else if (inputLength > startPos) {
          // Past this character - check if correct
          const actual = input[startPos];
          const singleChar = group.querySelector('.char:not(.pinyin .char)');
          if (singleChar) {
            // Handle space character specially - spaces should match spaces
            const isSpace = expectedChars === ' ' || expectedChars === '\u00A0'; // regular space or non-breaking space
            const actualIsSpace = actual === ' ' || actual === '\u00A0';
            
            if (actual === expectedChars || 
              (isSpace && actualIsSpace) || // Both are spaces
              (expectedChars === '，' && actual === ',') ||
              (expectedChars === '。' && actual === '.') ||
              (expectedChars === '！' && actual === '!') ||
              (expectedChars === '？' && actual === '?') ||
              (expectedChars === '；' && actual === ';')) {
              singleChar.classList.add('correct', 'typed');
              singleChar.classList.remove('incorrect');
            } else {
              singleChar.classList.add('incorrect', 'typed');
              singleChar.classList.remove('correct');
              this.errorCount++;
            }
            this.totalChars++;
          }
        }
      }
    }

    // Check if completed
    let isComplete = false;
    
    if (input.length >= expectedText.length) {
      isComplete = true;
    }

    else if (input === expectedText) {
      isComplete = true;
    }

    else if (input.trimEnd() === expectedText.trimEnd()) {
      isComplete = true;
    }
    
    if (isComplete && this.isActive) {
        this.isActive = false;
        // Cleanup pause detection
        this.cleanupPauseDetection();
        // Calculate actual time (excluding pause time)
        const actualTime = (Date.now() - this.startTime - this.totalPauseTime) / 1000; // seconds
        const timeElapsed = actualTime;
        const wpm = Math.round((expectedText.length / 5) / (timeElapsed / 60));
        const accuracy = this.totalChars > 0 
          ? ((1 - this.errorCount / this.totalChars) * 100).toFixed(1)
          : '100.0';
        
        // Create results
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'results-container';
        resultsContainer.innerHTML = `
          <div class="results">
            <h3>完成！</h3>
            <p>时间: ${timeElapsed.toFixed(1)}秒</p>
            <p>速度: ${wpm} WPM</p>
            <p>准确率: ${accuracy}%</p>
            <button id="restart-button">再试一次</button>
          </div>
        `;
        
        if (this.container) {
          // Remove any existing results container first
          const existingResults = this.container.querySelector('#results-container');
          if (existingResults) {
            existingResults.remove();
          }
          
          // Hide the words wrapper and input when showing results
          if (this.wordsWrapper) {
            this.wordsWrapper.style.display = 'none';
          }
          if (this.hiddenInput) {
            this.hiddenInput.style.display = 'none';
          }
          
          this.container.appendChild(resultsContainer);
          this.container.style.display = 'flex';
          
          const restartButton = resultsContainer.querySelector('#restart-button');
          if (restartButton) {
            restartButton.addEventListener('click', () => {
              resultsContainer.remove();
              // Show words wrapper and input again
              if (this.wordsWrapper) {
                this.wordsWrapper.style.display = 'flex';
              }
              if (this.hiddenInput) {
                this.hiddenInput.style.display = 'block';
              }
              this.onRestart();
            });
          }
        }
    }
  }

  private getExpectedText(): string {
    let result = '';
    for (let i = 0; i < this.currentText.length; i++) {
      const char = this.currentText[i];
      if (/[\u4e00-\u9fa5]/.test(char)) {
        // Chinese character - convert to pinyin
        const py = pinyin(char, { toneType: 'none' });
        result += py;
      } else {
        // Include all characters including spaces, newlines, etc.
        result += char;
      }
    }
    return result;
  }

  private updatePinyinChars(group: HTMLElement, input: string, expected: string): void {
    const chars = group.querySelectorAll('.pinyin .char');
    const expectedChars = Array.from(expected);
    let activeSet = false;

    chars.forEach((charEl, idx) => {
      // Remove all states first
      charEl.classList.remove('active', 'correct', 'incorrect');

      if (idx < input.length) {
        // Already typed - mark as correct or incorrect
        if (input[idx] === expectedChars[idx]) {
          charEl.classList.add('correct');
        } else {
          charEl.classList.add('incorrect');
        }
      } else if (idx === input.length && !activeSet) {
        // This is the current position - only set one active cursor
        charEl.classList.add('active');
        activeSet = true;
      }
    });
  }

  private autoScrollToActive(): void {
    if (!this.wordsWrapper) return;

    // Find the active word group
    const activeGroup = this.wordsWrapper.querySelector('.word-group.active') as HTMLElement;
    if (!activeGroup) return;

    // Get the position of the active group
    const activeRect = activeGroup.getBoundingClientRect();
    const wrapperRect = this.wordsWrapper.getBoundingClientRect();
    
    // Calculate which row the active group is on (based on top position)
    const activeTop = activeRect.top - wrapperRect.top + this.wordsWrapper.scrollTop;
    const rowHeight = activeRect.height + 24; // height + margin-bottom
    const currentRow = Math.floor(activeTop / rowHeight);
    
    // scroll settings - 3 rows
    const targetRowSet = Math.floor(currentRow / 3);
    const lastRowSet = Math.floor(this.lastScrolledRow / 3);
    
    if (targetRowSet > lastRowSet) {
      const scrollToRow = targetRowSet * 3;
      const scrollPosition = scrollToRow * rowHeight;
      
      this.wordsWrapper.scrollTo({
        top: Math.max(0, scrollPosition - 50), // 50px padding from top
        behavior: 'smooth'
      });
      
      this.lastScrolledRow = currentRow;
    } else if (this.lastScrolledRow === -1) {
      // First time - just ensure active is visible
      const scrollPosition = Math.max(0, activeTop - 50);
      this.wordsWrapper.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      this.lastScrolledRow = currentRow;
    }
  }

  private setupPauseDetection(): void {
    // PauseDetection : check for inactivity every 2 seconds
    this.pauseCheckInterval = window.setInterval(() => {
      if (!this.isActive || this.isPaused) return;
      
      const timeSinceLastInput = Date.now() - this.lastInputTime;
      if (timeSinceLastInput > 3000) {
        this.pause();
      }
    }, 2000);
  }

  private pause(): void {
    if (this.isPaused || !this.isActive) return;
    
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    
    if (this.hiddenInput) {
      this.hiddenInput.blur();
    }
    
    // Show pause menu
    this.showPauseMenu();
  }

  private resume(): void {
    if (!this.isPaused || !this.isActive) return;
    
    // Calculate pause duration
    const pauseDuration = Date.now() - this.pauseStartTime;
    this.totalPauseTime += pauseDuration;
    
    this.isPaused = false;
    this.lastInputTime = Date.now();
    
    this.hidePauseMenu();
    
    setTimeout(() => {
      this.hiddenInput?.focus();
    }, 100);
  }

  private showPauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.remove();
    }
    
    // Create pause menu
    this.pauseMenu = document.createElement('div');
    this.pauseMenu.id = 'pause-menu';
    this.pauseMenu.innerHTML = `
      <div class="pause-overlay">
        <div class="pause-content">
          <h3>已暂停</h3>
          <p>游戏已暂停</p>
          <button id="continue-button">继续</button>
        </div>
      </div>
    `;
    
    if (this.container) {
      this.container.appendChild(this.pauseMenu);
      
      // Add continue button handler
      const continueBtn = this.pauseMenu.querySelector('#continue-button');
      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          this.resume();
        });
      }
    }
  }

  private hidePauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.remove();
      this.pauseMenu = null;
    }
    // remove from DOM if it exists
    const pauseMenuInDOM = document.querySelector('#pause-menu');
    if (pauseMenuInDOM) {
      pauseMenuInDOM.remove();
    }
  }

  private cleanupPauseDetection(): void {
    if (this.pauseCheckInterval !== null) {
      clearInterval(this.pauseCheckInterval);
      this.pauseCheckInterval = null;
    }
  }
}
