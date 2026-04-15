import { useCallback, useState } from 'react'
import { Sidebar } from './Sidebar'
import { ModelSelector } from './ModelSelector'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ToastContainer } from './Toast'
import { ParticleBackground } from './ParticleBackground'
import { SettingsModal } from './SettingsModal'
import { useChatStore } from '../store/chatStore'
import { useToast } from '../hooks/useToast'
import { streamChat } from '../services/api'

export function ChatLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const {
    messages,
    currentConversationId,
    thinkingEnabled,
    apiKey,
    addUserMessage,
    startAssistantMessage,
    appendReasoning,
    appendContent,
    finishStreaming,
    createNewConversation,
    loadConversations,
    setAbortController,
    abortStreaming,
  } = useChatStore()

  const { toasts, removeToast, error: showError } = useToast()

  const handleSendMessage = useCallback(async (content: string) => {
    // 檢查 API Key
    if (!apiKey) {
      showError('請先設定 API Key')
      setSettingsOpen(true)
      return
    }

    let conversationId = currentConversationId
    if (!conversationId) {
      conversationId = await createNewConversation()
      if (!conversationId) {
        showError('創建對話失敗，請重試')
        return
      }
    }

    addUserMessage(content)
    startAssistantMessage()

    const controller = new AbortController()
    setAbortController(controller)

    const apiMessages = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content },
    ]

    await streamChat(
      {
        messages: apiMessages,
        conversation_id: conversationId,
        thinking_enabled: thinkingEnabled,
      },
      (chunk) => appendReasoning(chunk),
      (chunk) => appendContent(chunk),
      (reasoning, content) => {
        finishStreaming(reasoning, content)
        loadConversations()
      },
      (error) => {
        console.error('Chat error:', error)
        showError(`請求失敗: ${error}`)
        finishStreaming(null, '')
      },
      controller.signal,
      apiKey
    )
  }, [
    currentConversationId, messages, thinkingEnabled, apiKey,
    addUserMessage, startAssistantMessage, appendReasoning,
    appendContent, finishStreaming, createNewConversation,
    loadConversations, setAbortController, showError
  ])

  const handleStop = useCallback(() => {
    abortStreaming()
  }, [abortStreaming])

  return (
    <div className="relative flex h-screen text-stone-100 overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(249, 115, 22, 0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(245, 158, 11, 0.05) 0%, transparent 50%)'
        }}
      />

      {/* Sidebar */}
      <div className="relative z-10">
        <Sidebar />
      </div>

      {/* Main Chat Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Header with Model Selector and Settings */}
        <div className="glass border-b border-stone-800/50 p-4">
          <div className="flex items-center justify-between">
            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-stone-800/50 transition-colors text-gray-400 hover:text-white"
              title="API 設定"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Model Selector */}
            <div className="flex-1 flex justify-center">
              <ModelSelector />
            </div>

            {/* Spacer to balance layout */}
            <div className="w-9" />
          </div>
        </div>

        {/* Messages */}
        <MessageList />

        {/* Input */}
        <ChatInput onSend={handleSendMessage} onStop={handleStop} />
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
