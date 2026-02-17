import { useEffect, useMemo, useRef, useState } from 'react';
import { pinyin } from 'pinyin-pro';
import { toSimplified, toTraditional } from '../lib/converters/script.ts';

type RomanizationMode = 'pinyin' | 'jyutping';
type ScriptMode = 'simplified' | 'traditional';
type JyutpingListFn = (text: string) => [string, string | null][];

type GameProps = {
  text: string | null;
  disableSpace: boolean;
  onRestart: () => void;
  visible: boolean;
  romanizationMode: RomanizationMode;
  scriptMode: ScriptMode;
  jyutpingList: JyutpingListFn;
};

type GroupMapItem = {
  type: 'pinyin' | 'single';
  index: number;
  hanzi?: string;
  pinyinText?: string;
  char?: string;
  isSpace?: boolean;
  startPos: number;
  endPos: number;
};

type Results = {
  wpm: number;
  accuracy: string;
  rawWpm: number;
  finalCorrect: number;
  finalIncorrect: number;
  finalExtra: number;
  finalMissed: number;
  timeElapsed: number;
  afkPercentage: string;
  consistency: number;
};

type PinyinGroupView = {
  type: 'pinyin';
  key: string;
  className: string;
  hanzi: string;
  pinyinChars: { char: string; className: string }[];
};

type SingleGroupView = {
  type: 'single';
  key: string;
  className: string;
  singleChar: string;
  charClass: string;
};

const isChineseChar = (char: string) => /[\u4e00-\u9fa5]/.test(char);

const toPinyin = (char: string) => pinyin(char, { toneType: 'none', v: true });

const stripJyutpingTones = (text: string) => text.replace(/[1-6]/g, '');

const getJyutpingList = (text: string, jyutpingList: JyutpingListFn) => jyutpingList(text);

const getJyutpingAt = (list: [string, string | null][], index: number, fallback: string) => {
  const jyutping = list[index]?.[1];
  return jyutping ? stripJyutpingTones(jyutping.replace(/\s+/g, '')) : fallback;
};

const getTraditionalText = (text: string) => toTraditional(text);

const getDisplayText = (text: string, scriptMode: ScriptMode) => {
  const traditional = getTraditionalText(text);
  return scriptMode === 'traditional' ? traditional : toSimplified(traditional);
};

const preprocessText = (text: string) => text.replace(/、/g, '，').replace(/[「」『』]/g, '');

const normalizeInput = (input: string, romanizationMode: RomanizationMode, jyutpingList: JyutpingListFn) => {
  let normalized = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (isChineseChar(char)) {
      const traditionalChar = getTraditionalText(char);
      if (romanizationMode === 'pinyin') {
        normalized += toPinyin(traditionalChar);
      } else {
        const jyutping = jyutpingList(traditionalChar)[0]?.[1] ?? null;
        normalized += jyutping ? stripJyutpingTones(jyutping.replace(/\s+/g, '')) : traditionalChar;
      }
    } else {
      normalized += char;
    }
  }
  if (romanizationMode === 'jyutping') {
    normalized = stripJyutpingTones(normalized);
  }
  return normalized;
};

const isAcceptedPunctuation = (expected: string, actual: string) =>
  (expected === '，' && actual === ',') ||
  (expected === '。' && actual === '.') ||
  (expected === '！' && actual === '!') ||
  (expected === '？' && actual === '?') ||
  (expected === '：' && actual === ':') ||
  (expected === '；' && actual === ';');

const matchesExpected = (expected: string, actual: string) =>
  expected === actual || isAcceptedPunctuation(expected, actual);

const buildGroupMap = (
  text: string,
  disableSpace: boolean,
  romanizationMode: RomanizationMode,
  scriptMode: ScriptMode,
  jyutpingList: JyutpingListFn
): GroupMapItem[] => {
  const traditionalText = getTraditionalText(text);
  const displayText = getDisplayText(text, scriptMode);
  const displayChars = Array.from(displayText);
  const romanizationChars = Array.from(traditionalText);
  const jyutpingListEntries = romanizationMode === 'jyutping' ? getJyutpingList(traditionalText, jyutpingList) : [];
  const groups: GroupMapItem[] = [];
  let expectedPos = 0;
  for (let i = 0; i < displayChars.length; i++) {
    const displayChar = displayChars[i];
    const romanizationChar = romanizationChars[i] ?? displayChar;
    const isZh = isChineseChar(romanizationChar);
    if (isZh) {
      const romanized =
        romanizationMode === 'pinyin'
          ? toPinyin(romanizationChar)
          : getJyutpingAt(jyutpingListEntries, i, romanizationChar);
      const startPos = expectedPos;
      const endPos = expectedPos + romanized.length;
      groups.push({
        type: 'pinyin',
        index: i,
        hanzi: displayChar,
        pinyinText: romanized,
        startPos,
        endPos
      });
      expectedPos = endPos;
      continue;
    }
    if (displayChar.trim() || displayChar === ' ') {
      const isSpace = displayChar === ' ' || displayChar === '\u00A0';
      const charLength = disableSpace && isSpace ? 0 : 1;
      const startPos = expectedPos;
      const endPos = expectedPos + charLength;
      groups.push({
        type: 'single',
        index: i,
        char: displayChar,
        isSpace,
        startPos,
        endPos
      });
      expectedPos = endPos;
    }
  }
  return groups;
};

const getExpectedText = (
  text: string,
  disableSpace: boolean,
  romanizationMode: RomanizationMode,
  scriptMode: ScriptMode,
  jyutpingList: JyutpingListFn
) => {
  const traditionalText = getTraditionalText(text);
  const displayText = getDisplayText(text, scriptMode);
  const displayChars = Array.from(displayText);
  const romanizationChars = Array.from(traditionalText);
  const jyutpingListEntries = romanizationMode === 'jyutping' ? getJyutpingList(traditionalText, jyutpingList) : [];
  let result = '';
  for (let i = 0; i < displayChars.length; i++) {
    const displayChar = displayChars[i];
    const romanizationChar = romanizationChars[i] ?? displayChar;
    if (isChineseChar(romanizationChar)) {
      result +=
        romanizationMode === 'pinyin'
          ? toPinyin(romanizationChar)
          : getJyutpingAt(jyutpingListEntries, i, romanizationChar);
    } else if (displayChar === ' ') {
      if (!disableSpace) result += displayChar;
    } else if (displayChar.trim()) {
      result += displayChar;
    }
  }
  return result;
};

const calculateConsistency = (timestamps: number[], startTime: number) => {
  const durationMs = Date.now() - startTime;
  const numBuckets = Math.max(1, Math.ceil(durationMs / 1000));
  const bucketCounts = new Array(numBuckets).fill(0);
  timestamps.forEach((ts) => {
    const bucketIndex = Math.min(numBuckets - 1, Math.floor((ts - startTime) / 1000));
    bucketCounts[bucketIndex]++;
  });
  const bucketWpms = bucketCounts.map((count) => (count / 5) * 60);
  const mean = bucketWpms.reduce((a, b) => a + b, 0) / bucketWpms.length || 1;
  const variance = bucketWpms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bucketWpms.length;
  const stdDev = Math.sqrt(variance);
  return mean > 0 ? Math.max(0, Math.min(100, Math.round(100 * (1 - stdDev / mean)))) : 0;
};

export function Game({
  text,
  disableSpace,
  onRestart,
  visible,
  romanizationMode,
  scriptMode,
  jyutpingList
}: GameProps) {
  const [currentText, setCurrentText] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<Results | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isNormalizingRef = useRef(false);
  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const startTimeRef = useRef(0);
  const lastInputTimeRef = useRef(0);
  const keypressTimestampsRef = useRef<number[]>([]);
  const errorCountRef = useRef(0);
  const previousInputRef = useRef('');
  const pauseCheckIntervalRef = useRef<number | null>(null);

  const expectedText = useMemo(
    () =>
      currentText ? getExpectedText(currentText, disableSpace, romanizationMode, scriptMode, jyutpingList) : '',
    [currentText, disableSpace, romanizationMode, scriptMode, jyutpingList]
  );

  const groupMap = useMemo(
    () => buildGroupMap(currentText, disableSpace, romanizationMode, scriptMode, jyutpingList),
    [currentText, disableSpace, romanizationMode, scriptMode, jyutpingList]
  );

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!text) {
      setCurrentText('');
      setIsActive(false);
      setIsPaused(false);
      setInputValue('');
      setResults(null);
      keypressTimestampsRef.current = [];
      errorCountRef.current = 0;
      previousInputRef.current = '';
      if (pauseCheckIntervalRef.current !== null) {
        clearInterval(pauseCheckIntervalRef.current);
        pauseCheckIntervalRef.current = null;
      }
      return;
    }
    const processed = preprocessText(text);
    setCurrentText(processed);
    setIsActive(true);
    setIsPaused(false);
    setInputValue('');
    setResults(null);
    startTimeRef.current = Date.now();
    lastInputTimeRef.current = Date.now();
    keypressTimestampsRef.current = [];
    errorCountRef.current = 0;
    previousInputRef.current = '';
    if (pauseCheckIntervalRef.current !== null) {
      clearInterval(pauseCheckIntervalRef.current);
    }
    pauseCheckIntervalRef.current = window.setInterval(() => {
      if (!isActiveRef.current || isPausedRef.current) return;
      const timeSinceLastInput = Date.now() - lastInputTimeRef.current;
      if (timeSinceLastInput > 6000) {
        setIsPaused(true);
      }
    }, 2000);
  }, [text]);

  useEffect(() => {
    if (!isPaused && isActive) {
      lastInputTimeRef.current = Date.now();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isPaused, isActive]);

  useEffect(() => {
    const handler = () => {
      if (document.hidden && isActive && !isPaused) {
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isActive, isPaused]);

  useEffect(() => {
    const focusHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        ['BUTTON', 'INPUT', 'A', 'LABEL'].includes(target.tagName) ||
        target.classList.contains('slider') ||
        target.closest('button, .header-controls, .menu-bar')
      ) {
        return;
      }
      const isTouch = e.type === 'touchstart' || e.type === 'touchend';
      if (isTouch) {
        if (!target.closest('#game-container, #results-container')) return;
        if (e.cancelable) e.preventDefault();
      }
      if (isActive && !isPaused) {
        inputRef.current?.focus();
      }
    };
    const preventContext = (e: Event) => {
      e.preventDefault();
      return false;
    };
    document.body.addEventListener('click', focusHandler);
    document.body.addEventListener('touchstart', focusHandler, { passive: false });
    document.body.addEventListener('touchend', focusHandler, { passive: false });
    document.body.addEventListener('contextmenu', preventContext);
    return () => {
      document.body.removeEventListener('click', focusHandler);
      document.body.removeEventListener('touchstart', focusHandler);
      document.body.removeEventListener('touchend', focusHandler);
      document.body.removeEventListener('contextmenu', preventContext);
    };
  }, [isActive, isPaused]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const activeGroup = wrapperRef.current.querySelector('.word-group.active') as HTMLElement | null;
    if (!activeGroup) return;
    const activeRect = activeGroup.getBoundingClientRect();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const relativeTop = activeRect.top - wrapperRect.top;
    const isMobile = window.innerWidth <= 1366 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const thresholdRatio = isMobile ? 0.2 : 0.5;
    const threshold = wrapperRect.height * thresholdRatio;
    if (relativeTop > threshold || relativeTop < 0) {
      const scrollTop = wrapperRef.current.scrollTop;
      const targetRatio = isMobile ? 0.05 : 0.3;
      const targetTop = scrollTop + relativeTop - wrapperRect.height * targetRatio;
      wrapperRef.current.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
    }
  }, [inputValue, groupMap.length]);

  useEffect(() => {
    if (!isActive) return;
    if (inputValue.length >= expectedText.length && expectedText.length > 0) {
      setIsActive(false);
      if (pauseCheckIntervalRef.current !== null) {
        clearInterval(pauseCheckIntervalRef.current);
        pauseCheckIntervalRef.current = null;
      }
      const actualTime = (Date.now() - startTimeRef.current) / 1000;
      const timeElapsed = Math.max(0.1, actualTime);
      const totalKeystrokes = keypressTimestampsRef.current.length;
      let finalCorrect = 0;
      let finalIncorrect = 0;
      const checkLen = Math.min(inputValue.length, expectedText.length);
      for (let i = 0; i < checkLen; i++) {
        if (matchesExpected(expectedText[i], inputValue[i])) finalCorrect++;
        else finalIncorrect++;
      }
      const finalExtra = Math.max(0, inputValue.length - expectedText.length);
      const finalMissed = Math.max(0, expectedText.length - inputValue.length);
      const wpm = Math.round((finalCorrect / 5) / (timeElapsed / 60));
      const accuracy =
        totalKeystrokes > 0 ? Math.max(0, (1 - errorCountRef.current / totalKeystrokes) * 100).toFixed(1) : '100.0';
      const rawWpm = Math.round((totalKeystrokes / 5) / (timeElapsed / 60));
      let afkMs = 0;
      const sortedTimestamps = [...keypressTimestampsRef.current].sort((a, b) => a - b);
      if (sortedTimestamps.length > 0) {
        if (sortedTimestamps[0] - startTimeRef.current > 2000) {
          afkMs += sortedTimestamps[0] - startTimeRef.current;
        }
        for (let i = 1; i < sortedTimestamps.length; i++) {
          const gap = sortedTimestamps[i] - sortedTimestamps[i - 1];
          if (gap > 2000) afkMs += gap;
        }
      }
      const afkPercentage =
        timeElapsed > 0 ? Math.min(100, (afkMs / (timeElapsed * 1000)) * 100).toFixed(2) : '0.00';
      const consistency = calculateConsistency(sortedTimestamps, startTimeRef.current);
      setResults({
        wpm,
        accuracy,
        rawWpm,
        finalCorrect,
        finalIncorrect,
        finalExtra,
        finalMissed,
        timeElapsed,
        afkPercentage,
        consistency
      });
    }
  }, [inputValue, expectedText, isActive]);

  useEffect(() => {
    return () => {
      if (pauseCheckIntervalRef.current !== null) {
        clearInterval(pauseCheckIntervalRef.current);
      }
    };
  }, []);

  const handleInput = (rawInput: string) => {
    if (!isActive) return;
    if (isNormalizingRef.current) return;
    const normalized = normalizeInput(rawInput, romanizationMode, jyutpingList);
    if (rawInput !== normalized && inputRef.current) {
      isNormalizingRef.current = true;
      const cursorPos = inputRef.current.selectionStart || 0;
      const inputDiff = normalized.length - rawInput.length;
      inputRef.current.value = normalized;
      const newPos = Math.max(0, Math.min(cursorPos + inputDiff, normalized.length));
      inputRef.current.setSelectionRange(newPos, newPos);
      setTimeout(() => {
        isNormalizingRef.current = false;
        handleInput(normalized);
      }, 10);
      return;
    }
    if (normalized.length > previousInputRef.current.length) {
      for (let i = previousInputRef.current.length; i < normalized.length; i++) {
        if (i >= expectedText.length || !matchesExpected(expectedText[i], normalized[i])) {
          errorCountRef.current++;
        }
      }
    }
    previousInputRef.current = normalized;
    setInputValue(normalized);
    lastInputTimeRef.current = Date.now();
    keypressTimestampsRef.current.push(lastInputTimeRef.current);
    if (isPaused) {
      setIsPaused(false);
    }
  };

  const groupsView = useMemo<(PinyinGroupView | SingleGroupView)[]>(() => {
    const inputLength = inputValue.length;
    let foundActive = false;
    return groupMap.map((item, idx) => {
      if (item.type === 'pinyin' && item.pinyinText) {
        const pinyinChars = Array.from(item.pinyinText).map((char) => ({
          char,
          className: 'char'
        }));
        let groupActive = false;
        if (inputLength >= item.startPos && inputLength < item.endPos) {
          groupActive = !foundActive;
          if (groupActive) foundActive = true;
          const slice = inputValue.slice(item.startPos);
          const expectedChars = Array.from(item.pinyinText);
          for (let i = 0; i < pinyinChars.length; i++) {
            if (i < slice.length) {
              pinyinChars[i].className += slice[i] === expectedChars[i] ? ' correct' : ' incorrect';
            } else if (i === slice.length && groupActive) {
              pinyinChars[i].className += ' active';
            }
          }
        } else if (inputLength >= item.endPos) {
          const slice = inputValue.slice(item.startPos, item.endPos);
          const expectedChars = Array.from(item.pinyinText);
          for (let i = 0; i < pinyinChars.length; i++) {
            if (i < slice.length) {
              if (slice[i] === expectedChars[i]) {
                pinyinChars[i].className += ' correct typed';
              } else {
                pinyinChars[i].className += ' incorrect';
              }
            }
          }
        }
        return {
          type: 'pinyin',
          key: `p-${item.index}-${idx}`,
          className: `word-group${groupActive ? ' active' : ''}`,
          hanzi: item.hanzi || '',
          pinyinChars
        };
      }
      const isSpace = !!item.isSpace;
      const singleChar = item.char || '';
      let groupActive = false;
      let charClass = 'char';
      if (isSpace) {
        charClass += ' space-char';
        if (disableSpace) charClass += ' disabled';
      }
      if (disableSpace && isSpace && item.startPos === item.endPos) {
        charClass += ' correct typed';
      } else if (inputLength === item.startPos && !foundActive) {
        groupActive = true;
        foundActive = true;
        charClass += ' active';
      } else if (inputLength > item.startPos) {
        const actual = inputValue[item.startPos];
        const actualIsSpace = actual === ' ' || actual === '\u00A0';
        if (actual === singleChar || (isSpace && actualIsSpace) || isAcceptedPunctuation(singleChar, actual)) {
          charClass += ' correct typed';
        } else {
          charClass += ' incorrect typed';
        }
      }
      return {
        type: 'single',
        key: `s-${item.index}-${idx}`,
        className: `word-group${groupActive ? ' active' : ''}`,
        singleChar,
        charClass
      };
    });
  }, [groupMap, inputValue, disableSpace]);

  return (
    <div id="game-container" className="no-select" style={{ display: visible ? 'flex' : 'none' }}>
      {!results && (
        <div id="words-wrapper" ref={wrapperRef} style={{ display: visible ? 'flex' : 'none' }}>
          {groupsView.map((group) =>
            group.type === 'pinyin' ? (
              <div className={group.className} key={group.key}>
                <div className="hanzi">{group.hanzi}</div>
                <div className="pinyin">
                  {group.pinyinChars.map((char, i) => (
                    <span className={char.className} key={`${group.key}-py-${i}`}>
                      {char.char}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className={group.className} key={group.key}>
                <div className={group.charClass} data-space={group.singleChar === ' ' ? 'true' : undefined}>
                  {group.singleChar === ' ' ? '' : group.singleChar}
                </div>
              </div>
            )
          )}
        </div>
      )}
      <input
        ref={inputRef}
        id="hidden-input"
        type="text"
        autoComplete="off"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        enterKeyHint="done"
        style={{ display: results ? 'none' : 'block' }}
        value={inputValue}
        onInput={(e) => handleInput((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onRestart();
          }
        }}
      />
      {isPaused && (
        <div id="pause-menu">
          <div className="pause-overlay">
            <div className="pause-content">
              <h3>已暂停</h3>
              <p>游戏已暂停</p>
              <button id="continue-button" onClick={() => setIsPaused(false)}>
                继续
              </button>
            </div>
          </div>
        </div>
      )}
      {results && (
        <div id="results-container">
          <div className="results">
            <div className="results-grid">
              <div className="result-main">
                <div className="result-group big">
                  <div className="result-label">wpm</div>
                  <div className="result-val main-color">{results.wpm}</div>
                </div>
                <div className="result-group big">
                  <div className="result-label">acc</div>
                  <div className="result-val main-color">{results.accuracy}%</div>
                </div>
              </div>
              <div className="result-stats">
                <div className="result-group small">
                  <div className="result-label">raw</div>
                  <div className="result-val main-color">{results.rawWpm}</div>
                </div>
                <div className="result-group small">
                  <div className="result-label">characters</div>
                  <div className="result-val">
                    {results.finalCorrect}/{results.finalIncorrect}/{results.finalExtra}/{results.finalMissed}
                  </div>
                </div>
                <div className="result-group small">
                  <div className="result-label">consistency</div>
                  <div className="result-val">{results.consistency}%</div>
                </div>
                <div className="result-group small">
                  <div className="result-label">time</div>
                  <div className="result-val">{results.timeElapsed.toFixed(1)}s</div>
                  <div className="result-sub-val">{results.afkPercentage}% afk</div>
                </div>
              </div>
            </div>
            <button id="restart-button" onClick={onRestart}>
              再试一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
