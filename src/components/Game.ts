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
  private disableSpace: boolean = false;
  private keypressTimestamps: number[] = [];

  constructor(root: HTMLElement, onRestart: () => void) {
    this.root = root;
    this.onRestart = () => {
      this.resetGame();
      onRestart();
    };
  }

  /* Reset the game state */
  private resetGame(): void {
    this.isPaused = false;
    this.errorCount = 0;
    this.totalChars = 0;
    this.isActive = false;
    this.currentText = '';
    this.lastScrolledRow = -1;
    this.totalPauseTime = 0;
    this.lastInputTime = 0;
    this.keypressTimestamps = [];
    
    this.cleanupPauseDetection();
    
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    
    this.hidePauseMenu();
    
    const pauseMenuInDOM = document.querySelector('#pause-menu');
    if (pauseMenuInDOM) {
      pauseMenuInDOM.remove();
    }
    
    if (this.hiddenInput) {
      this.hiddenInput.oninput = null;
      this.hiddenInput.onkeydown = null;
      this.hiddenInput.value = '';
    }
    
    const existingResults = this.root.querySelector('#results-container');
    if (existingResults) {
      existingResults.remove();
    }
    
    if (this.container) {
      this.container.style.display = 'none';
    }
    
    if (this.pauseMenu) {
      this.pauseMenu.remove();
      this.pauseMenu = null;
    }
  }

  /* Initialize and start the game with the provided text */
  public start(text: string, options: { disableSpace?: boolean } = {}): void {
    // Preprocess text: replace 、 with ， and remove 「」『』
    text = text.replace(/、/g, '，').replace(/[「」『』]/g, '');

    this.disableSpace = !!options.disableSpace;
    this.isPaused = false;
    this.totalPauseTime = 0;
    this.pauseStartTime = 0;
    
    if (this.pauseMenu) {
      this.pauseMenu.remove();
      this.pauseMenu = null;
    }
    const pauseMenuInDOM = document.querySelector('#pause-menu');
    if (pauseMenuInDOM) {
      pauseMenuInDOM.remove();
    }
    
    this.errorCount = 0;
    this.totalChars = 0;
    this.currentText = text;
    this.isActive = true;
    this.startTime = Date.now();
    this.keypressTimestamps = [];
    this.lastScrolledRow = -1;
    
    const menu = this.root.querySelector('[id^="menu"]')?.parentElement;
    if (menu) {
      (menu as HTMLElement).style.display = 'none';
    }
    
    const existingResults = this.root.querySelector('#results-container');
    if (existingResults) {
      existingResults.remove();
    }
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'game-container';
      this.root.appendChild(this.container);
    }
    this.container.style.display = 'flex';
    
    if (this.wordsWrapper) {
      this.wordsWrapper.remove();
    }
    this.wordsWrapper = document.createElement('div');
    this.wordsWrapper.id = 'words-wrapper';
    this.wordsWrapper.style.display = 'flex';
    this.container.appendChild(this.wordsWrapper);
    
    if (this.hiddenInput) {
      this.hiddenInput.oninput = null;
      this.hiddenInput.onkeydown = null;
      this.hiddenInput.remove();
    }
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.id = 'hidden-input';
    this.hiddenInput.type = 'text';
    this.hiddenInput.value = '';
    this.hiddenInput.autocomplete = 'off';
    this.hiddenInput.setAttribute('autocorrect', 'off');
    this.hiddenInput.setAttribute('autocapitalize', 'off');
    this.hiddenInput.spellcheck = false;
    this.hiddenInput.style.display = 'block';
    this.container.appendChild(this.hiddenInput);
    
    this.renderWords(text);
    
    this.isPaused = false;
    this.totalPauseTime = 0;
    this.lastInputTime = Date.now();
    
    this.hiddenInput.oninput = () => {
      this.lastInputTime = Date.now();
      this.keypressTimestamps.push(this.lastInputTime);
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

  /* Render the text into the DOM structure */
  private renderWords(text: string): void {
    if (!this.wordsWrapper) return;

    this.wordGroups = [];
    const chars = Array.from(text);
    let isFirstGroup = true;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const isZh = /[\u4e00-\u9fa5]/.test(char);

      if (isZh) {
        const py = pinyin(char, { toneType: 'none', v: true });
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

        const pyChars = Array.from(py);
        pyChars.forEach((pyChar, idx) => {
          const charEl = document.createElement('span');
          charEl.className = 'char';
          charEl.textContent = pyChar;
          charEl.dataset.index = String(i);
          charEl.dataset.pinyinIndex = String(idx);
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
        const wordGroup = document.createElement('div');
        wordGroup.className = 'word-group';
        const shouldBeActive = isFirstGroup;
        if (shouldBeActive) {
          wordGroup.classList.add('active');
          isFirstGroup = false;
        }

        const charEl = document.createElement('div');
        charEl.className = 'char';
        if (char === ' ') {
          charEl.textContent = '';
          charEl.classList.add('space-char');
          charEl.setAttribute('data-space', 'true');
          if (this.disableSpace) {
            charEl.classList.add('disabled');
          }
        } else {
          charEl.textContent = char;
        }
        charEl.dataset.index = String(i);
        if (shouldBeActive) {
          charEl.classList.add('active');
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

  /* Convert input to standard format */
  private normalizeInput(input: string): string {
    let normalized = '';
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (/[\u4e00-\u9fa5]/.test(char)) {
        normalized += pinyin(char, { toneType: 'none', v: true });
      } else {
        normalized += char;
      }
    }
    return normalized;
  }

  /* Handle user input events */
  private handleInput(): void {
    if (!this.isActive || !this.hiddenInput) return;
    
    if (this.isNormalizing) return;

    const rawInput = this.hiddenInput.value;
    let input = this.normalizeInput(rawInput);
    
    if (rawInput !== input && this.hiddenInput) {
      this.isNormalizing = true;
      const cursorPos = this.hiddenInput.selectionStart || 0;
      const inputDiff = input.length - rawInput.length;
      this.hiddenInput.value = input;
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
    
    const expectedText = this.getExpectedText();
    const inputLength = input.length;
    
    this.wordGroups.forEach(group => {
      group.classList.remove('active');
      const chars = group.querySelectorAll('.char');
      chars.forEach(char => {
        char.classList.remove('correct', 'incorrect', 'typed', 'active');
      });
    });

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
        const originalIndex = parseInt(pinyinChars[0].getAttribute('data-index') || '0');
        const char = this.currentText[originalIndex];
        const py = pinyin(char, { toneType: 'none', v: true });
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
        
        // If space is disabled and this is a space, it takes 0 length input
        const isSpace = expected === ' ' || expected === '\u00A0';
        const charLength = (this.disableSpace && isSpace) ? 0 : 1;
        const end = expectedPos + charLength;
        
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

    let foundActive = false;
    
    for (const item of groupMap) {
      const { group, startPos, endPos, type, expectedChars } = item;

      if (type === 'pinyin' && expectedChars) {
        if (inputLength >= startPos && inputLength < endPos) {
          if (!foundActive) {
            group.classList.add('active');
            this.updatePinyinChars(group, input.slice(startPos), expectedChars);
            foundActive = true;
            this.autoScrollToActive();
          }
          break;
        } else if (inputLength >= endPos) {
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
        // Special handling for disabled spaces (length 0)
        if (this.disableSpace && (expectedChars === ' ' || expectedChars === '\u00A0') && startPos === endPos) {

           const singleChar = group.querySelector('.char:not(.pinyin .char)');
           if (singleChar) {
             singleChar.classList.add('correct', 'typed');
           }
           continue;
        }

        if (inputLength === startPos) {
          if (!foundActive) {
            group.classList.add('active');
            const singleChar = group.querySelector('.char:not(.pinyin .char)');
            if (singleChar) {
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
          const actual = input[startPos];
          const singleChar = group.querySelector('.char:not(.pinyin .char)');
          if (singleChar) {
            const isSpace = expectedChars === ' ' || expectedChars === '\u00A0';
            const actualIsSpace = actual === ' ' || actual === '\u00A0';
            
            if (actual === expectedChars || 
              (isSpace && actualIsSpace) ||
              (expectedChars === '，' && actual === ',') ||
              (expectedChars === '。' && actual === '.') ||
              (expectedChars === '！' && actual === '!') ||
              (expectedChars === '？' && actual === '?') ||
              (expectedChars === '：' && actual === ':') ||
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
        this.cleanupPauseDetection();
        const actualTime = (Date.now() - this.startTime - this.totalPauseTime) / 1000;
        const timeElapsed = Math.max(0.1, actualTime);
        
        // WPM
        const correctChars = Math.max(0, this.totalChars - this.errorCount);
        const wpm = Math.round((correctChars / 5) / (timeElapsed / 60));
        
        const accuracy = this.totalChars > 0 
          ? ((1 - this.errorCount / this.totalChars) * 100).toFixed(1)
          : '100.0';
          
        // Additional Stats
        // Raw WPM
        const rawWpm = Math.round((this.totalChars / 5) / (timeElapsed / 60));
        const incorrectChars = this.errorCount;

        // Consistency & AFK
        let afkMs = 0;
        const sortedTimestamps = [...this.keypressTimestamps].sort((a, b) => a - b);
        
        if (sortedTimestamps.length > 0) {
          // Check initial gap
          if (sortedTimestamps[0] - this.startTime > 2000) {
            afkMs += (sortedTimestamps[0] - this.startTime);
          }
          // Check gaps between keypresses
          for (let i = 1; i < sortedTimestamps.length; i++) {
            const gap = sortedTimestamps[i] - sortedTimestamps[i-1];
            if (gap > 2000) {
               afkMs += gap;
            }
          }
        }
        
        // Adjust AFK time by subtracting pause time (authorized idle)
        afkMs = Math.max(0, afkMs - this.totalPauseTime);
        
        const totalActiveTimeMs = timeElapsed * 1000;
        const afkPercentage = totalActiveTimeMs > 0 ? Math.min(100, (afkMs / totalActiveTimeMs) * 100).toFixed(2) : '0.00';

        const durationMs = Date.now() - this.startTime;
        const numBuckets = Math.max(1, Math.ceil(durationMs / 1000));
        const bucketCounts = new Array(numBuckets).fill(0);
        
        sortedTimestamps.forEach(ts => {
            const relativeTime = ts - this.startTime;
            const bucketIndex = Math.min(numBuckets - 1, Math.floor(relativeTime / 1000));
            bucketCounts[bucketIndex]++;
        });
        
        const bucketWpms = bucketCounts.map(count => (count / 5) * 60);
        const mean = bucketWpms.reduce((a, b) => a + b, 0) / bucketWpms.length || 1;
        const variance = bucketWpms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bucketWpms.length;
        const stdDev = Math.sqrt(variance);
        let consistency = 0;
        if (mean > 0) {
            const cv = stdDev / mean;
            consistency = Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
        }
        
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'results-container';
        resultsContainer.innerHTML = `
          <div class="results">
            <div class="results-grid">
              <div class="result-main">
                <div class="result-group big">
                  <div class="result-label">wpm</div>
                  <div class="result-val main-color">${wpm}</div>
                </div>
                <div class="result-group big">
                  <div class="result-label">acc</div>
                  <div class="result-val main-color">${accuracy}%</div>
                </div>
              </div>
              
              <div class="result-stats">
                <div class="result-group small">
                   <div class="result-label">raw</div>
                   <div class="result-val main-color">${rawWpm}</div>
                </div>
                <div class="result-group small">
                   <div class="result-label">characters</div>
                   <div class="result-val">${correctChars}/${incorrectChars}/0/0</div>
                </div>
                <div class="result-group small">
                   <div class="result-label">consistency</div>
                   <div class="result-val">${consistency}%</div>
                </div>
                <div class="result-group small">
                   <div class="result-label">time</div>
                   <div class="result-val">${timeElapsed.toFixed(1)}s</div>
                   <div class="result-sub-val">${afkPercentage}% afk</div>
                </div>
              </div>
            </div>
            <button id="restart-button">再试一次</button>
          </div>
        `;
        
        if (this.container) {
          const existingResults = this.container.querySelector('#results-container');
          if (existingResults) {
            existingResults.remove();
          }
          
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

  /* Get the full expected pinyin/text string */
  private getExpectedText(): string {
    let result = '';
    for (let i = 0; i < this.currentText.length; i++) {
      const char = this.currentText[i];
      if (/[\u4e00-\u9fa5]/.test(char)) {
        const py = pinyin(char, { toneType: 'none', v: true });
        result += py;
      } else {
        result += char;
      }
    }
    return result;
  }

  /* Update the visual state of pinyin characters */
  private updatePinyinChars(group: HTMLElement, input: string, expected: string): void {
    const chars = group.querySelectorAll('.pinyin .char');
    const expectedChars = Array.from(expected);
    let activeSet = false;

    chars.forEach((charEl, idx) => {
      charEl.classList.remove('active', 'correct', 'incorrect');

      if (idx < input.length) {
        if (input[idx] === expectedChars[idx]) {
          charEl.classList.add('correct');
        } else {
          charEl.classList.add('incorrect');
        }
      } else if (idx === input.length && !activeSet) {
        charEl.classList.add('active');
        activeSet = true;
      }
    });
  }

  /* Automatically scroll to keep the active word in view */
  private autoScrollToActive(): void {
    if (!this.wordsWrapper) return;

    const activeGroup = this.wordsWrapper.querySelector('.word-group.active') as HTMLElement;
    if (!activeGroup) return;

    const activeRect = activeGroup.getBoundingClientRect();
    const wrapperRect = this.wordsWrapper.getBoundingClientRect();
    
    const activeTop = activeRect.top - wrapperRect.top + this.wordsWrapper.scrollTop;
    const rowHeight = activeRect.height + 24;
    const currentRow = Math.floor(activeTop / rowHeight);
    
    const targetRowSet = Math.floor(currentRow / 3);
    const lastRowSet = Math.floor(this.lastScrolledRow / 3);
    
    if (targetRowSet > lastRowSet) {
      const scrollToRow = targetRowSet * 3;
      const scrollPosition = scrollToRow * rowHeight;
      
      this.wordsWrapper.scrollTo({
        top: Math.max(0, scrollPosition - 50),
        behavior: 'smooth'
      });
      
      this.lastScrolledRow = currentRow;
    } else if (this.lastScrolledRow === -1) {
      const scrollPosition = Math.max(0, activeTop - 50);
      this.wordsWrapper.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      this.lastScrolledRow = currentRow;
    }
  }

  /* Set up idle detection for auto-pausing */
  private setupPauseDetection(): void {
    this.pauseCheckInterval = window.setInterval(() => {
      if (!this.isActive || this.isPaused) return;
      
      const timeSinceLastInput = Date.now() - this.lastInputTime;
      if (timeSinceLastInput > 6000) {
        this.pause();
      }
    }, 2000);
  }

  /* Pause the game */
  private pause(): void {
    if (this.isPaused || !this.isActive) return;
    
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    
    if (this.hiddenInput) {
      this.hiddenInput.blur();
    }
    
    this.showPauseMenu();
  }

  /* Resume the game */
  private resume(): void {
    if (!this.isPaused || !this.isActive) return;
    
    const pauseDuration = Date.now() - this.pauseStartTime;
    this.totalPauseTime += pauseDuration;
    
    this.isPaused = false;
    this.lastInputTime = Date.now();
    
    this.hidePauseMenu();
    
    setTimeout(() => {
      this.hiddenInput?.focus();
    }, 100);
  }

  /* Display the pause menu overlay */
  private showPauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.remove();
    }
    
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
      
      const continueBtn = this.pauseMenu.querySelector('#continue-button');
      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          this.resume();
        });
      }
    }
  }

  /* Hide the pause menu */
  private hidePauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.remove();
      this.pauseMenu = null;
    }
    const pauseMenuInDOM = document.querySelector('#pause-menu');
    if (pauseMenuInDOM) {
      pauseMenuInDOM.remove();
    }
  }

  /* Clean up pause detection intervals */
  private cleanupPauseDetection(): void {
    if (this.pauseCheckInterval !== null) {
      clearInterval(this.pauseCheckInterval);
      this.pauseCheckInterval = null;
    }
  }
}
