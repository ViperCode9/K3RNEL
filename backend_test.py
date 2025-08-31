import requests
import sys
import json
from datetime import datetime

class K3RN3LBankingAPITester:
    def __init__(self, base_url="https://kernel808-sim.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Expected {expected_status}, got {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with default admin credentials"""
        login_data = {
            "username": "kompx3",
            "password": "K3RN3L808"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            print(f"   ✅ Login successful for user: {self.user_data.get('username')}")
            print(f"   ✅ User role: {self.user_data.get('role')}")
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "username": "invalid_user",
            "password": "wrong_password"
        }
        
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data=login_data
        )
        return success

    def test_create_transfer(self):
        """Test creating a transfer with the specified test data"""
        transfer_data = {
            "sender_name": "Chase Bank",
            "sender_bic": "CHASUS33XXX",
            "receiver_name": "Deutsche Bank", 
            "receiver_bic": "DEUTDEFFXXX",
            "transfer_type": "SWIFT-MT",
            "amount": 50000,
            "currency": "USD",
            "reference": "REF789123456",
            "purpose": "International trade payment for goods"
        }
        
        success, response = self.run_test(
            "Create Transfer",
            "POST",
            "transfers",
            200,
            data=transfer_data
        )
        
        if success and 'transfer_id' in response:
            print(f"   ✅ Transfer created with ID: {response['transfer_id']}")
            print(f"   ✅ Status: {response.get('status')}")
            print(f"   ✅ SWIFT logs count: {len(response.get('swift_logs', []))}")
            return response['transfer_id']
        return None

    def test_get_transfers(self):
        """Test getting all transfers"""
        success, response = self.run_test(
            "Get All Transfers",
            "GET",
            "transfers",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} transfers")
            if len(response) > 0:
                print(f"   ✅ Latest transfer: {response[0].get('transfer_id')}")
            return True
        return False

    def test_get_specific_transfer(self, transfer_id):
        """Test getting a specific transfer by ID"""
        if not transfer_id:
            print("❌ No transfer ID provided")
            return False
            
        success, response = self.run_test(
            f"Get Transfer {transfer_id}",
            "GET",
            f"transfers/{transfer_id}",
            200
        )
        
        if success and 'transfer_id' in response:
            print(f"   ✅ Retrieved transfer: {response['transfer_id']}")
            print(f"   ✅ Status: {response.get('status')}")
            return True
        return False

    def test_transfer_action(self, transfer_id, action="approve"):
        """Test processing transfer action"""
        if not transfer_id:
            print("❌ No transfer ID provided")
            return False
            
        action_data = {
            "transfer_id": transfer_id,
            "action": action
        }
        
        success, response = self.run_test(
            f"Process Transfer Action ({action})",
            "POST",
            "transfers/action",
            200,
            data=action_data
        )
        
        if success and response.get('status') == 'success':
            print(f"   ✅ Action '{action}' processed successfully")
            return True
        return False

    def test_transfer_stats(self):
        """Test getting transfer statistics"""
        success, response = self.run_test(
            "Get Transfer Stats",
            "GET",
            "transfers/stats",
            200
        )
        
        if success and 'total_transfers' in response:
            print(f"   ✅ Total transfers: {response.get('total_transfers')}")
            print(f"   ✅ Total amount: ${response.get('total_amount', 0):,.2f}")
            print(f"   ✅ Pending: {response.get('pending', 0)}")
            print(f"   ✅ Completed: {response.get('completed', 0)}")
            return True
        return False

    def test_bulk_transfer_action(self, transfer_ids, action="approve"):
        """Test bulk transfer actions"""
        if not transfer_ids or len(transfer_ids) == 0:
            print("❌ No transfer IDs provided for bulk action")
            return False
            
        bulk_data = {
            "transfer_ids": transfer_ids,
            "action": action
        }
        
        success, response = self.run_test(
            f"Bulk Transfer Action ({action})",
            "POST",
            "transfers/bulk-action",
            200,
            data=bulk_data
        )
        
        if success and 'successful' in response:
            print(f"   ✅ Bulk {action}: {response.get('successful')}/{response.get('total_requested')} successful")
            return True
        return False

    def test_filtered_transfers(self):
        """Test transfer filtering"""
        # Test status filter
        success, response = self.run_test(
            "Get Transfers (Status Filter)",
            "GET",
            "transfers?status=pending",
            200
        )
        
        if success:
            print(f"   ✅ Pending transfers: {len(response)}")
        
        # Test type filter
        success2, response2 = self.run_test(
            "Get Transfers (Type Filter)",
            "GET",
            "transfers?transfer_type=SWIFT-MT",
            200
        )
        
        if success2:
            print(f"   ✅ SWIFT-MT transfers: {len(response2)}")
            
        return success and success2

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "transfers",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

def main():
    print("🏦 K3RN3L 808 Banking Simulation API Testing")
    print("=" * 50)
    
    # Initialize tester
    tester = K3RN3LBankingAPITester()
    
    # Test sequence
    print("\n📋 Running Authentication Tests...")
    
    # Test invalid login first
    if not tester.test_invalid_login():
        print("❌ Invalid login test failed")
        return 1
    
    # Test valid login
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1
    
    # Test unauthorized access
    if not tester.test_unauthorized_access():
        print("❌ Unauthorized access test failed")
    
    print("\n📋 Running Transfer Tests...")
    
    # Test transfer creation
    transfer_id = tester.test_create_transfer()
    if not transfer_id:
        print("❌ Transfer creation failed")
        return 1
    
    # Test getting all transfers
    if not tester.test_get_transfers():
        print("❌ Get transfers failed")
    
    # Test getting specific transfer
    if not tester.test_get_specific_transfer(transfer_id):
        print("❌ Get specific transfer failed")
    
    # Test transfer action
    if not tester.test_transfer_action(transfer_id, "approve"):
        print("❌ Transfer action failed")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())