import { useState, useEffect } from 'react'
import { X, Key, Check, Eye, EyeOff, Globe, Cpu, Server } from 'lucide-react'
import { useChatStore } from '../store/chatStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'siliconflow', name: '硅基流動 (SiliconFlow)' },
  { id: 'minimax', name: 'Minimax' },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'ollama', name: 'Ollama' },
  { id: 'custom', name: '自訂端點 (Custom)' },
]

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  siliconflow: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct'],
  minimax: ['abab6.5-chat', 'abab6.5s-chat'],
  openrouter: ['google/gemini-2.5-pro', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'meta-llama/llama-3.1-70b-instruct'],
  ollama: ['llama3', 'mistral', 'qwen2.5', 'deepseek-r1'],
  custom: [],
}

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: '', // Anthropic uses SDK normally, but proxy might be needed
  deepseek: 'https://api.deepseek.com/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
  minimax: 'https://api.minimax.chat/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434/v1',
  custom: '',
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { 
    provider: currentProvider, 
    model: currentModel, 
    baseUrl: currentBaseUrl, 
    apiKeys,
    setProviderConfig, 
    setProviderApiKey 
  } = useChatStore()

  const [localProvider, setLocalProvider] = useState(currentProvider || 'deepseek')
  const [localModel, setLocalModel] = useState(currentModel || 'deepseek-chat')
  const [localBaseUrl, setLocalBaseUrl] = useState(currentBaseUrl || '')
  const [localApiKey, setLocalApiKey] = useState(apiKeys[currentProvider] || '')
  
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync state when opened or provider changed
  useEffect(() => {
    if (isOpen) {
      setLocalProvider(currentProvider)
      setLocalModel(currentModel)
      setLocalBaseUrl(currentBaseUrl || '')
      setLocalApiKey(apiKeys[currentProvider] || '')
    }
  }, [isOpen])

  const handleProviderChange = (newProvider: string) => {
    setLocalProvider(newProvider)
    setLocalModel(DEFAULT_MODELS[newProvider]?.[0] || '')
    setLocalBaseUrl(DEFAULT_BASE_URLS[newProvider] || '')
    setLocalApiKey(apiKeys[newProvider] || '')
  }

  const handleSave = () => {
    setProviderConfig({
      provider: localProvider,
      model: localModel,
      baseUrl: localBaseUrl.trim() || null
    })
    setProviderApiKey(localProvider, localApiKey.trim())
    
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearKey = () => {
    setLocalApiKey('')
    setProviderApiKey(localProvider, '')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-[#2d2d44] max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d44] sticky top-0 bg-[#1a1a2e] z-10">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">模型供應商設定</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#2d2d44] transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Globe className="w-4 h-4" /> 供應商 (Provider)
            </label>
            <select
              value={localProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f1a] border border-[#2d2d44] rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Model Selection/Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Cpu className="w-4 h-4" /> 模型 (Model)
            </label>
            <input
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              list={`models-${localProvider}`}
              placeholder="請輸入或選擇模型"
              className="w-full px-4 py-3 bg-[#0f0f1a] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <datalist id={`models-${localProvider}`}>
              {DEFAULT_MODELS[localProvider]?.map(model => (
                <option key={model} value={model} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-gray-500">
              您可以從清單中選擇，或手動輸入自訂模型名稱。
            </p>
          </div>

          {/* Base URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Base URL (選填)
            </label>
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              placeholder={DEFAULT_BASE_URLS[localProvider] || "https://api.example.com/v1"}
              className="w-full px-4 py-3 bg-[#0f0f1a] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              留空將使用預設端點。如使用代理，請填寫完整位址（包含 /v1）。
            </p>
          </div>

          {/* API Key Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Key className="w-4 h-4" /> API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder={`${PROVIDERS.find(p => p.id === localProvider)?.name} API Key`}
                className="w-full px-4 py-3 pr-12 bg-[#0f0f1a] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {localProvider === 'ollama' && (
              <p className="mt-2 text-xs text-yellow-500/80">
                Ollama 本地端點通常不需要 API Key。
              </p>
            )}
          </div>

          {/* Current status */}
          {apiKeys[localProvider] && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 p-3 rounded-lg border border-green-400/20">
              <Check className="w-4 h-4" />
              <span>已儲存 {PROVIDERS.find(p => p.id === localProvider)?.name} 的 API Key</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2d2d44] bg-[#1a1a2e] sticky bottom-0 rounded-b-xl">
          {localApiKey && (
            <button
              onClick={handleClearKey}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              清除 Key
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                已儲存
              </>
            ) : (
              '儲存設定'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

