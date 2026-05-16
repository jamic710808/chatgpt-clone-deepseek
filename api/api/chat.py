import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import AsyncGenerator

from api.database import get_db
from api.schemas import ChatRequest
from api.models import Conversation, Message
from api.services.llm_service import llm_service

router = APIRouter(prefix="/api", tags=["chat"])


async def generate_sse_stream(
    request: ChatRequest,
    db: AsyncSession
) -> AsyncGenerator[str, None]:
    """生成 SSE 流式響應"""

    # 檢查 API Key (如果是 ollama 或 custom 可能不一定要，留給 llm_service 判斷，但為了向下兼容，我們可以在那邊檢查，或者在這裡放寬)
    if not request.api_key and request.provider not in ["ollama", "custom"]:
        # 嘗試讓 llm_service 自己處理，如果還是沒有 key 會有例外，但為了前端 UX 可以先驗證
        pass
        
    conversation_id = request.conversation_id
    
    # 如果有 conversation_id，獲取歷史訊息
    if conversation_id:
        conversation = await db.get(Conversation, conversation_id)
        if conversation:
            # 更新 thinking_enabled 狀態
            conversation.thinking_enabled = "true" if request.thinking_enabled else "false"
            await db.commit()
    
    # 準備傳送給 LLM 的訊息
    api_messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    full_reasoning = ""
    full_content = ""
    
    # 流式調用統一 LLM API
    async for chunk in llm_service.stream_chat(
        messages=api_messages,
        provider=request.provider,
        model=request.model,
        thinking_enabled=request.thinking_enabled,
        api_key=request.api_key,
        base_url=request.base_url
    ):
        if chunk["type"] == "reasoning":
            full_reasoning += chunk["data"]
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        
        elif chunk["type"] == "content":
            full_content += chunk["data"]
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        
        elif chunk["type"] == "done":
            # 儲存用戶訊息和助手訊息到資料庫
            if conversation_id:
                # 儲存用戶訊息（最後一條）
                last_user_msg = request.messages[-1]
                user_message = Message(
                    conversation_id=conversation_id,
                    role="user",
                    content=last_user_msg.content
                )
                db.add(user_message)
                
                # 儲存助手訊息
                assistant_message = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                    reasoning_content=full_reasoning if full_reasoning else None
                )
                db.add(assistant_message)
                
                # 更新對話標題（如果是最後一條訊息）
                conversation = await db.get(Conversation, conversation_id)
                if conversation and conversation.title == "New Chat":
                    # 使用用戶第一條訊息生成標題
                    title = last_user_msg.content[:30]
                    if len(last_user_msg.content) > 30:
                        title += "..."
                    conversation.title = title
                
                await db.commit()
            
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        
        elif chunk["type"] == "error":
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    聊天接口 - SSE 流式響應

    Request Body:
        - messages: 訊息列表
        - conversation_id: 對話 ID（可選）
        - thinking_enabled: 是否開啟思考模式

    Response:
        SSE 流式響應，格式：
        - data: {"type": "reasoning", "data": "思考內容"}
        - data: {"type": "content", "data": "回答內容"}
        - data: {"type": "done", "reasoning": "完整思考", "content": "完整回答"}
        - data: {"type": "error", "error": "錯誤訊息"}
    """
    return StreamingResponse(
        generate_sse_stream(request, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
