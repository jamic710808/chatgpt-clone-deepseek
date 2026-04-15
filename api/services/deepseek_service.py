import os
import json
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()


class DeepSeekService:
    """DeepSeek API 服務封裝"""

    def __init__(self):
        self.default_api_key = os.getenv("DEEPSEEK_API_KEY")

    def get_client(self, api_key: Optional[str] = None) -> AsyncOpenAI:
        """獲取 OpenAI 客戶端，支援動態 API Key"""
        key = api_key or self.default_api_key
        if not key:
            raise ValueError("API key not provided and DEEPSEEK_API_KEY not set")
        return AsyncOpenAI(
            api_key=key,
            base_url="https://api.deepseek.com",
            http_client=httpx.AsyncClient()
        )
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        thinking_enabled: bool = False,
        api_key: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        串流聊天介面

        Args:
            messages: 訊息列表 [{"role": "user", "content": "..."}, ...]
            thinking_enabled: 是否開啟思考模式
            api_key: 可選的動態 API Key

        Yields:
            {"type": "reasoning", "data": "..."} - 思考內容
            {"type": "content", "data": "..."} - 回答內容
            {"type": "done", "reasoning": "...", "content": "..."} - 完成
            {"type": "error", "error": "..."} - 錯誤
        """
        try:
            client = self.get_client(api_key)

            # 根據是否開啟思考模式選擇模型
            # 官方文件規範：deepseek-chat 用於 V3, deepseek-reasoner 用於 R1 (思考模式)
            selected_model = "deepseek-reasoner" if thinking_enabled else "deepseek-chat"

            # 構建請求參數
            kwargs = {
                "model": selected_model,
                "messages": messages,
                "stream": True,
            }

            response = await client.chat.completions.create(**kwargs)
            
            full_reasoning = ""
            full_content = ""
            
            async for chunk in response:
                delta = chunk.choices[0].delta
                
                # 處理思考內容
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


# 全域服務實例（不再在初始化時創建 client）
deepseek_service = DeepSeekService()
