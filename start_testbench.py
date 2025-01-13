#!/usr/bin/python3
import http.server
import socketserver
import sys

PORT = 8000
# One can specify the HTTP server port as a command-line parameter, e.g.
# ./start-server.py 8001
if len(sys.argv) == 2:
    PORT = int(sys.argv[1])


Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
