import { Routes, Route, Navigate } from 'react-router-dom'
import { appConfig } from './config/env.js'
import Header from './components/Header.jsx'
import BibleReader from './components/BibleReader.jsx'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to={appConfig.defaultRoute} replace />} />
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
