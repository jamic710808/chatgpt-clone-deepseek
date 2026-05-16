import os
import json
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    """統一的 LLM API 服務封裝，支援多模型供應商"""

    def __init__(self):
        # 從環境變數讀取預設的各個 Key 作為 fallback（視需求也可不用）
        self.default_keys = {
            "openai": os.getenv("OPENAI_API_KEY"),
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "deepseek": os.getenv("DEEPSEEK_API_KEY"),
            "siliconflow": os.getenv("SILICONFLOW_API_KEY"),
            "minimax": os.getenv("MINIMAX_API_KEY"),
            "openrouter": os.getenv("OPENROUTER_API_KEY"),
        }
        
        self.default_base_urls = {
            "openai": "https://api.openai.com/v1",
            "deepseek": "https://api.deepseek.com",
            "siliconflow": "https://api.siliconflow.cn/v1",
            "minimax": "https://api.minimax.chat/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "ollama": "http://localhost:11434/v1"
        }

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        provider: str = "deepseek",
        model: str = "deepseek-chat",
        thinking_enabled: bool = False,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        統一的串流聊天介面

        Args:
            messages: 訊息列表 [{"role": "user", "content": "..."}, ...]
            provider: 供應商 (openai, anthropic, deepseek, siliconflow, minimax, openrouter, ollama, custom)
            model: 模型名稱
            thinking_enabled: 是否開啟思考模式 (部分模型支援)
            api_key: 動態 API Key
            base_url: 自訂 Base URL

        Yields:
            {"type": "reasoning", "data": "..."} - 思考內容
            {"type": "content", "data": "..."} - 回答內容
            {"type": "done", "reasoning": "...", "content": "..."} - 完成
            {"type": "error", "error": "..."} - 錯誤
        """
        try:
            # 處理 thinking 模式的模型轉換 (DeepSeek 官方規範)
            actual_model = model
            if provider == "deepseek" and thinking_enabled:
                actual_model = "deepseek-reasoner"
            elif provider == "deepseek" and not thinking_enabled:
                actual_model = "deepseek-chat"

            resolved_api_key = api_key or self.default_keys.get(provider)
            resolved_base_url = base_url or self.default_base_urls.get(provider)

            if provider == "anthropic":
                # 使用 Anthropic 官方 SDK
                if not resolved_api_key:
                    raise ValueError(f"API key is required for {provider}")
                    
                client = AsyncAnthropic(
                    api_key=resolved_api_key,
                    http_client=httpx.AsyncClient()
                )
                
                # Anthropic messages 格式不允許 system role 在 messages 陣列裡，需要抽離
                system_prompt = next((m["content"] for m in messages if m["role"] == "system"), None)
                filtered_messages = [m for m in messages if m["role"] != "system"]
                
                kwargs = {
                    "model": actual_model,
                    "messages": filtered_messages,
                    "max_tokens": 4096,
                    "stream": True
                }
                if system_prompt:
                    kwargs["system"] = system_prompt
                
                # Claude 的思考模式在 0.20 尚未穩定或是結構不同，這邊單純處理標準文字流
                full_content = ""
                async with client.messages.stream(**kwargs) as stream:
                    async for text in stream.text_stream:
                        if text:
                            full_content += text
                            yield {"type": "content", "data": text}
                
                yield {
                    "type": "done", 
                    "reasoning": None,
                    "content": full_content
                }
                
            else:
                # 其他支援 OpenAI 相容格式的供應商
                if provider not in ["ollama", "custom"] and not resolved_api_key:
                    raise ValueError(f"API key is required for {provider}")

                # 初始化 AsyncOpenAI 客戶端
                client = AsyncOpenAI(
                    api_key=resolved_api_key or "sk-dummy",  # Ollama 必須填任意值
                    base_url=resolved_base_url,
                    http_client=httpx.AsyncClient()
                )

                # 構建請求參數
                kwargs = {
                    "model": actual_model,
                    "messages": messages,
                    "stream": True,
                }
                
                # 如果是 OpenRouter 且包含 APP 標頭，可以進階設定，此處先保持基礎設定

                response = await client.chat.completions.create(**kwargs)
                
                full_reasoning = ""
                full_content = ""
                
                async for chunk in response:
                    # 部分供應商（如 ollama）可能回傳空 chunk，需判斷
                    if not chunk.choices:
                        continue
                    
                    delta = chunk.choices[0].delta
                    
                    # 處理思考內容 (例如 DeepSeek 的 reasoning_content 或是某些特規)
                    reasoning_chunk = getattr(delta, 'reasoning_content', None)
                    if reasoning_chunk:
                        full_reasoning += reasoning_chunk
                        yield {"type": "reasoning", "data": reasoning_chunk}
                    
                    # 處理回答內容
                    content_chunk = getattr(delta, 'content', None)
                    if content_chunk:
                        full_content += content_chunk
                        yield {"type": "content", "data": content_chunk}
                
                # 完成信號
                yield {
                    "type": "done", 
                    "reasoning": full_reasoning if full_reasoning else None,
                    "content": full_content
                }
                
        except Exception as e:
            yield {"type": "error", "error": str(e)}


# 全域服務實例
llm_service = LLMService()
