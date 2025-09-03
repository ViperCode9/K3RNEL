import requests
import json

def test_toggle_auto_progression():
    """Test the toggle auto-progression endpoint"""
    
    base_url = "https://repo-checkup-3.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Login first
    login_data = {
        "username": "kompx3",
        "password": "K3RN3L808"
    }
    
    print("🔐 Logging in...")
    response = requests.post(f"{api_url}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Get a transfer ID to test with
    print("📋 Getting transfers...")
    response = requests.get(f"{api_url}/transfers", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get transfers: {response.text}")
        return
    
    transfers = response.json()
    if not transfers:
        print("❌ No transfers found")
        return
    
    transfer_id = transfers[0]['transfer_id']
    print(f"✅ Using transfer: {transfer_id}")
    
    # Test enabling auto-progression
    print("🔄 Testing enable auto-progression...")
    response = requests.post(
        f"{api_url}/transfers/toggle-auto-progression",
        params={"transfer_id": transfer_id, "enable": True},
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Enable auto-progression: {result['message']}")
        print(f"   Status: {result['status']}")
        print(f"   Auto-progression: {result['auto_progression']}")
    else:
        print(f"❌ Enable failed: {response.text}")
    
    # Test disabling auto-progression
    print("⏸️ Testing disable auto-progression...")
    response = requests.post(
        f"{api_url}/transfers/toggle-auto-progression",
        params={"transfer_id": transfer_id, "enable": False},
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Disable auto-progression: {result['message']}")
        print(f"   Status: {result['status']}")
        print(f"   Auto-progression: {result['auto_progression']}")
    else:
        print(f"❌ Disable failed: {response.text}")

if __name__ == "__main__":
    print("🔄 Testing Toggle Auto-Progression Endpoint")
    print("=" * 50)
    test_toggle_auto_progression()