from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="K3RN3L 808 Banking Simulation")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
SECRET_KEY = "K3RN3L808_SECRET_KEY_FOR_SIMULATION"
ALGORITHM = "HS256"
security = HTTPBearer()

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    full_name: str
    role: str  # admin, officer, customer
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str
    email: str

class UserLogin(BaseModel):
    username: str
    password: str

class Transfer(BaseModel):
    transfer_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sender_name: str
    sender_bic: str
    receiver_name: str
    receiver_bic: str
    transfer_type: str  # M0, M1, SWIFT-MT, SWIFT-MX
    amount: float
    currency: str
    reference: str
    purpose: str
    status: str = "pending"  # pending, processing, in_transit, completed, rejected, held
    created_by: str
    swift_logs: List[dict] = Field(default_factory=list)
    current_stage: str = "queued"
    location: str = "sending_bank"

class TransferCreate(BaseModel):
    sender_name: str
    sender_bic: str
    receiver_name: str
    receiver_bic: str
    transfer_type: str
    amount: float
    currency: str
    reference: str
    purpose: str

class TransferAction(BaseModel):
    action: str  # approve, hold, reject
    transfer_id: str
    notes: Optional[str] = None

class BulkTransferAction(BaseModel):
    action: str  # approve, hold, reject
    transfer_ids: List[str]
    notes: Optional[str] = None

class ActionResponse(BaseModel):
    action: str
    transfer_id: str
    status: str
    message: str
    error_code: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_access_token(user_data: dict) -> str:
    return jwt.encode(user_data, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_swift_logs(transfer: Transfer) -> List[dict]:
    """Generate realistic SWIFT terminal logs"""
    current_time = datetime.now(timezone.utc)
    logs = [
        {
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"SWIFT NETWORK INITIATED - MSG TYPE: {transfer.transfer_type}",
            "level": "INFO"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"SENDING BANK: {transfer.sender_bic}",
            "level": "INFO"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"RECEIVING BANK: {transfer.receiver_bic}",
            "level": "INFO"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"AMOUNT: {transfer.currency} {transfer.amount:,.2f}",
            "level": "INFO"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"REFERENCE: {transfer.reference}",
            "level": "INFO"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": "VALIDATION: PASSED - BIC CODES VERIFIED",
            "level": "SUCCESS"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": "COMPLIANCE CHECK: PASSED - AML/KYC CLEARED",
            "level": "SUCCESS"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": "PIPELINE: Initiated -> Processing -> Awaiting Approval",
            "level": "INFO"
        },
        {
            "timestamp": (current_time).strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"STATUS: {transfer.status.upper()}",
            "level": "WARNING" if transfer.status == "pending" else "SUCCESS"
        }
    ]
    return logs

# Initialize default admin user
async def init_default_admin():
    existing_admin = await db.users.find_one({"username": "kompx3"})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "kompx3",
            "password": hash_password("K3RN3L808"),
            "full_name": "System Administrator",
            "role": "admin",
            "email": "admin@kernel808.sim",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)

# Authentication Routes
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token_data = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"]
    }
    token = create_access_token(token_data)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: dict = Depends(verify_token)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_dict = user_data.dict()
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Return user without password
    del user_dict["password"]
    return User(**user_dict)

# Transfer Routes
@api_router.post("/transfers", response_model=Transfer)
async def create_transfer(transfer_data: TransferCreate, current_user: dict = Depends(verify_token)):
    transfer_dict = transfer_data.dict()
    transfer_dict["transfer_id"] = str(uuid.uuid4())
    transfer_dict["date"] = datetime.now(timezone.utc).isoformat()
    transfer_dict["status"] = "pending"
    transfer_dict["created_by"] = current_user["user_id"]
    transfer_dict["current_stage"] = "queued"
    transfer_dict["location"] = "sending_bank"
    
    # Create transfer object to generate logs
    transfer_obj = Transfer(**transfer_dict)
    transfer_dict["swift_logs"] = generate_swift_logs(transfer_obj)
    
    await db.transfers.insert_one(transfer_dict)
    return Transfer(**transfer_dict)

@api_router.get("/transfers", response_model=List[Transfer])
async def get_transfers(
    status: Optional[str] = None,
    transfer_type: Optional[str] = None,
    limit: int = 1000,
    current_user: dict = Depends(verify_token)
):
    query = {}
    if status and status != "all":
        query["status"] = status
    if transfer_type and transfer_type != "all":
        query["transfer_type"] = transfer_type
    
    transfers = await db.transfers.find(query).sort("date", -1).limit(limit).to_list(limit)
    return [Transfer(**transfer) for transfer in transfers]

@api_router.get("/transfers/stats")
async def get_transfer_stats(current_user: dict = Depends(verify_token)):
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total_amount": {"$sum": "$amount"}
            }
        }
    ]
    
    stats = await db.transfers.aggregate(pipeline).to_list(None)
    
    # Calculate overall stats
    total_transfers = await db.transfers.count_documents({})
    total_amount = sum(stat["total_amount"] for stat in stats)
    
    status_counts = {stat["_id"]: stat["count"] for stat in stats}
    
    return {
        "total_transfers": total_transfers,
        "total_amount": total_amount,
        "status_breakdown": status_counts,
        "pending": status_counts.get("pending", 0),
        "completed": status_counts.get("completed", 0),
        "rejected": status_counts.get("rejected", 0),
        "held": status_counts.get("held", 0)
    }

@api_router.get("/transfers/{transfer_id}", response_model=Transfer)
async def get_transfer(transfer_id: str, current_user: dict = Depends(verify_token)):
    transfer = await db.transfers.find_one({"transfer_id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return Transfer(**transfer)

@api_router.post("/transfers/action", response_model=ActionResponse)
async def process_transfer_action(action_data: TransferAction, current_user: dict = Depends(verify_token)):
    if current_user["role"] not in ["admin", "officer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    transfer = await db.transfers.find_one({"transfer_id": action_data.transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    # Update transfer status based on action
    new_status = "completed" if action_data.action == "approve" else action_data.action + "ed"
    current_time = datetime.now(timezone.utc)
    
    # Add action log to SWIFT logs
    new_log = {
        "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
        "message": f"ACTION: {action_data.action.upper()} by {current_user['username']}",
        "level": "SUCCESS" if action_data.action == "approve" else "WARNING"
    }
    
    if action_data.action == "approve":
        new_log_complete = {
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "message": "PIPELINE: Processing -> In Transit -> Completed",
            "level": "SUCCESS"
        }
        transfer["swift_logs"].extend([new_log, new_log_complete])
        transfer["current_stage"] = "completed"
        transfer["location"] = "receiving_bank"
    else:
        transfer["swift_logs"].append(new_log)
    
    transfer["status"] = new_status
    
    await db.transfers.update_one(
        {"transfer_id": action_data.transfer_id},
        {"$set": {"status": new_status, "swift_logs": transfer["swift_logs"], 
                 "current_stage": transfer["current_stage"], "location": transfer["location"]}}
    )
    
    return ActionResponse(
        action=action_data.action,
        transfer_id=action_data.transfer_id,
        status="success",
        message=f"Transfer {action_data.action}d successfully"
    )

@api_router.post("/transfers/bulk-action")
async def process_bulk_transfer_action(action_data: BulkTransferAction, current_user: dict = Depends(verify_token)):
    if current_user["role"] not in ["admin", "officer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if not action_data.transfer_ids:
        raise HTTPException(status_code=400, detail="No transfer IDs provided")
    
    # Process each transfer
    results = []
    current_time = datetime.now(timezone.utc)
    new_status = "completed" if action_data.action == "approve" else action_data.action + "ed"
    
    for transfer_id in action_data.transfer_ids:
        transfer = await db.transfers.find_one({"transfer_id": transfer_id})
        if not transfer:
            results.append({"transfer_id": transfer_id, "status": "error", "message": "Transfer not found"})
            continue
        
        # Add action log to SWIFT logs
        new_log = {
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "message": f"BULK ACTION: {action_data.action.upper()} by {current_user['username']}",
            "level": "SUCCESS" if action_data.action == "approve" else "WARNING"
        }
        
        if action_data.action == "approve":
            new_log_complete = {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "PIPELINE: Processing -> In Transit -> Completed",
                "level": "SUCCESS"
            }
            transfer["swift_logs"].extend([new_log, new_log_complete])
            transfer["current_stage"] = "completed"
            transfer["location"] = "receiving_bank"
        else:
            transfer["swift_logs"].append(new_log)
        
        transfer["status"] = new_status
        
        await db.transfers.update_one(
            {"transfer_id": transfer_id},
            {"$set": {"status": new_status, "swift_logs": transfer["swift_logs"], 
                     "current_stage": transfer["current_stage"], "location": transfer["location"]}}
        )
        
        results.append({"transfer_id": transfer_id, "status": "success", "message": f"Transfer {action_data.action}d successfully"})
    
    successful_count = len([r for r in results if r["status"] == "success"])
    
    return {
        "action": action_data.action,
        "total_requested": len(action_data.transfer_ids),
        "successful": successful_count,
        "failed": len(action_data.transfer_ids) - successful_count,
        "results": results,
        "message": f"Bulk {action_data.action} completed: {successful_count}/{len(action_data.transfer_ids)} successful"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_default_admin()
    logger.info("K3RN3L 808 Banking Simulation System Started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()