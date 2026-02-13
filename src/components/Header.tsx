type HeaderProps = {
  disableSpace: boolean;
  onToggleSpace: (value: boolean) => void;
  onBrandClick: () => void;
  showControls: boolean;
};

export function Header({ disableSpace, onToggleSpace, onBrandClick, showControls }: HeaderProps) {
  return (
    <header>
      <div className="header-container">
        <div className="brand" onClick={onBrandClick} style={{ cursor: 'pointer' }}>
          <span>Pinyin</span>Type
        </div>
        <div className="header-controls" style={{ display: showControls ? 'flex' : 'none' }}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="disable-space-toggle"
              checked={disableSpace}
              onChange={(e) => onToggleSpace(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          <span className="toggle-label">No Space</span>
        </div>
      </div>
    </header>
  );
}
