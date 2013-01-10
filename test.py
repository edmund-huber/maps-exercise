import os
import unittest
import webtest

os.environ['DATABASE_URL'] = 'postgres://places:places@localhost/test'
import api

class TestCase(unittest.TestCase):

    def setUp(self):
        # Get a fresh database.
        self.cur = api.conn.cursor()
        for line in open('scaffold.sql'):
            self.cur.execute(line)

        # WSGI test harness.
        self.app = webtest.TestApp(api.app)

class TestTestCase(TestCase):

    def isolation_test(self):
        self.cur.execute('select * from places')
        self.assertTrue(self.cur.fetchall() == [])
        self.cur.execute("insert into places (longitude, latitude, name, address) values (20, 30, 'foo', 'bar')")

    test_isolation1 = isolation_test
    test_isolation2 = isolation_test

class TestBasicAPIFunctionality(TestCase):

    def test_new(self):
        resp = self.app.post('/api/new', {
                'name': 'just a place',
                'longitude': 32,
                'latitude': 20,
                'address': 'an address'
                })
        self.assertTrue(resp.json == {'id': 1})
        return resp.json['id']

    def test_update(self):
        i = self.test_new()
        new_info = {
            'id': i,
            'name': 'hi',
            'address': '125152 dfsafasfdsa',
            'longitude': 55,
            'latitude': 90
            }
        self.app.post('/api/update', new_info)
        resp = self.app.get('/api/view/%s' % i)
        self.assertTrue(resp.json == new_info)

    def test_delete(self):
        i = self.test_new()
        self.app.post('/api/delete', {'id': i})
        self.assertTrue(self.app.get('/api/view/%s' % i).json == {})

    def test_all_in_bounds(self):
        i = self.test_new()
        resp = self.app.get('/api/all-in-bounds/10,10,40,40')
        self.assertTrue(len(resp.json['results']) == 1)

    def test_all(self):
        i = self.test_new()
        # First call out: no offset, you are given one.
        resp = self.app.get('/api/all')
        self.assertTrue(len(resp.json['results']) == 1)
        self.assertTrue(resp.json['offset'] == 1)
        # Now, with the offset. If there are no results then you don't
        # do another call.
        resp = self.app.get('/api/all/%s' % resp.json['offset'])
        self.assertTrue(len(resp.json['results']) == 0)
        self.assertTrue(resp.json['offset'] == 1)

if __name__ == '__main__':
    unittest.main()
