#!/usr/bin/python3
import http.server
import socketserver
import sys

PORT = 8000
# One can specify the HTTP server port as a command-line parameter, e.g.
# ./start-server.py 8001
if len(sys.argv) == 2:
    PORT = int(sys.argv[1])


class TestbenchHandler(http.server.SimpleHTTPRequestHandler):
    """
    Modified SimpleHTTPRequestHandler from
    https://github.com/python/cpython/blob/3.10/Lib/http/server.py#L643.
    Serves development version of file odsaAV-min.js.
    See lib/mock-ajax/README.md.
    """

    def send_head(self):
        """Common code for GET and HEAD commands.

        This sends the response code and MIME headers.

        Return value is either a file object (which has to be copied
        to the outputfile by the caller unless the command was HEAD,
        and must be closed by the caller under all circumstances), or
        None, in which case the caller has nothing further to do.
        """

        if self.path == "/lib/odsaAV-min.js":
            self.path = "/lib/mock-ajax/odsaAV-min.js"

        return super().send_head()


Handler = TestbenchHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
