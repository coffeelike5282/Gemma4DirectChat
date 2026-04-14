import React from 'react'
import Gemma4Chat from './components/Gemma4Chat'

function App() {
  return (
    <div className="flex flex-col h-screen w-full bg-bg-primary">
      <main className="flex-1 flex overflow-hidden">
        {/* 이 영역이 안티그래비티 IDE의 사이드바나 특정 패널에 박힌다고 가정함 */}
        <Gemma4Chat />
      </main>
    </div>
  )
}

export default App
