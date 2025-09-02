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
from datetime import datetime, timezone, timedelta
import jwt
import hashlib
import asyncio
import random
from contextlib import asynccontextmanager

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

class TransferStage(BaseModel):
    stage_name: str
    stage_code: str
    location: str
    timestamp: datetime
    status: str  # completed, in_progress, pending, failed
    description: str
    logs: List[dict] = Field(default_factory=list)

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
    current_stage: str = "initiated"
    current_stage_index: int = 0
    location: str = "sending_bank"
    stages: List[TransferStage] = Field(default_factory=list)
    estimated_completion: Optional[datetime] = None

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

class StageAdvancement(BaseModel):
    transfer_id: str
    target_stage: Optional[str] = None  # If None, advance to next stage

# Automated progression settings
STAGE_TIMINGS = {
    "INIT": 2,    # 2 seconds - Initiated
    "VAL": 15,    # 15 seconds - Validation
    "AML": 30,    # 30 seconds - Compliance Check
    "AUTH": 45,   # 45 seconds - Authorization (can be manual or auto)
    "PROC": 20,   # 20 seconds - Processing
    "NET": 25,    # 25 seconds - Network Transmission
    "INT": 35,    # 35 seconds - Intermediary Bank
    "SETT": 40,   # 40 seconds - Final Settlement
    "COMP": 0     # 0 seconds - Completed (final stage)
}

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

def get_transfer_stages() -> List[dict]:
    """Define the standard transfer stages"""
    return [
        {
            "stage_name": "Initiated",
            "stage_code": "INIT",
            "location": "sending_bank",
            "description": "Transfer request received and queued for processing"
        },
        {
            "stage_name": "Validation",
            "stage_code": "VAL", 
            "location": "sending_bank",
            "description": "Validating BIC codes, account details, and transfer format"
        },
        {
            "stage_name": "Compliance Check",
            "stage_code": "AML",
            "location": "sending_bank", 
            "description": "AML/KYC compliance verification and sanctions screening"
        },
        {
            "stage_name": "Authorization",
            "stage_code": "AUTH",
            "location": "sending_bank",
            "description": "Awaiting authorization from authorized personnel"
        },
        {
            "stage_name": "Processing",
            "stage_code": "PROC",
            "location": "sending_bank",
            "description": "Processing transfer and preparing for network transmission"
        },
        {
            "stage_name": "Network Transmission",
            "stage_code": "NET",
            "location": "swift_network",
            "description": "Transmitting through SWIFT network infrastructure"
        },
        {
            "stage_name": "Intermediary Bank",
            "stage_code": "INT",
            "location": "intermediary_bank",
            "description": "Processing at intermediary correspondent bank"
        },
        {
            "stage_name": "Final Settlement",
            "stage_code": "SETT",
            "location": "receiving_bank",
            "description": "Final settlement processing at receiving bank"
        },
        {
            "stage_name": "Completed",
            "stage_code": "COMP",
            "location": "receiving_bank",
            "description": "Transfer completed successfully"
        }
    ]

def generate_stage_logs(stage_info: dict, transfer: Transfer) -> List[dict]:
    """Generate stage-specific SWIFT logs"""
    current_time = datetime.now(timezone.utc)
    stage_code = stage_info["stage_code"]
    logs = []
    
    if stage_code == "INIT":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"SWIFT NETWORK INITIATED - MSG TYPE: {transfer.transfer_type}",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"TRANSFER ID: {transfer.transfer_id}",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"AMOUNT: {transfer.currency} {transfer.amount:,.2f}",
                "level": "INFO"
            }
        ]
    elif stage_code == "VAL":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"VALIDATING BIC: {transfer.sender_bic} -> {transfer.receiver_bic}",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "BIC VALIDATION: PASSED - CODES VERIFIED",
                "level": "SUCCESS"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"AMOUNT VALIDATION: {transfer.currency} {transfer.amount:,.2f} - PASSED",
                "level": "SUCCESS"
            }
        ]
    elif stage_code == "AML":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "INITIATING AML/KYC COMPLIANCE CHECK",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "SANCTIONS SCREENING: CLEAR",
                "level": "SUCCESS"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "KYC VERIFICATION: PASSED",
                "level": "SUCCESS"
            }
        ]
    elif stage_code == "AUTH":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "AUTHORIZATION REQUIRED - AWAITING APPROVAL",
                "level": "WARNING"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"AUTHORIZATION LEVEL: {transfer.transfer_type} HIGH VALUE",
                "level": "INFO"
            }
        ]
    elif stage_code == "PROC":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "PROCESSING TRANSFER FOR NETWORK TRANSMISSION",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"GENERATING SWIFT MT{transfer.transfer_type[-2:]} MESSAGE",
                "level": "INFO"
            }
        ]
    elif stage_code == "NET":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "TRANSMITTING VIA SWIFT NETWORK",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "MESSAGE ROUTING: IN PROGRESS",
                "level": "INFO"
            }
        ]
    elif stage_code == "INT":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "PROCESSING AT INTERMEDIARY BANK",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "CORRESPONDENT BANK VERIFICATION: PASSED",
                "level": "SUCCESS"
            }
        ]
    elif stage_code == "SETT":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "FINAL SETTLEMENT IN PROGRESS",
                "level": "INFO"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"CREDITING ACCOUNT: {transfer.receiver_name}",
                "level": "INFO"
            }
        ]
    elif stage_code == "COMP":
        logs = [
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": "TRANSFER COMPLETED SUCCESSFULLY",
                "level": "SUCCESS"
            },
            {
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"FINAL STATUS: CREDITED {transfer.currency} {transfer.amount:,.2f}",
                "level": "SUCCESS"
            }
        ]
    
    return logs

def initialize_transfer_stages(transfer: Transfer) -> List[TransferStage]:
    """Initialize all transfer stages"""
    stages = []
    stage_definitions = get_transfer_stages()
    current_time = datetime.now(timezone.utc)
    
    for i, stage_def in enumerate(stage_definitions):
        stage_status = "completed" if i == 0 else "pending"
        stage_logs = generate_stage_logs(stage_def, transfer) if i == 0 else []
        
        stage = TransferStage(
            stage_name=stage_def["stage_name"],
            stage_code=stage_def["stage_code"],
            location=stage_def["location"],
            timestamp=current_time if i == 0 else current_time,
            status=stage_status,
            description=stage_def["description"],
            logs=stage_logs
        )
        stages.append(stage)
    
    return stages

def generate_swift_logs(transfer: Transfer) -> List[dict]:
    """Generate initial SWIFT terminal logs"""
    current_time = datetime.now(timezone.utc)
    logs = []
    
    # Add logs from completed stages
    for stage in transfer.stages:
        if stage.status == "completed":
            logs.extend(stage.logs)
    
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
    transfer_dict["current_stage"] = "initiated"
    transfer_dict["current_stage_index"] = 0
    transfer_dict["location"] = "sending_bank"
    
    # Create transfer object with stages
    transfer_obj = Transfer(**transfer_dict)
    transfer_obj.stages = initialize_transfer_stages(transfer_obj)
    
    # Set estimated completion (2-5 hours from now for simulation)
    import random
    hours_to_complete = random.randint(2, 5)
    transfer_obj.estimated_completion = datetime.now(timezone.utc) + timedelta(hours=hours_to_complete)
    
    transfer_dict = transfer_obj.dict()
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

@api_router.post("/transfers/advance-stage")
async def advance_transfer_stage(stage_data: StageAdvancement, current_user: dict = Depends(verify_token)):
    if current_user["role"] not in ["admin", "officer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    transfer = await db.transfers.find_one({"transfer_id": stage_data.transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    transfer_obj = Transfer(**transfer)
    current_stage_idx = transfer_obj.current_stage_index
    
    # Check if we can advance
    if current_stage_idx >= len(transfer_obj.stages) - 1:
        raise HTTPException(status_code=400, detail="Transfer is already at final stage")
    
    # Advance to next stage
    next_stage_idx = current_stage_idx + 1
    next_stage = transfer_obj.stages[next_stage_idx]
    
    # Update the stage
    current_time = datetime.now(timezone.utc)
    transfer_obj.stages[next_stage_idx].status = "completed"
    transfer_obj.stages[next_stage_idx].timestamp = current_time
    transfer_obj.stages[next_stage_idx].logs = generate_stage_logs(
        {
            "stage_code": next_stage.stage_code,
            "stage_name": next_stage.stage_name,
            "location": next_stage.location,
            "description": next_stage.description
        },
        transfer_obj
    )
    
    # Update transfer status
    transfer_obj.current_stage_index = next_stage_idx
    transfer_obj.current_stage = next_stage.stage_name.lower().replace(" ", "_")
    transfer_obj.location = next_stage.location
    
    # Update overall status based on stage
    if next_stage.stage_code == "AUTH":
        transfer_obj.status = "pending"
    elif next_stage.stage_code in ["PROC", "NET", "INT"]:
        transfer_obj.status = "processing"
    elif next_stage.stage_code == "SETT":
        transfer_obj.status = "in_transit"
    elif next_stage.stage_code == "COMP":
        transfer_obj.status = "completed"
    
    # Regenerate SWIFT logs
    transfer_obj.swift_logs = generate_swift_logs(transfer_obj)
    
    # Add stage advancement log
    stage_log = {
        "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
        "message": f"STAGE ADVANCED: {next_stage.stage_name.upper()} by {current_user['username']}",
        "level": "INFO"
    }
    transfer_obj.swift_logs.append(stage_log)
    
    # Update in database
    await db.transfers.update_one(
        {"transfer_id": stage_data.transfer_id},
        {"$set": transfer_obj.dict()}
    )
    
    return {
        "transfer_id": stage_data.transfer_id,
        "previous_stage": transfer_obj.stages[current_stage_idx].stage_name,
        "current_stage": next_stage.stage_name,
        "status": "success",
        "message": f"Transfer advanced to {next_stage.stage_name}"
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