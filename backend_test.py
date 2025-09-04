import requests
import sys
import json
from datetime import datetime

class K3RN3LBankingAPITester:
    def __init__(self, base_url="https://repo-checkup-3.preview.emergentagent.com"):
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
            "password": "Chotti-Tannu9"
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
            "sender_name": "JPMorgan Chase",
            "sender_bic": "CHASUS33XXX",
            "receiver_name": "HSBC Bank", 
            "receiver_bic": "HBUKGB4BXXX",
            "transfer_type": "SWIFT-MT",
            "amount": 75000,
            "currency": "USD",
            "reference": "TRK123456789",
            "purpose": "Testing transfer tracking with detailed stages"
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
            print(f"   ✅ Current stage: {response.get('current_stage')}")
            print(f"   ✅ Current stage index: {response.get('current_stage_index')}")
            print(f"   ✅ Stages count: {len(response.get('stages', []))}")
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

    def test_advance_stage(self, transfer_id):
        """Test advancing transfer to next stage"""
        if not transfer_id:
            print("❌ No transfer ID provided")
            return False
            
        stage_data = {
            "transfer_id": transfer_id
        }
        
        success, response = self.run_test(
            f"Advance Transfer Stage",
            "POST",
            "transfers/advance-stage",
            200,
            data=stage_data
        )
        
        if success and response.get('status') == 'success':
            print(f"   ✅ Stage advanced from '{response.get('previous_stage')}' to '{response.get('current_stage')}'")
            return True
        return False

    def test_detailed_stage_system(self, transfer_id):
        """Test the detailed stage system by checking transfer stages"""
        if not transfer_id:
            print("❌ No transfer ID provided")
            return False
            
        success, response = self.run_test(
            f"Get Transfer with Stages",
            "GET",
            f"transfers/{transfer_id}",
            200
        )
        
        if success and 'stages' in response:
            stages = response['stages']
            print(f"   ✅ Transfer has {len(stages)} stages")
            
            # Check expected stages
            expected_stages = [
                "Initiated", "Validation", "Compliance Check", "Authorization", 
                "Processing", "Network Transmission", "Intermediary Bank", 
                "Final Settlement", "Completed"
            ]
            
            stage_names = [stage['stage_name'] for stage in stages]
            print(f"   ✅ Stage names: {stage_names}")
            
            # Verify all expected stages are present
            missing_stages = [stage for stage in expected_stages if stage not in stage_names]
            if missing_stages:
                print(f"   ❌ Missing stages: {missing_stages}")
                return False
            
            # Check first stage is completed
            if stages[0]['status'] == 'completed':
                print(f"   ✅ First stage '{stages[0]['stage_name']}' is completed")
            else:
                print(f"   ❌ First stage should be completed, but status is: {stages[0]['status']}")
                return False
                
            # Check stage logs
            completed_stages = [stage for stage in stages if stage['status'] == 'completed']
            for stage in completed_stages:
                if stage['logs'] and len(stage['logs']) > 0:
                    print(f"   ✅ Stage '{stage['stage_name']}' has {len(stage['logs'])} logs")
                else:
                    print(f"   ❌ Stage '{stage['stage_name']}' should have logs")
                    return False
            
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

    # Enhanced Features Testing Methods
    
    def test_exchange_rates_health(self):
        """Test exchange rates service health"""
        success, response = self.run_test(
            "Exchange Rates Health Check",
            "GET",
            "exchange-rates/health",
            200
        )
        
        if success and response.get('status') == 'healthy':
            print(f"   ✅ Exchange rates service is healthy")
            return True
        return False

    def test_supported_currencies(self):
        """Test getting supported currencies"""
        success, response = self.run_test(
            "Get Supported Currencies",
            "GET",
            "exchange-rates/supported-currencies",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   ✅ Retrieved {len(response)} supported currencies")
            print(f"   ✅ Sample currencies: {response[:5]}")
            return True
        return False

    def test_latest_exchange_rates(self):
        """Test getting latest exchange rates"""
        success, response = self.run_test(
            "Get Latest Exchange Rates",
            "GET",
            "exchange-rates/latest?base_currency=USD",
            200
        )
        
        if success and 'rates' in response:
            print(f"   ✅ Retrieved rates for {response.get('rate_count', 0)} currencies")
            print(f"   ✅ Base currency: {response.get('base_currency')}")
            return True
        return False

    def test_currency_conversion(self):
        """Test currency conversion"""
        conversion_data = {
            "from_currency": "USD",
            "to_currency": "EUR",
            "amount": "1000.00"
        }
        
        success, response = self.run_test(
            "Currency Conversion",
            "POST",
            "exchange-rates/convert",
            200,
            data=conversion_data
        )
        
        if success and 'converted_amount' in response:
            print(f"   ✅ Converted {response.get('original_amount')} {response.get('from_currency')} to {response.get('converted_amount')} {response.get('to_currency')}")
            print(f"   ✅ Exchange rate: {response.get('exchange_rate')}")
            return True
        return False

    def test_market_summary(self):
        """Test market summary"""
        success, response = self.run_test(
            "Market Summary",
            "GET",
            "exchange-rates/market-summary",
            200
        )
        
        if success and 'total_pairs' in response:
            print(f"   ✅ Market summary with {response.get('total_pairs')} pairs")
            print(f"   ✅ Market status: {response.get('market_status')}")
            return True
        return False

    def test_analytics_health(self):
        """Test analytics service health"""
        success, response = self.run_test(
            "Analytics Health Check",
            "GET",
            "analytics/health",
            200
        )
        
        if success and response.get('status') == 'healthy':
            print(f"   ✅ Analytics service is healthy")
            print(f"   ✅ ML models loaded: {response.get('ml_models_loaded')}")
            return True
        return False

    def test_transaction_analytics(self):
        """Test transaction analytics"""
        success, response = self.run_test(
            "Transaction Analytics",
            "GET",
            "analytics/transaction-analytics",
            200
        )
        
        if success and 'total_transactions' in response:
            print(f"   ✅ Analytics for {response.get('total_transactions')} transactions")
            print(f"   ✅ Total volume: {response.get('total_volume')}")
            return True
        return False

    def test_risk_scoring(self):
        """Test risk scoring with sample transfer data"""
        risk_data = {
            "transfer_id": "test_transfer_123",
            "amount": 75000,
            "currency": "USD",
            "sender_bic": "CHASUS33XXX",
            "receiver_bic": "HBUKGB4BXXX",
            "sender_name": "JPMorgan Chase",
            "receiver_name": "HSBC Bank"
        }
        
        success, response = self.run_test(
            "Risk Score Calculation",
            "POST",
            "analytics/risk-score",
            200,
            data=risk_data
        )
        
        if success and 'risk_score' in response:
            print(f"   ✅ Risk score: {response.get('risk_score')}")
            print(f"   ✅ Risk level: {response.get('risk_level')}")
            print(f"   ✅ Confidence: {response.get('confidence')}")
            return True
        return False

    def test_fraud_detection(self):
        """Test fraud detection"""
        fraud_data = {
            "transfer_id": "test_transfer_456",
            "amount": 250000,
            "currency": "USD",
            "sender_bic": "UNKNOWNXXX",
            "receiver_bic": "SUSPICIOUSXXX",
            "sender_name": "Suspicious Entity",
            "receiver_name": "High Risk Receiver"
        }
        
        success, response = self.run_test(
            "Fraud Detection",
            "POST",
            "analytics/fraud-detection",
            200,
            data=fraud_data
        )
        
        if success and 'fraud_detected' in response:
            print(f"   ✅ Fraud detection completed")
            print(f"   ✅ Fraud detected: {response.get('fraud_detected')}")
            if response.get('fraud_detected'):
                alert = response.get('alert', {})
                print(f"   ✅ Alert severity: {alert.get('severity')}")
            return True
        return False

    def test_fraud_alerts(self):
        """Test getting fraud alerts"""
        success, response = self.run_test(
            "Get Fraud Alerts",
            "GET",
            "analytics/fraud-alerts",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} fraud alerts")
            return True
        return False

    def test_documents_health(self):
        """Test documents service health"""
        success, response = self.run_test(
            "Documents Health Check",
            "GET",
            "documents/health",
            200
        )
        
        if success and response.get('status') == 'healthy':
            print(f"   ✅ Documents service is healthy")
            print(f"   ✅ Supported banks: {response.get('supported_banks')}")
            return True
        return False

    def test_supported_banks(self):
        """Test getting supported banks"""
        success, response = self.run_test(
            "Get Supported Banks",
            "GET",
            "documents/supported-banks",
            200
        )
        
        if success and 'supported_banks' in response:
            banks = response.get('supported_banks', [])
            print(f"   ✅ Retrieved {len(banks)} supported banks")
            if banks:
                print(f"   ✅ Sample bank: {banks[0].get('bank_name')}")
            return True
        return False

    def test_document_generation(self):
        """Test document generation with Deutsche Bank template"""
        doc_data = {
            "transfer_data": {
                "transfer_id": "TRK123456789",
                "sender_name": "JPMorgan Chase",
                "sender_bic": "CHASUS33XXX",
                "receiver_name": "HSBC Bank",
                "receiver_bic": "HBUKGB4BXXX",
                "amount": 75000,
                "currency": "USD",
                "reference": "TRK123456789",
                "purpose": "Testing document generation"
            },
            "bank_code": "DEUTDEFFXXX",
            "include_qr_code": True,
            "include_barcode": True,
            "watermark": "EDUCATIONAL SIMULATION"
        }
        
        success, response = self.run_test(
            "Generate Balance Sheet Document",
            "POST",
            "documents/generate/balance_sheet",
            200,
            data=doc_data
        )
        
        if success and response.get('success'):
            print(f"   ✅ Document generated successfully")
            print(f"   ✅ Document ID: {response.get('document_id')}")
            print(f"   ✅ Bank code: {response.get('bank_code')}")
            print(f"   ✅ File size: {response.get('file_size')} bytes")
            return response.get('document_id')
        return None

    def test_system_health(self):
        """Test overall system health"""
        success, response = self.run_test(
            "System Health Check",
            "GET",
            "health",
            200
        )
        
        if success:
            print(f"   ✅ System health check passed")
            return True
        return False

def main():
    print("🏦 K3RN3L 808 Enhanced Banking Simulation API Testing")
    print("=" * 60)
    
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
    
    # Test system health
    print("\n📋 Running System Health Tests...")
    if not tester.test_system_health():
        print("❌ System health check failed")
    
    # Test Enhanced Features - Exchange Rates Service
    print("\n📋 Running Exchange Rates Service Tests...")
    
    if not tester.test_exchange_rates_health():
        print("❌ Exchange rates health check failed")
    
    if not tester.test_supported_currencies():
        print("❌ Supported currencies test failed")
    
    if not tester.test_latest_exchange_rates():
        print("❌ Latest exchange rates test failed")
    
    if not tester.test_currency_conversion():
        print("❌ Currency conversion test failed")
    
    if not tester.test_market_summary():
        print("❌ Market summary test failed")
    
    # Test Enhanced Features - Analytics & Intelligence Service
    print("\n📋 Running Analytics & Intelligence Service Tests...")
    
    if not tester.test_analytics_health():
        print("❌ Analytics health check failed")
    
    if not tester.test_transaction_analytics():
        print("❌ Transaction analytics test failed")
    
    if not tester.test_risk_scoring():
        print("❌ Risk scoring test failed")
    
    if not tester.test_fraud_detection():
        print("❌ Fraud detection test failed")
    
    if not tester.test_fraud_alerts():
        print("❌ Fraud alerts test failed")
    
    # Test Enhanced Features - Professional Document Service
    print("\n📋 Running Professional Document Service Tests...")
    
    if not tester.test_documents_health():
        print("❌ Documents health check failed")
    
    if not tester.test_supported_banks():
        print("❌ Supported banks test failed")
    
    document_id = tester.test_document_generation()
    if not document_id:
        print("❌ Document generation test failed")
    else:
        print(f"✅ Document generation successful: {document_id}")
    
    # Test Original SWIFT Banking Features
    print("\n📋 Running Original SWIFT Banking Features Tests...")
    
    # Test transfer creation - create multiple transfers for bulk testing
    transfer_ids = []
    for i in range(3):
        transfer_id = tester.test_create_transfer()
        if transfer_id:
            transfer_ids.append(transfer_id)
    
    if len(transfer_ids) == 0:
        print("❌ Transfer creation failed")
        return 1
    
    print(f"✅ Created {len(transfer_ids)} transfers for testing")
    
    # Test getting all transfers
    if not tester.test_get_transfers():
        print("❌ Get transfers failed")
    
    # Test getting specific transfer
    if not tester.test_get_specific_transfer(transfer_ids[0]):
        print("❌ Get specific transfer failed")
    
    # Test transfer stats
    if not tester.test_transfer_stats():
        print("❌ Transfer stats failed")
    
    # Test filtered transfers
    if not tester.test_filtered_transfers():
        print("❌ Filtered transfers failed")
    
    print("\n📋 Running Stage System Tests...")
    
    # Test detailed stage system
    if not tester.test_detailed_stage_system(transfer_ids[0]):
        print("❌ Detailed stage system test failed")
    
    # Test stage advancement (advance a few stages)
    print("\n📋 Testing Stage Advancement...")
    for i in range(3):  # Advance 3 stages
        if not tester.test_advance_stage(transfer_ids[0]):
            print(f"❌ Stage advancement {i+1} failed")
            break
        else:
            print(f"   ✅ Stage advancement {i+1} successful")
    
    # Check transfer after stage advancements
    if not tester.test_detailed_stage_system(transfer_ids[0]):
        print("❌ Stage system verification after advancement failed")
    
    print("\n📋 Running Transfer Action Tests...")
    
    # Test individual transfer action (use a different transfer)
    if len(transfer_ids) > 1:
        if not tester.test_transfer_action(transfer_ids[1], "approve"):
            print("❌ Transfer action failed")
    
    # Test bulk transfer actions (use remaining transfers)
    if len(transfer_ids) > 2:
        if not tester.test_bulk_transfer_action(transfer_ids[2:], "hold"):
            print("❌ Bulk transfer action failed")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Enhanced K3RN3L 808 Banking API is working correctly.")
        print("✅ Exchange Rate Service: Operational")
        print("✅ Analytics & Intelligence Service: Operational") 
        print("✅ Professional Document Service: Operational")
        print("✅ Original SWIFT Banking Features: Operational")
        return 0
    else:
        failed_count = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_count} tests failed out of {tester.tests_run} total tests.")
        success_rate = (tester.tests_passed / tester.tests_run) * 100
        print(f"📈 Success Rate: {success_rate:.1f}%")
        return 1

if __name__ == "__main__":
    sys.exit(main())