from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from config import settings

# MongoDB client and database
mongo_client: Optional[AsyncIOMotorClient] = None
mongo_db = None


def init_database():
    """Initialize MongoDB connection"""
    global mongo_client, mongo_db
    mongo_client = AsyncIOMotorClient(settings.database_url)
    mongo_db = mongo_client[settings.MONGODB_DB]


def get_db():
    """Get MongoDB database instance"""
    global mongo_db
    if mongo_db is None:
        init_database()
    return mongo_db


def close_connection():
    """Close MongoDB connection"""
    global mongo_client
    if mongo_client:
        mongo_client.close()


# Collection names
COLLECTIONS = {
    "organizations": "organizations",
    "users": "users",
    "user_organizations": "user_organizations",
    "funds": "funds",
    "investors": "investors",
    "properties": "properties",
}
