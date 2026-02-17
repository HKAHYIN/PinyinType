# PinyinType

A modern typing practice tool supporting both **Mandarin Pinyin** (汉语拼音) and **Cantonese Jyutping** (粤语拼音), with flexible Simplified/Traditional Chinese display.

一款现代化的打字练习工具，支持**汉语拼音**和**粤语拼音**双模式，可自由切换简繁体显示。

Website: https://hkahyin.github.io/PinyinType/

---

## Features | 功能特色

### Dual Romanization Systems | 双拼音系统
- **Mandarin Pinyin (汉语拼音)** - Standard Mandarin romanization
- **Cantonese Jyutping (粤语拼音)** - Hong Kong Cantonese romanization with context-aware pronunciation

### Flexible Script Display | 灵活的文字显示
- **Simplified Chinese (简体中文)** - For Mainland users
- **Traditional Chinese (繁体中文)** - For Hong Kong/Taiwan users
- Automatic internal conversion improves romanization accuracy for mixed script input

### Smart Conversion | 智能转换
- Powered by libraries: `pinyin-pro` & `to-jyutping`
- Supports both simplified and traditional input text

---

## Tech Stack | 技术栈

**Frontend**
- Vite + React 18 + TypeScript
- CSS (no frameworks)

**Romanization Libraries**
- `pinyin-pro` - Mandarin pinyin conversion
- `to-jyutping` - Cantonese jyutping conversion
- `opencc-js` - Simplified ↔ Traditional Chinese conversion

---

## Usage | 使用方法

1. **Select Romanization Mode | 选择拼音模式**  
   Choose between Mandarin Pinyin (拼音) or Cantonese Jyutping (粵拼)

2. **Choose Display Script | 选择文字显示**  
   Toggle between Simplified (简体) or Traditional (繁體) Chinese

3. **Start Typing | 开始练习**  
   Type the romanization for displayed characters

---

## License | 许可证

This project uses the following open-source libraries:
- `pinyin-pro` (MIT License)
- `to-jyutping` (MIT License)
- `opencc-js` (Apache 2.0 License)

***
