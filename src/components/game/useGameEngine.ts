import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildGroupsView } from './groupsView.ts';
import {
  buildGroupMap,
  calculateConsistency,
  countInputUnits,
  getExpectedText,
  matchesExpected,
  normalizeInput,
  preprocessText
} from './text.ts';
import type { JyutpingListFn, Results, RomanizationMode, ScriptMode } from './types.ts';
import type { FormEvent, KeyboardEvent } from 'react';

type UseGameEngineOptions = {
  text: string | null;
  disableSpace: boolean;
  romanizationMode: RomanizationMode;
  scriptMode: ScriptMode;
  jyutpingList: JyutpingListFn;
  onRestart: () => void;
};

export const useGameEngine = ({
  text,
  disableSpace,
  romanizationMode,
  scriptMode,
  jyutpingList,
  onRestart
}: UseGameEngineOptions) => {
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

  const groupsView = useMemo(
    () => buildGroupsView(groupMap, inputValue, disableSpace),
    [groupMap, inputValue, disableSpace]
  );

  const unitCount = useMemo(() => countInputUnits(currentText), [currentText]);
  const wordLength = useMemo(
    () => (expectedText.length > 0 && unitCount > 0 ? expectedText.length / unitCount : 5),
    [expectedText.length, unitCount]
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
    document.body.addEventListener('click', focusHandler);
    document.body.addEventListener('touchstart', focusHandler, { passive: false });
    document.body.addEventListener('touchend', focusHandler, { passive: false });
    return () => {
      document.body.removeEventListener('click', focusHandler);
      document.body.removeEventListener('touchstart', focusHandler);
      document.body.removeEventListener('touchend', focusHandler);
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
        // wordLength = expectedText.length / unitCount
        // WPM = correctKeystrokes / wordLength / minutes
        // Raw WPM = totalKeystrokes / wordLength / minutes
      const wpm = Math.round((finalCorrect / wordLength) / (timeElapsed / 60));
      const accuracy =
        totalKeystrokes > 0 ? Math.max(0, (1 - errorCountRef.current / totalKeystrokes) * 100).toFixed(1) : '100.0';
      const rawWpm = Math.round((totalKeystrokes / wordLength) / (timeElapsed / 60));
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

  const handleInput = useCallback(
    (rawInput: string) => {
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
    },
    [expectedText, isActive, isPaused, jyutpingList, romanizationMode]
  );

  const handleInputEvent = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      handleInput((e.target as HTMLInputElement).value);
    },
    [handleInput]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onRestart();
      }
    },
    [onRestart]
  );

  const resume = useCallback(() => setIsPaused(false), []);

  return {
    inputRef,
    wrapperRef,
    inputValue,
    isPaused,
    results,
    groupsView,
    handleInputEvent,
    handleKeyDown,
    resume
  };
};
