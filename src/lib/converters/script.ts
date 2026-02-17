import * as OpenCC from 'opencc-js';

const toTraditionalConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
const toSimplifiedConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });

export const toTraditional = (text: string): string => {
  try {
    return String(toTraditionalConverter(text));
  } catch {
    return text;
  }
};

export const toSimplified = (text: string): string => {
  try {
    return String(toSimplifiedConverter(text));
  } catch {
    return text;
  }
};
