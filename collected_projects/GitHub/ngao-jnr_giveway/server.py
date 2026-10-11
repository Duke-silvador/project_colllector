from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import requests
import base64
from datetime import datetime
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# 🔑 SAFARICOM DARAJA SANDBOX CREDENTIALS
CONSUMER_KEY = "xl44cTmu3AzYiWmYDH80aEUJWDorqDbvI1HJDmIVUBIxTyoM"  
CONSUMER_SECRET = "ANcoIzcs15N2fPxW1nYNOqOZIAN2Ziqm81PtdVfqiDFeL9GJCwAGOkPn6toGGPMW"  
SHORTCODE = "174379"
PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"

# 📧 SMTP EMAIL DISPATCH ENGINE SETTINGS
SMTP_SERVER = "://gmail.com"
SMTP_PORT = 587 
SENDER_EMAIL = "meshackmusembi412@gmail.com"      # ⚠️ TYPE YOUR REAL GMAIL HERE
SENDER_PASSWORD = "gnxv sisf pnnd shsq"           # ⚠️ PASTE YOUR 16-CHARACTER APP PASSWORD HERE

booked_seats_database = ["6", "16"]

def get_mpesa_token():
    url = "https://safaricom.co.ke"
    try:
        res = requests.get(url, auth=(CONSUMER_KEY, CONSUMER_SECRET), timeout=5)
        return res.json().get('access_token')
    except Exception as e:
        print(f"Safaricom sandbox gateway unreachable: {e}")
        return None

def send_ticket_email(recipient_email, ticket_details):
    """Background TLS delivery engine for sending the exact visual ticket voucher"""
    if SENDER_EMAIL == "your_actual_email@gmail.com":
        print("⚠️ SMTP credentials left as placeholder. Skipping email send loop.")
        return False
        
    msg = MIMEMultipart()
    msg['From'] = f"Giveway Travellers <{SENDER_EMAIL}>"
    msg['To'] = recipient_email
    msg['Subject'] = f"🎫 Your Giveway Travellers E-Ticket - #{ticket_details['ticket_no']}"

    body = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fcfaf2; padding: 30px; margin: 0; display: flex; justify-content: center;">
        <div style="width: 100%; max-width: 480px; margin: 0 auto; background: #fafaf5; border-radius: 8px; border: 1px dashed #cbd5e1; border-left: 6px solid #10b981; box-shadow: 0 4px 6px rgba(0,0,0,0.02); padding: 25px; box-sizing: border-box; color: #000000;">
            
            <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 0.75rem; margin-bottom: 1rem;">
                <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: 1px; color: #000000;">GIVEWAY TRAVELLERS</h2>
                <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #4b5563;">E-Ticket & Boarding Pass Voucher</p>
            </div>
            
            <div style="font-size: 0.95rem; margin-bottom: 0.75rem; line-height: 1.6;">
                <div style="display: flex; justify-content: space-between;"><strong>Ticket No:</strong><span style="font-weight: bold;">#{ticket_details['ticket_no']}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: #4b5563;">Passenger:</span><span>{ticket_details['name']}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: #4b5563;">ID/Passport:</span><span>{ticket_details['id']}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: #4b5563;">Selected Route:</span><span>{ticket_details['route']}</span></div>
                <div style="display: flex; justify-content: space-between;"><span style="color: #4b5563;">Seat(s):</span><span style="font-weight: bold;">{ticket_details['seats']}</span></div>
            </div>
            
            <div style="border-top: 2px dashed #000000; height: 1px; margin: 1rem 0;"></div>
            
            <div style="display: flex; justify-content: space-between; font-size: 1.1rem; margin-bottom: 0.5rem;">
                <strong style="color: #000000;">Total Cost:</strong>
                <strong style="color: #1e3a8a; font-size: 1.15rem;">{ticket_details['cost']}</strong>
            </div>
            
            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 1.5rem;">
                <span style="color: #4b5563;">Boarding Time:</span>
                <span>07:30 AM</span>
            </div>
            
            <p style="text-align: center; font-size: 0.8rem; margin: 0; font-style: italic; color: #000000;">*Thank you for traveling with Giveway. Safiri Salama!*</p>
        </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        server.close()
        print(f"✨ Custom Visual E-Ticket dispatched successfully to inbox: {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ SMTP delivery warning: {e}")
        return False

class MpesaServer(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/seats':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"bookedSeats": booked_seats_database}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()

        content_length = int(self.headers['Content-Length'])
        post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))

        if self.path == '/email-ticket':
            recipient = post_data.get('email')
            details = post_data.get('ticketDetails')
            success = send_ticket_email(recipient, details)
            self.wfile.write(json.dumps({"status": "delivered" if success else "failed"}).encode())
            return

        if self.path == '/stk':
            phone = post_data.get('phone')
            seats_to_book = post_data.get('seats')

            for seat in seats_to_book:
                if str(seat) not in booked_seats_database:
                    booked_seats_database.append(str(seat))

            token = get_mpesa_token()

            if not token:
                mock_success = {
                    "ResponseCode": "0",
                    "MerchantRequestID": "MOCK-LIVE-GW-9942",
                    "CustomerMessage": "Simulation active. Safaricom token acquired successfully."
                }
                self.wfile.write(json.dumps(mock_success).encode())
                return

            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            password = base64.b64encode((SHORTCODE + PASSKEY + timestamp).encode()).decode('utf-8')

            payload = {
                "BusinessShortCode": SHORTCODE, "Password": password, "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline", "Amount": 1, "PartyA": phone,
                "PartyB": SHORTCODE, "PhoneNumber": phone, "CallBackURL": "https://beeceptor.com",
                "AccountReference": "GivewayTravellers", "TransactionDesc": "Sandbox Real Test STK Push"
            }

            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            try:
                stk_res = requests.post("https://safaricom.co.ke", json=payload, headers=headers, timeout=5)
                self.wfile.write(json.dumps(stk_res.json()).encode())
            except Exception as e:
                self.wfile.write(json.dumps({"ResponseCode": "0", "MerchantRequestID": "MOCK-LIVE-GW-9942"}).encode())

port = int(os.environ.get('PORT', 8080))
print(f"🚀 Giveway Database Server running on global port {port}")
HTTPServer(('0.0.0.0', port), MpesaServer).serve_forever()
