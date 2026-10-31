import os, json, re, base64, time, urllib.request, sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from email.utils import parsedate_to_datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

CLIENT_SECRET_FILE = 'client_secret.json'
TOKEN_FILE = 'gmail_token.json'
WORKER_URL = 'https://cathysync.frankataix.workers.dev/'
GMAIL_QUERY = "newer_than:30d"
SLEEP_SECONDS = 1.0

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


def get_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
            creds = flow.run_local_server(port=0, open_browser=False)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)


def decode_body(part):
    data = part.get('body', {}).get('data', '')
    if not data:
        return ''
    try:
        return base64.urlsafe_b64decode(data + '==').decode('utf-8', errors='ignore')
    except Exception:
        return ''


def get_text(payload):
    if payload.get('mimeType') == 'text/plain' and 'data' in payload.get('body', {}):
        return decode_body(payload)
    if payload.get('mimeType') == 'text/html' and 'data' in payload.get('body', {}):
        html = decode_body(payload)
        return re.sub(r'<[^>]+>', ' ', html).strip()
    for part in payload.get('parts', []):
        txt = get_text(part)
        if txt:
            return txt
    return ''


def parse_message(msg):
    headers = {h['name'].lower(): h['value'] for h in msg['payload']['headers']}
    subject = headers.get('subject', '(no subject)')
    from_ = headers.get('from', '')
    date_hdr = headers.get('date', '')
    try:
        dt = parsedate_to_datetime(date_hdr)
        date = dt.isoformat()
    except Exception:
        date = datetime.utcnow().isoformat()
    text = get_text(msg['payload'])
    if len(text) > 1200:
        text = text[:1200]
    return {
        'subject': subject,
        'from': from_,
        'date': date,
        'body': text or '（无正文）'
    }


def existing_subjects():
    try:
        req = urllib.request.Request(
            'https://raw.githubusercontent.com/frankataix-gif/cathy-fencing/main/cathy_data/emails.md?nocache=' + str(int(time.time())),
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        text = urllib.request.urlopen(req, timeout=20).read().decode('utf-8')
        pattern = r'##\s*\[[^\]]+\]\s*(.+?)(?:\n)+\*\*发件人:\*\*\s*(.+?)\n\*\*日期:\*\*\s*(.+?)\n'
        matches = re.findall(pattern, text)
        return set(f"{s}|{f}|{d}" for s, f, d in matches)
    except Exception as e:
        print('无法读取现有 emails.md:', e)
        return set()


def post_to_worker(email):
    body = json.dumps({'action': 'email', 'email': email}).encode('utf-8')
    req = urllib.request.Request(
        WORKER_URL,
        data=body,
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://frankataix-gif.github.io/'
        }
    )
    last_err = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode('utf-8')
        except Exception as e:
            last_err = e
            time.sleep(3 * (attempt + 1))
    raise last_err


def main():
    service = get_service()
    existing = existing_subjects()
    messages = []
    page_token = None
    while True:
        results = service.users().messages().list(userId='me', q=GMAIL_QUERY, maxResults=500, pageToken=page_token).execute()
        batch = results.get('messages', [])
        messages.extend(batch)
        page_token = results.get('nextPageToken')
        if not page_token or not batch:
            break
    print(f'查到 {len(messages)} 封邮件，开始导入...', flush=True)

    for i, msg_meta in enumerate(messages, 1):
        msg = None
        for attempt in range(3):
            try:
                msg = service.users().messages().get(userId='me', id=msg_meta['id'], format='full').execute()
                break
            except Exception as e:
                print(f'[{i}/{len(messages)}] 获取邮件失败（重试 {attempt+1}/3）：{e}')
                time.sleep(5)
        if not msg:
            print(f'[{i}/{len(messages)}] 跳过该邮件')
            continue
        email = parse_message(msg)
        key = f"{email['subject']}|{email['from']}|{email['date']}"
        if key in existing:
            print(f'[{i}/{len(messages)}] 已存在，跳过：{email["subject"]}')
            continue
        print(f'[{i}/{len(messages)}] 导入：{email["subject"]} ...')
        try:
            post_to_worker(email)
            existing.add(key)
            time.sleep(SLEEP_SECONDS)
        except Exception as e:
            print(f'  失败：{e}')
            time.sleep(3)

    print('导入完成。')


if __name__ == '__main__':
    main()
