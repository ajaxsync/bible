import { useParams } from 'react-router-dom'
import { parseChapterParam } from '../data/bibleIndex.js'
import { useVersion } from '../context/VersionContext.jsx'
import { useSpeechReader } from '../context/SpeechReaderContext.jsx'
import { PauseIcon, PlayIcon } from './SpeechIcons.jsx'
import './SpeechFloatingControl.css'

export default function SpeechFloatingControl({ verseSelected = false }) {
  const { book: bookParam, chapter: chapterParam } = useParams()
  const { version } = useVersion()
  const { togglePause, status, isActive, location } = useSpeechReader()
  const book = parseInt(bookParam, 10)
  const chapter = parseChapterParam(chapterParam)
  const isEn = version.lang === 'en'

  const isSpeakingHere = isActive
    && location?.book === book
    && location?.chapter === chapter

  if (!isSpeakingHere) return null

  return (
    <div className={`speech-float${verseSelected ? ' speech-float-above-toolbar' : ''}`}>
      <button
        type="button"
        className="speech-float-btn"
        onClick={togglePause}
        aria-label={status === 'playing' ? (isEn ? 'Pause' : '暂停') : (isEn ? 'Resume' : '继续')}
      >
        {status === 'playing' ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
      </button>
    </div>
  )
}
