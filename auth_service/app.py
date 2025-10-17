from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import json
import os
import datetime

app = Flask(__name__)
CORS(app)

# configuration: use environment variable for secret in production
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-change-me')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)

jwt = JWTManager(app)

USERS_FILE = 'users.json'

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    # default users (for demo) - these will be plain-text until migrated
    return {"leeanne": "password123", "admin": "adminpass"}

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)

USERS = load_users()


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"status": "error", "message": "username and password required"}), 400
    username = data['username']
    password = data['password']
    stored = USERS.get(username)
    # if stored is None -> user not found
    if not stored:
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401

    # Determine if stored password is hashed (it will contain '$' for werkzeug hashes)
    try:
        password_matches = False
        if isinstance(stored, str) and (':' in stored):
            # werkzeug hashed values include the algorithm prefix (e.g. 'pbkdf2:' or 'scrypt:'),
            # so if we see a colon assume it's a hashed value and verify with check_password_hash.
            password_matches = check_password_hash(stored, password)
        else:
            # legacy plaintext entry (before migration)
            password_matches = (stored == password)

        if password_matches:
            access_token = create_access_token(identity=username)
            return jsonify({"status": "success", "access_token": access_token})
        else:
            return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    except Exception:
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"status": "error", "message": "username and password required"}), 400
    username = data['username']
    password = data['password']
    if username in USERS:
        return jsonify({"status": "error", "message": "User already exists"}), 409

    USERS[username] = generate_password_hash(password)
    try:
        save_users(USERS)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to save user: {e}"}), 500
    return jsonify({"status": "success", "message": "User created"}), 201


@app.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_jwt_identity()
    return jsonify({"username": user})


@app.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    # admin-only endpoint to list registered usernames
    user = get_jwt_identity()
    if user != 'admin':
        return jsonify({"status": "error", "message": "Forbidden"}), 403
    return jsonify({"users": list(USERS.keys())})


if __name__ == '__main__':
    # ensure users file exists
    try:
        save_users(USERS)
    except Exception:
        pass
    app.run(host='0.0.0.0', port=5000)
