import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import { FullScreenLoader } from './components/ui/FullScreenLoader'

// The 3D greeting and the creator are split so the WhatsApp landing loads fast.
const CreatePage = lazy(() => import('./pages/CreatePage'))
const GreetingPage = lazy(() => import('./pages/GreetingPage'))

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/w/:payload" element={<GreetingPage />} />
        <Route path="/w" element={<GreetingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
