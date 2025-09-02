import requests
import time
import json

def test_cyber_transfer_with_auto_progression():
    """Test creating the specific cyber transfer and monitor auto-progression"""
    
    base_url = "https://kernel808-sim.preview.emergentagent.com"
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
    
    # Create the specific test transfer
    transfer_data = {
        "sender_name": "QUANTUM BANK",
        "sender_bic": "QTMBANK3XXX", 
        "receiver_name": "CYBER FINANCIAL",
        "receiver_bic": "CYFN4BXXYYY",
        "transfer_type": "SWIFT-MX",
        "amount": 500000,
        "currency": "USD",
        "reference": "CYBER808TEST",
        "purpose": "Testing automated cyber banking progression"
    }
    
    print("🚀 Creating cyber transfer...")
    response = requests.post(f"{api_url}/transfers", json=transfer_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Transfer creation failed: {response.text}")
        return
    
    transfer = response.json()
    transfer_id = transfer['transfer_id']
    print(f"✅ Transfer created: {transfer_id}")
    print(f"   Amount: {transfer['currency']} {transfer['amount']:,}")
    print(f"   Type: {transfer['transfer_type']}")
    print(f"   Status: {transfer['status']}")
    print(f"   Current Stage: {transfer['current_stage']}")
    print(f"   Stages: {len(transfer['stages'])}")
    
    # Monitor auto-progression for 3 minutes
    print("\n🔄 Monitoring automated stage progression...")
    start_time = time.time()
    last_stage_index = transfer['current_stage_index']
    
    while time.time() - start_time < 180:  # 3 minutes
        # Get current transfer status
        response = requests.get(f"{api_url}/transfers/{transfer_id}", headers=headers)
        if response.status_code == 200:
            current_transfer = response.json()
            current_stage_index = current_transfer['current_stage_index']
            
            # Check if stage advanced
            if current_stage_index > last_stage_index:
                stage = current_transfer['stages'][current_stage_index]
                print(f"   🎯 AUTO ADVANCED to Stage {current_stage_index + 1}: {stage['stage_name']}")
                print(f"      Status: {current_transfer['status']}")
                print(f"      Location: {stage['location']}")
                print(f"      Time: {time.strftime('%H:%M:%S')}")
                
                # Show latest logs
                if stage['logs']:
                    print(f"      Latest log: {stage['logs'][-1]['message']}")
                
                last_stage_index = current_stage_index
                
                # If completed, break
                if stage['stage_name'] == 'Completed':
                    print("   🏁 Transfer completed!")
                    break
        
        time.sleep(5)  # Check every 5 seconds
    
    # Final status check
    print("\n📊 Final Transfer Status:")
    response = requests.get(f"{api_url}/transfers/{transfer_id}", headers=headers)
    if response.status_code == 200:
        final_transfer = response.json()
        print(f"   Transfer ID: {final_transfer['transfer_id']}")
        print(f"   Status: {final_transfer['status']}")
        print(f"   Current Stage: {final_transfer['current_stage']}")
        print(f"   Stage Index: {final_transfer['current_stage_index']}/{len(final_transfer['stages']) - 1}")
        
        # Show completed stages
        completed_stages = [s for s in final_transfer['stages'] if s['status'] == 'completed']
        print(f"   Completed Stages: {len(completed_stages)}")
        for stage in completed_stages:
            print(f"      ✅ {stage['stage_name']} ({stage['location']})")
        
        # Show SWIFT logs count
        print(f"   SWIFT Logs: {len(final_transfer.get('swift_logs', []))}")
        
        return final_transfer
    
    return None

if __name__ == "__main__":
    print("🏦 K3RN3L 808 Cyber Banking Auto-Progression Test")
    print("=" * 60)
    test_cyber_transfer_with_auto_progression()