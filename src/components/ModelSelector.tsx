import { Brain, Zap, Cpu } from 'lucide-react'
import { useChatStore } from '../store/chatStore'

const PROVIDERS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  siliconflow: 'SiliconFlow',
  minimax: 'Minimax',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  custom: '自訂端點',
}

export function ModelSelector({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { thinkingEnabled, setThinkingEnabled, isStreaming, provider, model } = useChatStore()
  
  const providerName = PROVIDERS[provider] || provider || 'Unknown'

  return (
    <div className="flex items-center gap-4">
      {/* Model name (Clickable for quick switch) */}
      <button 
        onClick={onOpenSettings}
        className="flex items-center gap-3 p-1.5 -ml-1.5 rounded-xl hover:bg-stone-800/50 transition-colors text-left"
        title="切換供應商與模型"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            {providerName}
          </h1>
          <p className="text-xs text-stone-400 truncate max-w-[150px] leading-tight" title={model}>
            {model || '未選擇模型'}
          </p>
        </div>
      </button>

      {/* Thinking mode toggle */}
      <div className="h-8 w-px bg-stone-700/50 mx-2" />
      
      <button
        onClick={() => setThinkingEnabled(!thinkingEnabled)}
        disabled={isStreaming}
        className={`
          relative flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300
          ${isStreaming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${thinkingEnabled 
            ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 glow-orange' 
            : 'glass hover:bg-white/5 border border-transparent hover:border-stone-700'
          }
        `}
      >
        <div className={`
          p-2 rounded-lg transition-all duration-300
          ${thinkingEnabled 
            ? 'bg-gradient-to-br from-orange-500 to-amber-500' 
            : 'bg-stone-700/50'
          }
        `}>
          {thinkingEnabled ? (
            <Brain className="w-4 h-4 text-white" />
          ) : (
            <Zap className="w-4 h-4 text-stone-400" />
          )}
        </div>
        
        <div className="text-left">
          <div className="text-sm font-medium">
            {thinkingEnabled ? (
              <span className="text-gradient-warm">推理模式</span>
            ) : (
              <span className="text-stone-300">快速模式</span>
            )}
          </div>
          <div className="text-xs text-stone-500">
            {thinkingEnabled ? '展示思考過程' : '直接回答'}
          </div>
        </div>

        {/* Toggle indicator */}
        <div className={`
          w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1
          ${thinkingEnabled 
            ? 'bg-gradient-to-r from-orange-500 to-amber-500' 
            : 'bg-stone-700'
          }
        `}>
          <div className={`
            w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-300
            ${thinkingEnabled ? 'translate-x-6' : 'translate-x-0'}
          `} />
        </div>
      </button>
    </div>
  )
}
