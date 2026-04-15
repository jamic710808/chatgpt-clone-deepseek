import { useState, useEffect } from 'react'
import { X, Key, Check, Eye, EyeOff } from 'lucide-react'
import { useChatStore } from '../store/chatStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { apiKey, setApiKey } = useChatStore()
  const [inputValue, setInputValue] = useState(apiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (apiKey) {
      setInputValue(apiKey)
    }
  }, [apiKey])

  const handleSave = () => {
    setApiKey(inputValue.trim() || null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    setApiKey(null)
    setInputValue('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-[#2d2d44]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d44]">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">API 設定</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#2d2d44] transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              DeepSeek API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="請輸入您的 API Key"
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
            <p className="mt-2 text-xs text-gray-500">
              支援 DeepSeek API Key，會自動適配 OpenAI 兼容格式
            </p>
          </div>

          {/* Current status */}
          {apiKey && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Check className="w-4 h-4" />
              <span>已設定 API Key（已儲存）</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2d2d44]">
          {apiKey && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              清除
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
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
