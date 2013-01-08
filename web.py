from bottle import get, mako_view

@get('/')
@mako_view('home')
def home():
    return {}

from bottle import static_file
@get('/static/<s>')
def static(s):
    return static_file(s, root='static')

if __name__ == '__main__':
    from bottle import run
    run(host='localhost', port=8000)

