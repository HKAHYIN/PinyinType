import type { GroupMapItem, PinyinGroupView, SingleGroupView } from './types.ts';
import { isAcceptedPunctuation } from './text.ts';

export const buildGroupsView = (
  groupMap: GroupMapItem[],
  inputValue: string,
  disableSpace: boolean
): (PinyinGroupView | SingleGroupView)[] => {
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
};
