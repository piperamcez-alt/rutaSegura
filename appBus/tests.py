import json
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import Client, TestCase, override_settings

SB = {'SUPABASE_URL': 'https://demo.supabase.co', 'SUPABASE_KEY': 'anon-test-key'}

VALID = {
    'nombre': 'Camila', 'apellido': 'Soto', 'correo': 'Camila@Ejemplo.cl',
    'nombre_alumno': 'Lucas Soto', 'curso': '3° Básico',
    'password': 'Clave1234', 'rol': 'apoderado',
}
PROFILE = {
    'id': 'uid-1', 'nombre': 'Camila', 'apellido': 'Soto', 'correo': 'camila@ejemplo.cl',
    'nombre_alumno': 'Lucas Soto', 'curso': '3° Básico', 'rol': 'apoderado',
}


def fake_response(status=200, data=None):
    r = MagicMock()
    r.status_code = status
    r.content = b'x' if data is not None else b''
    r.json.return_value = data if data is not None else {}
    return r


def post(client, url, payload):
    return client.post(url, data=json.dumps(payload), content_type='application/json')


@override_settings(**SB)
class RegisterTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.client.get('/')  # entrega la cookie CSRF
        self.token = self.client.cookies['csrftoken'].value

    def _post(self, payload):
        return self.client.post('/api/auth/register/', data=json.dumps(payload),
                                content_type='application/json', HTTP_X_CSRFTOKEN=self.token)

    def test_requires_csrf(self):
        r = Client(enforce_csrf_checks=True).post('/api/auth/register/', data='{}', content_type='application/json')
        self.assertEqual(r.status_code, 403)

    def test_missing_fields(self):
        r = self._post({'password': 'x'})
        self.assertEqual(r.status_code, 422)
        fields = r.json()['fieldErrors']
        for f in ('nombre', 'apellido', 'correo', 'nombre_alumno', 'curso', 'password'):
            self.assertIn(f, fields)

    def test_invalid_email_and_weak_password(self):
        r = self._post({**VALID, 'correo': 'no-es-correo', 'password': 'corta'})
        self.assertEqual(r.status_code, 422)
        self.assertIn('correo', r.json()['fieldErrors'])
        self.assertIn('password', r.json()['fieldErrors'])

    def test_driver_does_not_need_student(self):
        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(200, {'id': 'u', 'identities': [{'id': 'i'}]})
            r = self._post({**VALID, 'rol': 'conductor', 'nombre_alumno': '', 'curso': ''})
        self.assertEqual(r.status_code, 201)

    def test_success_needs_confirmation_and_sends_metadata(self):
        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(200, {'id': 'uid-1', 'identities': [{'id': 'i'}]})
            r = self._post(VALID)
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()['needsConfirmation'])
        args, kwargs = req.call_args
        self.assertEqual(args, ('POST', 'https://demo.supabase.co/auth/v1/signup'))
        self.assertEqual(kwargs['json']['email'], 'camila@ejemplo.cl')
        self.assertEqual(kwargs['json']['data']['nombre_alumno'], 'Lucas Soto')
        self.assertNotIn('password', kwargs['json']['data'])

    def test_success_with_session_creates_missing_profile(self):
        session = {'access_token': 't', 'user': {'id': 'uid-1', 'email': 'camila@ejemplo.cl',
                   'user_metadata': {'nombre': 'Camila', 'apellido': 'Soto'}, 'identities': [{'id': 'i'}]}}
        with patch('appBus.supabase_client.requests.request') as req:
            req.side_effect = [fake_response(200, session), fake_response(200, []),
                               fake_response(201), fake_response(200, [PROFILE])]
            r = self._post(VALID)
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.json()['needsConfirmation'])
        self.assertEqual(req.call_args_list[2].args[0], 'POST')  # insert del perfil

    def test_duplicate_reported_by_supabase(self):
        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(422, {'error_code': 'user_already_exists', 'msg': 'User already registered'})
            r = self._post(VALID)
        self.assertEqual(r.status_code, 409)
        self.assertIn('correo', r.json()['fieldErrors'])

    def test_duplicate_with_email_confirmation_enabled(self):
        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(200, {'id': 'fake', 'identities': []})
            r = self._post(VALID)
        self.assertEqual(r.status_code, 409)

    def test_supabase_unreachable(self):
        import requests
        with patch('appBus.supabase_client.requests.request', side_effect=requests.ConnectionError()):
            r = self._post(VALID)
        self.assertEqual(r.status_code, 503)

    @override_settings(SUPABASE_URL='', SUPABASE_KEY='')
    def test_not_configured(self):
        r = self._post(VALID)
        self.assertEqual(r.status_code, 503)
        self.assertIn('SUPABASE_URL', r.json()['error'])


@override_settings(**SB)
class LoginTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.client.get('/')
        self.token = self.client.cookies['csrftoken'].value

    def _post(self, url, payload):
        return self.client.post(url, data=json.dumps(payload), content_type='application/json',
                                HTTP_X_CSRFTOKEN=self.token)

    def _login(self):
        data = {'access_token': 'jwt', 'refresh_token': 'r', 'expires_in': 3600,
                'user': {'id': 'uid-1', 'email': 'camila@ejemplo.cl'}}
        with patch('appBus.supabase_client.requests.request') as req:
            req.side_effect = [fake_response(200, data), fake_response(200, [PROFILE])]
            return self._post('/api/auth/login/', {'email': 'camila@ejemplo.cl', 'password': 'Clave1234'})

    def test_login_ok_then_me_then_logout(self):
        r = self._login()
        self.assertEqual(r.status_code, 200)
        user = r.json()['user']
        self.assertEqual((user['name'], user['role'], user['childName']), ('Camila', 'apoderado', 'Lucas Soto'))
        self.assertNotIn('access_token', json.dumps(r.json()))  # el JWT no llega al navegador

        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()['user']['email'], 'camila@ejemplo.cl')

        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(204)
            self.assertEqual(self._post('/api/auth/logout/', {}).status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_bad_credentials(self):
        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(400, {'error_code': 'invalid_credentials', 'msg': 'Invalid login credentials'})
            r = self._post('/api/auth/login/', {'email': 'a@b.cl', 'password': 'mala'})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.json()['error'], 'Correo o contraseña incorrectos.')

    def test_email_not_confirmed(self):
        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(400, {'error_code': 'email_not_confirmed', 'msg': 'Email not confirmed'})
            r = self._post('/api/auth/login/', {'email': 'a@b.cl', 'password': 'Clave1234'})
        self.assertEqual(r.status_code, 403)

    def test_me_refreshes_expiring_token(self):
        self._login()
        s = self.client.session
        s['sb_session']['expires_at'] = 0
        s.save()
        with patch('appBus.supabase_client.requests.request') as req:
            req.return_value = fake_response(200, {'access_token': 'new', 'refresh_token': 'r2', 'expires_in': 3600})
            self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)
        self.assertEqual(self.client.session['sb_session']['access_token'], 'new')

    def test_me_without_session(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_sql_injection_rejected_in_login(self):
        r = self._post('/api/auth/login/', {'email': "admin' OR 1=1--", 'password': 'password123'})
        self.assertIn(r.status_code, (400, 422))

    def test_security_headers_present(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('Content-Security-Policy', res.headers)
        self.assertEqual(res.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(res.headers.get('X-Frame-Options'), 'DENY')


@override_settings(**SB)
class SecurityAndSqlInjectionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.client.get('/')
        self.token = self.client.cookies['csrftoken'].value

    def _post(self, payload):
        return self.client.post('/api/auth/register/', data=json.dumps(payload),
                                content_type='application/json', HTTP_X_CSRFTOKEN=self.token)

    def test_sql_injection_in_name_rejected(self):
        payload = {**VALID, 'nombre': "Camila'; DROP TABLE usuarios;--"}
        r = self._post(payload)
        self.assertEqual(r.status_code, 422)
        self.assertIn('nombre', r.json().get('fieldErrors', {}))

    def test_sql_injection_union_select_rejected(self):
        payload = {**VALID, 'nombre_alumno': "' UNION SELECT * FROM auth.users--"}
        r = self._post(payload)
        self.assertEqual(r.status_code, 422)
        self.assertIn('nombre_alumno', r.json().get('fieldErrors', {}))

    def test_rate_limiting_register(self):
        cache.clear()
        # Enviar 6 peticiones permitidas
        for _ in range(6):
            self._post({**VALID, 'correo': 'test@correo.cl'})
        # La 7ma debe ser bloqueada por rate limit
        r = self._post({**VALID, 'correo': 'test@correo.cl'})
        self.assertEqual(r.status_code, 429)
        self.assertIn('Demasiadas solicitudes', r.json().get('error', ''))


class StudentApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.client.get('/')
        self.token = self.client.cookies['csrftoken'].value

    def test_get_students_endpoint(self):
        r = self.client.get('/api/students/')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data['success'])
        self.assertIsInstance(data['students'], list)

    def test_update_student_status_validates_input(self):
        r = self.client.post('/api/students/123/status/', data=json.dumps({'state': "'; DROP TABLE escolares;--"}),
                             content_type='application/json', HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(r.status_code, 400)


