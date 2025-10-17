from flask import Flask, request, send_file, jsonify
import os, shutil

app = Flask(__name__)
VIDEO_DIR = "/videos"
os.makedirs(VIDEO_DIR, exist_ok=True)

@app.route('/save', methods=['POST'])
def save():
    data = request.json
    src = data['path']
    dst = os.path.join(VIDEO_DIR, os.path.basename(src))
    shutil.move(src, dst)
    return jsonify({"status": "saved", "path": dst})

@app.route('/read/<filename>', methods=['GET'])
def read(filename):
    path = os.path.join(VIDEO_DIR, filename)
    if os.path.exists(path):
        return send_file(path)
    return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
