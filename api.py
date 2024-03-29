from bottle import HTTPError, HTTPResponse, default_app, get, post, request, response
import os
import psycopg2
import psycopg2.extras
from urlparse import urlparse

# Connect to Heroku postgres.
u = urlparse(os.environ['DATABASE_URL'])
conn = psycopg2.connect(host=u.hostname, port=u.port, user=u.username, password=u.password, database=u.path[1:])
conn.autocommit = True

app = default_app()

def api(f):
    def wrapped(*args, **kwargs):
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            return f(cur, *args, **kwargs)
        except Exception, e:
            raise HTTPError(400)
    return wrapped

@post('/api/new')
@api
def new(cur):
    cur.execute('insert into places (longitude, latitude, address, name) values (%s, %s, %s, %s) returning id', (
            request.forms['longitude'],
            request.forms['latitude'],
            request.forms['address'],
            request.forms['name']
            ))
    return {'id': cur.fetchone()['id']}

@post('/api/update')
@api
def update(cur):
    cur.execute('update places set longitude=%s, latitude=%s, address=%s, name=%s where id=%s', (
            request.forms['longitude'],
            request.forms['latitude'],
            request.forms['address'],
            request.forms['name'],
            request.forms['id']
            ))
    return None

@post('/api/delete')
@api
def delete(cur):
    cur.execute('delete from places where id=%s', (request.forms['id'],))
    return None

@get('/api/view/:i')
@api
def view(cur, i):
    cur.execute('select * from places where id=%s', (i,))
    return cur.fetchone() or {}

@get('/api/all-in-bounds/:google_bounds')
@api
def all_in_bounds(cur, google_bounds):
    min_lat, min_lng, max_lat, max_lng = map(float, google_bounds.split(','))
    cur.execute('select * from places where longitude > %s and longitude < %s and latitude > %s and latitude < %s', (min_lng, max_lng, min_lat, max_lat))
    return {'results': cur.fetchmany(100)}

@get('/api/all')
@get('/api/all/:offset')
@api
def all(cur, offset=0):
    offset = int(offset)
    cur.execute('select * from places limit 100 offset %s', (offset,))
    results = cur.fetchall()
    return {
        'results': results,
        'offset': offset + len(results)
        }
