from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class MongoRepository:
    """MongoDB repository implementation"""

    def __init__(self, collection_name: str, db: AsyncIOMotorDatabase):
        self.collection = db[collection_name]

    async def create(self, data: dict) -> dict:
        result = await self.collection.insert_one(data)
        data["id"] = str(result.inserted_id)
        return data

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[dict]:
        cursor = self.collection.find().skip(skip).limit(limit)
        items = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            items.append(doc)
        return items

    async def get_by_id(self, id: str) -> Optional[dict]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(id)})
            if doc:
                doc["id"] = str(doc.pop("_id"))
                return doc
            return None
        except Exception:
            return None

    async def get_by_field(self, field: str, value) -> List[dict]:
        cursor = self.collection.find({field: value})
        items = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            items.append(doc)
        return items

    async def get_by_field_in(self, field: str, values: List) -> List[dict]:
        """Get documents where field value is in the provided list"""
        cursor = self.collection.find({field: {"$in": values}})
        items = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            items.append(doc)
        return items

    async def update(self, id: str, data: dict) -> Optional[dict]:
        try:
            # Remove None values
            update_data = {k: v for k, v in data.items() if v is not None}
            if not update_data:
                return await self.get_by_id(id)

            result = await self.collection.update_one(
                {"_id": ObjectId(id)},
                {"$set": update_data}
            )
            if result.modified_count > 0 or result.matched_count > 0:
                return await self.get_by_id(id)
            return None
        except Exception:
            return None

    async def delete(self, id: str) -> bool:
        try:
            result = await self.collection.delete_one({"_id": ObjectId(id)})
            return result.deleted_count > 0
        except Exception:
            return False
