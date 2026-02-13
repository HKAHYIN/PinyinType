import { useState } from 'react';
import { ARTICLES } from '../data/articles';
import { VOCABULARY } from '../data/vocabulary';

type MenuProps = {
  onStart: (text: string) => void;
};

const WORD_COUNTS = [10, 25, 30, 40, 50, 100, 200];

export function Menu({ onStart }: MenuProps) {
  const [selectedWordCount, setSelectedWordCount] = useState(50);
  const [customText, setCustomText] = useState('');

  const generateRandomText = (wordCount: number): string => {
    const shuffled = [...VOCABULARY].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(wordCount, shuffled.length));
    return selectedWords.join(' ');
  };

  return (
    <div style={{ width: '100%' }}>
      <div id="menu-grid" className="grid">
        {ARTICLES.map((art) => (
          <div key={art.title} className="card" onClick={() => onStart(art.content)}>
            <h3>{art.title}</h3>
            <p>{art.content}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, borderTop: '1px solid #444', paddingTop: 20 }}>
        <h3 style={{ color: 'var(--text-color)', marginBottom: 20 }}>Random Mode</h3>
        <div style={{ marginBottom: 15 }}>
          <label style={{ color: 'var(--sub-color)', display: 'block', marginBottom: 8 }}>Word Count:</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {WORD_COUNTS.map((count) => (
              <button
                key={count}
                className={`word-count-btn${count === selectedWordCount ? ' active' : ''}`}
                onClick={() => setSelectedWordCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
        <button className="start-btn" id="btn-random" onClick={() => onStart(generateRandomText(selectedWordCount))}>
          Start Random
        </button>
      </div>

      <div style={{ marginTop: 40, borderTop: '1px solid #444', paddingTop: 20 }}>
        <p style={{ color: '#666' }}>Or Custom Text:</p>
        <textarea
          id="custom-text"
          placeholder="Paste here..."
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
        />
        <br />
        <button
          className="start-btn"
          id="btn-custom"
          onClick={() => customText.trim() && onStart(customText)}
        >
          Start Custom
        </button>
      </div>
    </div>
  );
}
