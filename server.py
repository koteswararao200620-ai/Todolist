"""
Dayflow - Local Development Server
Provides an HTTP server for Dayflow to ensure the HTML5 Web Notification API
and Web Audio API function with full browser permissions.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def guess_type(self, path):
        ctype = super().guess_type(path)
        if ctype.startswith('text/') or ctype in ('application/javascript', 'application/json'):
            return f"{ctype}; charset=utf-8"
        return ctype

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    
    global PORT
    for attempt_port in range(PORT, PORT + 20):
        try:
            httpd = socketserver.TCPServer(("", attempt_port), Handler)
            PORT = attempt_port
            break
        except OSError:
            continue
    else:
        print("Error: Could not bind to an available port between 8000 and 8020.")
        sys.exit(1)

    url = f"http://localhost:{PORT}"
    print("=" * 60)
    print(" Dayflow - Daily Task & Habit Tracker")
    print(f" Local Web Server: {url}")
    print("=" * 60)
    print("Press Ctrl+C to stop the server at any time.\n")
    
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server. Goodbye!")
        sys.exit(0)

if __name__ == '__main__':
    run_server()
