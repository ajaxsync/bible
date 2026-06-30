import { useVersion } from '../context/VersionContext.jsx'
import { useReadingSettings } from '../context/ReadingSettingsContext.jsx'
import { FONT_SIZES, LINE_HEIGHTS, READING_THEMES } from '../data/readingThemes.js'
import BottomSheetHandle from './BottomSheetHandle.jsx'
import './ReadingSettingsPanel.css'

export default function ReadingSettingsPanel({ onClose }) {
  const { version } = useVersion()
  const isEn = version.lang === 'en'
  const isCht = version.lang === 'cht'
  const lang = isEn ? 'en' : isCht ? 'cht' : 'chs'
  const {
    settings,
    adjustFontSize,
    adjustLineHeight,
    setThemeId,
  } = useReadingSettings()

  const fontAtMin = settings.fontSize === FONT_SIZES[0]
  const fontAtMax = settings.fontSize === FONT_SIZES[FONT_SIZES.length - 1]
  const lineAtMin = settings.lineHeight === LINE_HEIGHTS[0]
  const lineAtMax = settings.lineHeight === LINE_HEIGHTS[LINE_HEIGHTS.length - 1]

  return (
    <>
      <div className="reading-settings-backdrop" onClick={onClose} aria-hidden />
      <div className="reading-settings-panel" role="dialog" aria-labelledby="reading-settings-title">
        <BottomSheetHandle onClose={onClose} label={isEn ? 'Close' : '关闭'} />
        <div className="reading-settings-body">
          <h2 id="reading-settings-title" className="reading-settings-title">{isEn ? 'Reading settings' : '字体调整'}</h2>

        <div className="reading-settings-row">
          <span className="reading-settings-label">{isEn ? 'Font size' : '字体大小'}</span>
          <div className="reading-settings-stepper">
            <button type="button" onClick={() => adjustFontSize(-1)} disabled={fontAtMin} aria-label={isEn ? 'Decrease font size' : '减小字体'}>
              −
            </button>
            <span className="reading-settings-value">{settings.fontSize}</span>
            <button type="button" onClick={() => adjustFontSize(1)} disabled={fontAtMax} aria-label={isEn ? 'Increase font size' : '增大字体'}>
              +
            </button>
          </div>
        </div>

        <div className="reading-settings-row">
          <span className="reading-settings-label">{isEn ? 'Line spacing' : '行间距'}</span>
          <div className="reading-settings-stepper">
            <button type="button" onClick={() => adjustLineHeight(-1)} disabled={lineAtMin} aria-label={isEn ? 'Decrease line spacing' : '减小行距'}>
              −
            </button>
            <span className="reading-settings-value">{settings.lineHeight.toFixed(2)}</span>
            <button type="button" onClick={() => adjustLineHeight(1)} disabled={lineAtMax} aria-label={isEn ? 'Increase line spacing' : '增大行距'}>
              +
            </button>
          </div>
        </div>

        <div className="reading-settings-section">
          <span className="reading-settings-label">{isEn ? 'Background' : '背景颜色'}</span>
          <div className="reading-settings-themes" role="radiogroup" aria-label={isEn ? 'Background color' : '背景颜色'}>
            {READING_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={settings.themeId === theme.id}
                className={`reading-theme-swatch ${settings.themeId === theme.id ? 'current' : ''}`}
                data-theme={theme.id}
                style={{ background: theme.swatch }}
                title={theme.label[lang]}
                onClick={() => setThemeId(theme.id)}
              >
                <span className="reading-theme-swatch-label">{theme.label[lang]}</span>
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
