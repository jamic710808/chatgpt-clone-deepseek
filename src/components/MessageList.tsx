import { useEffect, useRef } from 'react'
import { Brain, Sparkles, Rocket, Code, Lightbulb, PenTool, Flame } from 'lucide-react'
import { useChatStore } from '../store/chatStore'
import { MessageItem } from './MessageItem'

export function MessageList() {
  const { messages, isStreaming, thinkingEnabled } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          {/* Animated Logo */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 opacity-20 blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-orange-600/20 to-amber-600/20 border border-orange-500/20 flex items-center justify-center animate-float">
              {thinkingEnabled ? (
                <Brain className="w-12 h-12 text-orange-400" />
              ) : (
                <Flame className="w-12 h-12 text-amber-400 animate-flame" />
              )}
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
          </div>

          <h1 className="text-4xl font-bold mb-3">
            <span className="text-gradient">KenGpt Chat</span>
          </h1>

          <p className="text-stone-400 mb-10 text-lg">
            {thinkingEnabled ? (
              <>
                <span className="text-orange-400 font-medium">🧠 推理模式</span>
                <span className="mx-2">·</span>
                <span>AI 將展示完整思考過程</span>
              </>
            ) : (
              <>
                <span className="text-amber-400 font-medium">⚡ 快速模式</span>
                <span className="mx-2">·</span>
                <span>快速回應，流暢互動</span>
              </>
            )}
          </p>

          {/* Quick prompts */}
          <div className="grid grid-cols-2 gap-4">
            <QuickPrompt
              icon={<Lightbulb className="w-5 h-5" />}
              title="解釋概念"
              description="讓我解釋量子計算的基本原理"
              color="from-yellow-500 to-orange-500"
            />
            <QuickPrompt
              icon={<PenTool className="w-5 h-5" />}
              title="寫作助手"
              description="幫我寫一封商務郵件"
              color="from-rose-500 to-red-500"
            />
            <QuickPrompt
              icon={<Code className="w-5 h-5" />}
              title="程式碼協助"
              description="用 Python 實作快速排序"
              color="from-orange-500 to-amber-500"
            />
            <QuickPrompt
              icon={<Rocket className="w-5 h-5" />}
              title={thinkingEnabled ? "數學推理" : "快速問答"}
              description={thinkingEnabled ? "9.11和9.8哪個更大？" : "解答各種問題"}
              color="from-amber-500 to-yellow-500"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={bottomRef} className="h-4" />
    </div>
  )
}

function QuickPrompt({
  icon,
  title,
  description,
  color
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="group p-5 rounded-2xl glass-light hover:bg-white/5 transition-all duration-300 cursor-pointer border border-transparent hover:border-orange-500/10">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} opacity-80 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-stone-200 font-medium mb-1 group-hover:text-gradient transition-colors">
            {title}
          </p>
          <p className="text-stone-500 text-sm">{description}</p>
        </div>
      </div>
    </div>
  )
}
