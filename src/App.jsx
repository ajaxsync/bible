import { Routes, Route, Navigate } from 'react-router-dom'
import { getLastReadingRoute } from './lib/lastReadingPosition.js'
import Header from './components/Header.jsx'
import BibleReader from './components/BibleReader.jsx'
import './App.css'

function LastReadingRedirect() {
  return <Navigate to={getLastReadingRoute()} replace />
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LastReadingRedirect />} />
        <Route path="/:book/:chapter/:verse?" element={<ReaderPage />} />
      </Routes>
    </div>
  )
}

function ReaderPage() {
  return (
    <>
      <Header />
      <main className="app-main">
        <BibleReader />
      </main>
    </>
  )
}
