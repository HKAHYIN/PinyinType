import { useGameEngine } from './game/useGameEngine.ts';
import type { GameProps } from './game/types.ts';

export function Game({
  text,
  disableSpace,
  onRestart,
  visible,
  romanizationMode,
  scriptMode,
  jyutpingList
}: GameProps) {
  const {
    inputRef,
    wrapperRef,
    inputValue,
    isPaused,
    results,
    groupsView,
    handleInputEvent,
    handleKeyDown,
    resume
  } = useGameEngine({
    text,
    disableSpace,
    romanizationMode,
    scriptMode,
    jyutpingList,
    onRestart
  });

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
        onInput={handleInputEvent}
        onKeyDown={handleKeyDown}
      />
      {isPaused && (
        <div id="pause-menu">
          <div className="pause-overlay">
            <div className="pause-content">
              <h3>已暂停</h3>
              <p>游戏已暂停</p>
              <button id="continue-button" onClick={resume}>
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
                    {results.finalCorrect}/{results.finalIncorrect}
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
