import { pinyin } from 'pinyin-pro';
import { toSimplified, toTraditional } from '../../lib/converters/script.ts';
import type { GroupMapItem, JyutpingListFn, RomanizationMode, ScriptMode } from './types.ts';

const isChineseChar = (char: string) => /[\u4e00-\u9fa5]/.test(char);

const toPinyin = (char: string) => pinyin(char, { toneType: 'none', v: true });

const stripJyutpingTones = (text: string) => text.replace(/[1-6]/g, '');

const getJyutpingAt = (list: [string, string | null][], index: number, fallback: string) => {
  const jyutping = list[index]?.[1];
  return jyutping ? stripJyutpingTones(jyutping.replace(/\s+/g, '')) : fallback;
};

const getTraditionalText = (text: string) => toTraditional(text);

const getDisplayText = (text: string, scriptMode: ScriptMode) => {
  const traditional = getTraditionalText(text);
  return scriptMode === 'traditional' ? traditional : toSimplified(traditional);
};

export const countInputUnits = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) return tokens.length;
  const chineseCount = Array.from(trimmed).filter(isChineseChar).length;
  return chineseCount > 0 ? chineseCount : 1;
};

export const preprocessText = (text: string) => text.replace(/、/g, '，').replace(/[「」『』]/g, '');

export const normalizeInput = (input: string, romanizationMode: RomanizationMode, jyutpingList: JyutpingListFn) => {
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

export const isAcceptedPunctuation = (expected: string, actual: string) =>
  (expected === '，' && actual === ',') ||
  (expected === '。' && actual === '.') ||
  (expected === '！' && actual === '!') ||
  (expected === '？' && actual === '?') ||
  (expected === '：' && actual === ':') ||
  (expected === '；' && actual === ';');

export const matchesExpected = (expected: string, actual: string) =>
  expected === actual || isAcceptedPunctuation(expected, actual);

export const buildGroupMap = (
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
  const jyutpingListEntries = romanizationMode === 'jyutping' ? jyutpingList(traditionalText) : [];
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

export const getExpectedText = (
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
  const jyutpingListEntries = romanizationMode === 'jyutping' ? jyutpingList(traditionalText) : [];
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

export const calculateConsistency = (timestamps: number[], startTime: number) => {
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
