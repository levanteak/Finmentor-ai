import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import SynergyGuard from './pages/SynergyGuard'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Finance from './pages/Finance'
import Chat from './pages/Chat'
import KnowledgeBase from './pages/KnowledgeBase'
import SynergyPage from './pages/SynergyPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
        <SynergyGuard>
          <Routes>
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/documents" element={<Layout><Documents /></Layout>} />
            <Route path="/finance" element={<Layout><Finance /></Layout>} />
            <Route path="/chat" element={<Layout><Chat /></Layout>} />
            <Route path="/knowledge-base" element={<Layout><KnowledgeBase /></Layout>} />
            <Route path="/synergy" element={<Layout><SynergyPage /></Layout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SynergyGuard>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
