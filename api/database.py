import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# 支援 Vercel Postgres / Supabase 的 connection string
# Vercel 預設會寫入 POSTGRES_URL，如果是 asyncpg 需要將字首的 postgres:// 或 postgresql:// 換掉
raw_url = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL", "")

if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://"):
    if not raw_url.startswith("postgresql+asyncpg://"):
        raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg does not support sslmode parameter in URL
if "?sslmode=" in raw_url:
    raw_url = raw_url.split("?sslmode=")[0]
elif "&sslmode=" in raw_url:
    raw_url = raw_url.replace("&sslmode=require", "").replace("&sslmode=prefer", "")


# 若沒有環境變數，就 fallback 回本地 SQLite 開發
DATABASE_URL = raw_url or "sqlite+aiosqlite:///./chat.db"

# 針對 Serverless PostgreSQL 增加 pool_pre_ping 與 pool_size 設定
engine_kwargs = {"echo": False}
if "postgresql" in DATABASE_URL:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10
    })

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
