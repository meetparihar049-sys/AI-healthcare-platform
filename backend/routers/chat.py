from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import json

from backend.core.database import get_db
from backend.services.auth_service import get_current_user
from backend.models import User, ChatSession, ChatMessage
from backend.schemas.chat import (
    ChatMessageCreate, ChatResponse, ChatSessionOut, ChatSessionCreate, ChatMessageOut
)
from backend.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["Chat & Clinical AI"])

@router.post("/message", response_model=ChatResponse)
async def post_message(
    body: ChatMessageCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Processes health inquiries with safety triage, multi-turn context, and AI reasoning."""
    response_data = await chat_service.process_chat_message(
        db=db,
        user=current_user,
        message_text=body.message,
        session_id=body.session_id
    )
    return response_data

@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_sessions(
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns all consultation sessions for the logged-in user."""
    if not current_user:
        return []
    
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .options(selectinload(ChatSession.messages))
    )
    sessions = result.scalars().all()
    
    out = []
    for s in sessions:
        out.append(ChatSessionOut(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages)
        ))
    return out

@router.post("/sessions", response_model=ChatSessionOut)
async def create_session(
    body: ChatSessionCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new empty chat session."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    
    session = ChatSession(user_id=current_user.id, title=body.title or "New Consultation")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return ChatSessionOut(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0
    )

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def get_session_messages(
    session_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns conversation history for a given session."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .options(selectinload(ChatSession.messages))
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    messages_out = []
    for m in session.messages:
        suggested = None
        if m.suggested_actions:
            try:
                suggested = json.loads(m.suggested_actions)
            except Exception:
                suggested = None

        messages_out.append(ChatMessageOut(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            intent_tag=m.intent_tag,
            urgency_level=m.urgency_level,
            is_emergency=m.is_emergency,
            suggested_actions=suggested,
            created_at=m.created_at
        ))
    return messages_out

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a chat session and associated messages."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    await db.delete(session)
    await db.commit()
    return None
