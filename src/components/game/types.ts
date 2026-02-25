export type RomanizationMode = 'pinyin' | 'jyutping';
export type ScriptMode = 'simplified' | 'traditional';
export type JyutpingListFn = (text: string) => [string, string | null][];

export type GameProps = {
  text: string | null;
  disableSpace: boolean;
  onRestart: () => void;
  visible: boolean;
  romanizationMode: RomanizationMode;
  scriptMode: ScriptMode;
  jyutpingList: JyutpingListFn;
};

export type GroupMapItem = {
  type: 'pinyin' | 'single';
  index: number;
  hanzi?: string;
  pinyinText?: string;
  char?: string;
  isSpace?: boolean;
  startPos: number;
  endPos: number;
};

export type Results = {
  wpm: number;
  accuracy: string;
  rawWpm: number;
  finalCorrect: number;
  finalIncorrect: number;
  timeElapsed: number;
  afkPercentage: string;
  consistency: number;
};

export type PinyinGroupView = {
  type: 'pinyin';
  key: string;
  className: string;
  hanzi: string;
  pinyinChars: { char: string; className: string }[];
};

export type SingleGroupView = {
  type: 'single';
  key: string;
  className: string;
  singleChar: string;
  charClass: string;
};
