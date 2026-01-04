import { Routes, Route } from 'react-router-dom'

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Ernest Preview
        </h1>
        <p className="text-gray-600">
          Waiting for files to sync...
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}

export default App
