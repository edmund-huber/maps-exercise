from bottle import get, mako_view, post

import api

@get('/')
@mako_view('home')
def home():
    return {}

from bottle import static_file
@get('/static/<s>')
def static(s):
    return static_file(s, root='static')

if __name__ == '__main__':
    import os
    from bottle import run
    port = int(os.environ.get('PORT', 8000))
    run(host='0.0.0.0', port=port)

