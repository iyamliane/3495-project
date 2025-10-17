import json
import os
from werkzeug.security import generate_password_hash

USERS_FILE = 'users.json'
BACKUP_FILE = 'users.json.bak'

if not os.path.exists(USERS_FILE):
    print("No users.json found")
    raise SystemExit(1)

with open(USERS_FILE, 'r') as f:
    users = json.load(f)

# backup
if os.path.exists(BACKUP_FILE):
    print(f"Backup file {BACKUP_FILE} already exists. Aborting to avoid overwrite.")
    raise SystemExit(1)

os.rename(USERS_FILE, BACKUP_FILE)

hashed = {}
for u, p in users.items():
    # skip already-hashed values
    if isinstance(p, str) and p.startswith('pbkdf2:'):
        hashed[u] = p
    else:
        hashed[u] = generate_password_hash(p)

with open(USERS_FILE, 'w') as f:
    json.dump(hashed, f)

print(f"Migration complete. Original saved as {BACKUP_FILE}")
