import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components'
import Dashboard from './pages/Dashboard'
import BD from './pages/BD'
import Historique from './pages/Historique'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 1 }
          50% { opacity: 0.4 }
        }
      `}</style>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bd" element={<BD />} />
        <Route path="/historique" element={<Historique />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
