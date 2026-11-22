#!/usr/bin/env python3
"""
GOORCO Luxury Hair Salon & Barber Web Platform
Casablanca & Côte d'Ivoire Branches
Administrative & User Portals (Client & Jobs/Staff Portal)
Employee Authentication, Appointment Sheet & Schedule Tracking
E-Commerce, Booking, Jobs Board & Multilingual Support (AR, FR, EN)
"""

import sys
import os
import json
import sqlite3
import hashlib
import uuid
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get('PORT', 8080))
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
DB_FILE = os.path.join(os.path.dirname(__file__), "goorco.db")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

class GoorcoRequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for development/browsers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode('utf-8'))
        except Exception:
            return {}

    def serve_file(self, file_path, content_type):
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', f'{content_type}; charset=utf-8' if 'text' in content_type or 'javascript' in content_type or 'json' in content_type else content_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"File not found")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # 1. API Routes
        if path.startswith('/api/'):
            self.handle_api_get(path, query)
            return

        # 2. Page & Static Routes
        if path == '/' or path == '/index.html':
            self.serve_file(os.path.join(STATIC_DIR, 'index.html'), 'text/html')
        elif path == '/admin' or path == '/admin.html':
            self.serve_file(os.path.join(STATIC_DIR, 'admin.html'), 'text/html')
        else:
            clean_path = path.lstrip('/')
            if clean_path.startswith('static/'):
                clean_path = clean_path[7:]
            full_path = os.path.join(STATIC_DIR, clean_path)
            if os.path.exists(full_path) and not os.path.isdir(full_path):
                ext = os.path.splitext(full_path)[1].lower()
                mime_types = {
                    '.html': 'text/html',
                    '.css': 'text/css',
                    '.js': 'application/javascript',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.svg': 'image/svg+xml',
                    '.webp': 'image/webp',
                    '.ico': 'image/x-icon'
                }
                content_type = mime_types.get(ext, 'application/octet-stream')
                self.serve_file(full_path, content_type)
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b"Page not found")

    def handle_api_get(self, path, query):
        conn = get_db()
        cursor = conn.cursor()

        # /api/locations
        if path == '/api/locations':
            cursor.execute("SELECT * FROM locations")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"locations": rows})
            return

        # /api/services
        if path == '/api/services':
            location = query.get('location', [None])[0]
            if location:
                cursor.execute("SELECT * FROM services WHERE location_id = ? ORDER BY id ASC", (location,))
            else:
                cursor.execute("SELECT * FROM services ORDER BY location_id, id ASC")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"services": rows})
            return

        # /api/providers
        if path == '/api/providers':
            location = query.get('location', [None])[0]
            if location:
                cursor.execute("SELECT id, location_id, name, category, role_fr, role_ar, role_en, specialty, rating, experience_years, reviews_count, image_url, available, email, phone, pin_code, zone, repos, fiches_json, salon_name, address FROM providers WHERE (location_id = ? OR fiches_json IS NOT NULL) AND available = 1 ORDER BY (name = 'Krikris') DESC, rating DESC", (location,))
            else:
                cursor.execute("SELECT id, location_id, name, category, role_fr, role_ar, role_en, specialty, rating, experience_years, reviews_count, image_url, available, email, phone, pin_code, zone, repos, fiches_json, salon_name, address FROM providers ORDER BY (name = 'Krikris') DESC, location_id, rating DESC")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"providers": rows})
            return

        # /api/employee/appointments (Staff Schedule Sheet)
        if path == '/api/employee/appointments':
            provider_id = query.get('provider_id', [None])[0]
            location = query.get('location', [None])[0]
            date = query.get('date', [None])[0]

            sql = """
            SELECT a.*, s.name_fr as service_name, s.name_ar as service_name_ar, s.name_en as service_name_en,
                   s.price, s.duration_minutes, p.name as provider_name, l.name_fr as location_name, l.currency
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN providers p ON a.provider_id = p.id
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE 1=1
            """
            params = []
            if provider_id:
                sql += " AND a.provider_id = ?"
                params.append(provider_id)
            elif location:
                sql += " AND a.location_id = ?"
                params.append(location)

            if date:
                sql += " AND a.appointment_date = ?"
                params.append(date)

            sql += " ORDER BY a.appointment_date ASC, a.appointment_time ASC"
            cursor.execute(sql, params)
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"appointments": rows})
            return

        # /api/employee/stats (Staff personal stats)
        if path == '/api/employee/stats':
            provider_id = query.get('provider_id', [None])[0]
            today = datetime.now().strftime("%Y-%m-%d")

            if not provider_id:
                conn.close()
                self.send_json({"error": "provider_id requis"}, status=400)
                return

            cursor.execute("SELECT COUNT(*) FROM appointments WHERE provider_id = ? AND appointment_date = ?", (provider_id, today))
            today_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM appointments WHERE provider_id = ? AND status = 'completed'", (provider_id,))
            completed_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM appointments WHERE provider_id = ? AND status IN ('confirmed', 'pending', 'in_progress')", (provider_id,))
            active_count = cursor.fetchone()[0]

            cursor.execute("""
            SELECT COALESCE(SUM(s.price), 0)
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.provider_id = ? AND a.status = 'completed'
            """, (provider_id,))
            completed_revenue = cursor.fetchone()[0]

            conn.close()
            self.send_json({
                "stats": {
                    "today_appointments": today_count,
                    "completed_appointments": completed_count,
                    "active_appointments": active_count,
                    "completed_revenue": completed_revenue
                }
            })
            return

        # /api/products
        if path == '/api/products':
            location = query.get('location', [None])[0]
            cursor.execute("SELECT * FROM products ORDER BY id ASC")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"products": rows})
            return

        # /api/jobs
        if path == '/api/jobs':
            location = query.get('location', [None])[0]
            if location:
                cursor.execute("SELECT * FROM jobs WHERE location_id = ? AND is_active = 1 ORDER BY id DESC", (location,))
            else:
                cursor.execute("SELECT * FROM jobs ORDER BY location_id, id DESC")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"jobs": rows})
            return

        # /api/appointments (Admin & All)
        if path == '/api/appointments':
            location = query.get('location', [None])[0]
            sql = """
            SELECT a.*, s.name_fr as service_name, s.name_ar as service_name_ar, s.name_en as service_name_en, s.price,
                   p.name as provider_name, l.name_fr as location_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN providers p ON a.provider_id = p.id
            LEFT JOIN locations l ON a.location_id = l.id
            """
            if location:
                sql += " WHERE a.location_id = ? ORDER BY a.appointment_date DESC, a.appointment_time DESC"
                cursor.execute(sql, (location,))
            else:
                sql += " ORDER BY a.appointment_date DESC, a.appointment_time DESC"
                cursor.execute(sql)
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"appointments": rows})
            return

        # /api/orders
        if path == '/api/orders':
            cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                try:
                    d['items'] = json.loads(d['items_json'])
                except Exception:
                    d['items'] = []
                rows.append(d)
            conn.close()
            self.send_json({"orders": rows})
            return

        # /api/applications
        if path == '/api/applications':
            sql = """
            SELECT app.*, j.title_fr as job_title, j.location_id, l.name_fr as location_name
            FROM applications app
            LEFT JOIN jobs j ON app.job_id = j.id
            LEFT JOIN locations l ON j.location_id = l.id
            ORDER BY app.applied_at DESC
            """
            cursor.execute(sql)
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            self.send_json({"applications": rows})
            return

        # /api/stats
        if path == '/api/stats':
            cursor.execute("SELECT COUNT(*) FROM appointments")
            total_appts = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM appointments WHERE location_id = 'casablanca'")
            appts_casa = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM appointments WHERE location_id = 'cote_divoire'")
            appts_ci = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM orders")
            total_orders = cursor.fetchone()[0]

            cursor.execute("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE currency = 'MAD'")
            revenue_mad = cursor.fetchone()[0]

            cursor.execute("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE currency = 'FCFA'")
            revenue_xof = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM applications")
            total_applications = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM jobs WHERE is_active = 1")
            active_jobs = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM services")
            total_services = cursor.fetchone()[0]

            conn.close()
            self.send_json({
                "stats": {
                    "total_appointments": total_appts,
                    "appointments_casablanca": appts_casa,
                    "appointments_cote_divoire": appts_ci,
                    "total_orders": total_orders,
                    "revenue_mad": revenue_mad,
                    "revenue_xof": revenue_xof,
                    "total_applications": total_applications,
                    "active_jobs": active_jobs,
                    "total_services": total_services
                }
            })
            return

        conn.close()
        self.send_json({"error": "Endpoint not found"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # ── UPLOAD PHOTO (multipart/form-data) ──────────────────────────────
        if path == '/api/upload':
            import cgi, io
            uploads_dir = os.path.join(STATIC_DIR, 'uploads')
            os.makedirs(uploads_dir, exist_ok=True)
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self.send_json({'error': 'multipart/form-data requis'}, status=400)
                return
            # Parse multipart
            environ = {
                'REQUEST_METHOD': 'POST',
                'CONTENT_TYPE': content_type,
                'CONTENT_LENGTH': self.headers.get('Content-Length', 0),
            }
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=environ)
            file_item = form.get('photo') or form.get('file')
            if not file_item or not file_item.filename:
                self.send_json({'error': 'Aucun fichier reçu'}, status=400)
                return
            # Safe filename
            original = file_item.filename.replace('..', '').replace('/', '').replace('\\', '')
            ext = os.path.splitext(original)[1].lower()
            if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
                self.send_json({'error': 'Format non supporté (jpg, png, webp, gif)'}, status=400)
                return
            fname = uuid.uuid4().hex + ext
            fpath = os.path.join(uploads_dir, fname)
            with open(fpath, 'wb') as f:
                f.write(file_item.file.read())
            url = '/uploads/' + fname
            self.send_json({'success': True, 'url': url})
            return

        body = self.read_json_body()
        conn = get_db()
        cursor = conn.cursor()

        # Employee Login (Staff Authentication)
        if path == '/api/employee/login':
            identifier = (body.get('identifier') or '').strip().lower()
            pin = (body.get('pin') or body.get('pin_code') or '').strip()
            provider_id = body.get('provider_id')

            sql = "SELECT id, location_id, name, role_fr, role_ar, role_en, specialty, rating, experience_years, reviews_count, image_url, email, phone, pin_code, category, salon_name, address, fiches_json FROM providers WHERE "
            params = []
            if provider_id:
                sql += "id = ? AND pin_code = ?"
                params.extend([provider_id, pin])
            else:
                sql += "(LOWER(email) = ? OR phone = ? OR LOWER(name) LIKE ?) AND pin_code = ?"
                params.extend([identifier, identifier, f"%{identifier}%", pin])

            cursor.execute(sql, params)
            emp = cursor.fetchone()
            conn.close()
            if emp:
                emp_dict = dict(emp)
                token = "emp-token-" + uuid.uuid4().hex[:16]
                self.send_json({"success": True, "employee": emp_dict, "token": token})
            else:
                self.send_json({"success": False, "message": "Identifiant ou code PIN incorrect (Code PIN par défaut: 1234)"}, status=401)
            return

        # Admin Login
        if path == '/api/admin/login':
            username = body.get('username')
            password = body.get('password')
            hashed = hashlib.sha256(password.encode()).hexdigest()
            cursor.execute("SELECT id, username, full_name, role FROM admin_users WHERE username = ? AND password_hash = ?", (username, hashed))
            user = cursor.fetchone()
            conn.close()
            if user:
                self.send_json({"success": True, "user": dict(user), "token": "session-" + uuid.uuid4().hex[:16]})
            else:
                self.send_json({"success": False, "message": "Nom d'utilisateur ou mot de passe incorrect"}, status=401)
            return

        # Create Appointment (Client)
        if path == '/api/appointments':
            loc = body.get('location_id', 'casablanca')
            service_id = body.get('service_id')
            provider_id = body.get('provider_id')
            c_name = body.get('customer_name', '').strip()
            c_phone = body.get('customer_phone', '').strip()
            c_email = body.get('customer_email', '').strip()
            appt_date = body.get('appointment_date')
            appt_time = body.get('appointment_time')
            reminder = body.get('reminder_channel', 'whatsapp')
            notes = body.get('notes', '')

            if not service_id:
                cursor.execute("SELECT id FROM services WHERE location_id = ? LIMIT 1", (loc,))
                row = cursor.fetchone()
                service_id = row[0] if row else 1

            if not (service_id and c_name and c_phone and appt_date and appt_time):
                conn.close()
                self.send_json({"error": "Veuillez remplir tous les champs obligatoires."}, status=400)
                return

            prefix = "GC-CAS-" if loc == 'casablanca' else "GC-ABI-"
            booking_code = prefix + uuid.uuid4().hex[:6].upper()

            cursor.execute("""
            INSERT INTO appointments (booking_code, location_id, service_id, provider_id, customer_name, customer_phone, customer_email, appointment_date, appointment_time, reminder_channel, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
            """, (booking_code, loc, service_id, provider_id, c_name, c_phone, c_email, appt_date, appt_time, reminder, notes))
            conn.commit()

            cursor.execute("""
            SELECT a.*, s.name_fr as service_name, s.name_ar as service_name_ar, s.name_en as service_name_en, s.price,
                   p.name as provider_name, l.name_fr as location_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN providers p ON a.provider_id = p.id
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE a.booking_code = ?
            """, (booking_code,))
            created = dict(cursor.fetchone())
            conn.close()
            self.send_json({"success": True, "booking": created})
            return

        # Place Order (E-Commerce Client)
        if path == '/api/orders':
            loc = body.get('location_id', 'casablanca')
            c_name = body.get('customer_name', '').strip()
            c_phone = body.get('customer_phone', '').strip()
            address = body.get('shipping_address', '').strip()
            city = body.get('city', '').strip()
            payment_method = body.get('payment_method', 'Cash')
            total_amount = float(body.get('total_amount', 0))
            currency = body.get('currency', 'MAD' if loc == 'casablanca' else 'FCFA')
            items = body.get('items', [])

            if not (c_name and c_phone and address and items):
                conn.close()
                self.send_json({"error": "Veuillez fournir vos coordonnées complètes et votre panier."}, status=400)
                return

            prefix = "ORD-CAS-" if loc == 'casablanca' else "ORD-ABI-"
            order_code = prefix + uuid.uuid4().hex[:6].upper()

            cursor.execute("""
            INSERT INTO orders (order_code, location_id, customer_name, customer_phone, shipping_address, city, payment_method, total_amount, currency, items_json, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            """, (order_code, loc, c_name, c_phone, address, city, payment_method, total_amount, currency, json.dumps(items)))
            conn.commit()
            conn.close()

            self.send_json({"success": True, "order_code": order_code, "total_amount": total_amount, "currency": currency})
            return

        # Submit Job Application (Candidat)
        if path == '/api/applications':
            job_id = body.get('job_id')
            c_name = body.get('candidate_name', '').strip()
            c_email = body.get('candidate_email', '').strip()
            c_phone = body.get('candidate_phone', '').strip()
            exp = int(body.get('experience_years', 0))
            portfolio = body.get('portfolio_url', '').strip()
            cover = body.get('cover_note', '').strip()

            if not (job_id and c_name and c_email and c_phone):
                conn.close()
                self.send_json({"error": "Veuillez renseigner votre nom, email et téléphone."}, status=400)
                return

            cursor.execute("""
            INSERT INTO applications (job_id, candidate_name, candidate_email, candidate_phone, experience_years, portfolio_url, cover_note, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
            """, (job_id, c_name, c_email, c_phone, exp, portfolio, cover))
            conn.commit()
            app_id = cursor.lastrowid
            cursor.execute("SELECT j.title_fr, l.name_fr FROM jobs j LEFT JOIN locations l ON j.location_id = l.id WHERE j.id = ?", (job_id,))
            j_info = cursor.fetchone()
            job_title = j_info[0] if j_info else "Poste GOORCO"
            loc_name = j_info[1] if j_info else "Salon"
            conn.close()

            app_code = f"CAND-GC-{app_id:04d}"
            self.send_json({
                "success": True,
                "application_id": app_id,
                "application_code": app_code,
                "job_title": job_title,
                "location_name": loc_name,
                "candidate_name": c_name,
                "message": f"Félicitations {c_name} ! Votre candidature pour le poste de {job_title} ({loc_name}) a été transmise avec succès à l'équipe GOORCO."
            })
            return

        # Admin: Add Service
        if path == '/api/services':
            loc = body.get('location_id', 'casablanca')
            cat = body.get('category', 'Général')
            name_fr = body.get('name_fr', '')
            name_ar = body.get('name_ar', '')
            name_en = body.get('name_en', '')
            desc_fr = body.get('description_fr', '')
            desc_ar = body.get('description_ar', '')
            desc_en = body.get('description_en', '')
            price = float(body.get('price', 0))
            duration = int(body.get('duration_minutes', 45))
            image_url = body.get('image_url', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80')
            badge = body.get('badge', '')

            cursor.execute("""
            INSERT INTO services (location_id, category, name_fr, name_ar, name_en, description_fr, description_ar, description_en, price, duration_minutes, image_url, badge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (loc, cat, name_fr, name_ar, name_en, desc_fr, desc_ar, desc_en, price, duration, image_url, badge))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            self.send_json({"success": True, "service_id": new_id})
            return

        # Admin: Add Product
        if path == '/api/products':
            loc = body.get('location_id')
            cat = body.get('category', 'Soins')
            name_fr = body.get('name_fr', '')
            name_ar = body.get('name_ar', '')
            name_en = body.get('name_en', '')
            desc_fr = body.get('description_fr', '')
            desc_ar = body.get('description_ar', '')
            desc_en = body.get('description_en', '')
            price_mad = float(body.get('price_mad', 0))
            price_xof = float(body.get('price_xof', 0))
            stock = int(body.get('stock', 20))
            image_url = body.get('image_url', 'https://images.unsplash.com/photo-1608248597359-009b0b1d3d66?auto=format&fit=crop&w=500&q=80')
            badge = body.get('badge', '')

            cursor.execute("""
            INSERT INTO products (location_id, category, name_fr, name_ar, name_en, description_fr, description_ar, description_en, price_mad, price_xof, stock, image_url, badge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (loc, cat, name_fr, name_ar, name_en, desc_fr, desc_ar, desc_en, price_mad, price_xof, stock, image_url, badge))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            self.send_json({"success": True, "product_id": new_id})
            return

        # Admin: Add Job
        if path == '/api/jobs':
            loc = body.get('location_id', 'casablanca')
            title_fr = body.get('title_fr', '')
            title_ar = body.get('title_ar', '')
            title_en = body.get('title_en', '')
            contract = body.get('contract_type', 'CDI')
            salary = body.get('salary_range', '')
            desc_fr = body.get('description_fr', '')
            desc_ar = body.get('description_ar', '')
            desc_en = body.get('description_en', '')
            req_fr = body.get('requirements_fr', '')
            req_ar = body.get('requirements_ar', '')
            req_en = body.get('requirements_en', '')
            exp = body.get('experience_required', '2 ans')
            img = body.get('image_url', '')

            cursor.execute("""
            INSERT INTO jobs (location_id, title_fr, title_ar, title_en, contract_type, salary_range, description_fr, description_ar, description_en, requirements_fr, requirements_ar, requirements_en, experience_required, is_active, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (loc, title_fr, title_ar, title_en, contract, salary, desc_fr, desc_ar, desc_en, req_fr, req_ar, req_en, exp, img))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            self.send_json({"success": True, "job_id": new_id})
            return

        # Admin: Add Provider / Team Member (Collaborateur)
        if path == '/api/providers':
            loc = body.get('location_id', 'casablanca')
            name = (body.get('name') or '').strip()
            role_fr = body.get('role_fr', 'Maître Barbier & Styliste')
            role_ar = body.get('role_ar', '')
            role_en = body.get('role_en', '')
            specialty = body.get('specialty', '')
            rating = float(body.get('rating') or 4.9)
            image_url = body.get('image_url') or 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
            email = body.get('email', '')
            phone = body.get('phone', '')
            pin_code = body.get('pin_code') or '1234'
            category = body.get('category', 'coiffure')
            exp_years = int(body.get('experience_years') or 5)
            salon_name = body.get('salon_name') or ('GOORCO Casablanca Prestige' if loc == 'casablanca' else 'GOORCO Abidjan Riviera')
            address = body.get('address') or ("45 Boulevard d'Anfa, Quartier Gauthier, Casablanca" if loc == 'casablanca' else "Boulevard Latrille, Riviera Bonoumin (Face Glacier), Cocody, Abidjan")
            available = 1 if body.get('available', 1) in (1, '1', True) else 0

            # Fiches JSON: either provided or generated automatically
            fiches_val = body.get('fiches_json')
            if not fiches_val:
                # Default technical sheet for this provider
                price_mad = "150 - 250 MAD" if loc == 'casablanca' else "10 000 - 15 000 FCFA"
                price_fcfa = "10 000 - 15 000 FCFA" if loc != 'casablanca' else "150 - 250 MAD"
                default_fiche = [{
                    "id": f"presta_custom_{int(time.time())}",
                    "name": specialty or role_fr,
                    "subtitle": specialty or "Prestation d'exception GOORCO",
                    "price_range": price_mad,
                    "price_range_mad": price_mad,
                    "price_range_fcfa": price_fcfa,
                    "category": category,
                    "icon": "✂️" if category == 'coiffure' else ("✨" if category == 'esthetique' else "🌿"),
                    "rating": rating,
                    "reviews_count": 50,
                    "images": [image_url]
                }]
                fiches_val = json.dumps(default_fiche, ensure_ascii=False)
            elif isinstance(fiches_val, (list, dict)):
                fiches_val = json.dumps(fiches_val, ensure_ascii=False)

            cursor.execute("""
            INSERT INTO providers (location_id, name, role_fr, role_ar, role_en, specialty, rating, image_url, email, phone, pin_code, category, experience_years, salon_name, address, available, fiches_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (loc, name, role_fr, role_ar, role_en, specialty, rating, image_url, email, phone, pin_code, category, exp_years, salon_name, address, available, fiches_val))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            self.send_json({"success": True, "provider_id": new_id})
            return

        # Admin: Send Reminder simulation
        if path.startswith('/api/appointments/') and path.endswith('/reminder'):
            parts = path.split('/')
            appt_id = parts[3]
            cursor.execute("""
            SELECT a.*, s.name_fr as service_name, l.name_fr as location_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE a.id = ?
            """, (appt_id,))
            appt = cursor.fetchone()
            conn.close()
            if appt:
                d = dict(appt)
                msg = f"Rappel automatique envoyé avec succès par {d['reminder_channel'].upper()} au client {d['customer_name']} ({d['customer_phone']}) pour son RDV du {d['appointment_date']} à {d['appointment_time']} chez {d['location_name']} !"
                self.send_json({"success": True, "message": msg, "recipient": d['customer_phone']})
            else:
                self.send_json({"error": "Rendez-vous introuvable"}, status=404)
            return

        conn.close()
        self.send_json({"error": "Endpoint not found"}, status=404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()
        conn = get_db()
        cursor = conn.cursor()

        # Employee: Update Client Appointment Status & Technical Notes
        if path.startswith('/api/employee/appointments/') and path.endswith('/status'):
            parts = path.split('/')
            appt_id = parts[4]
            new_status = body.get('status', 'in_progress')
            staff_notes = body.get('staff_notes')
            if staff_notes is not None:
                cursor.execute("UPDATE appointments SET status = ?, staff_notes = ? WHERE id = ?", (new_status, staff_notes, appt_id))
            else:
                cursor.execute("UPDATE appointments SET status = ? WHERE id = ?", (new_status, appt_id))
            conn.commit()
            conn.close()
            self.send_json({"success": True, "status": new_status, "staff_notes": staff_notes})
            return

        # Employee: Update Personal Profile & Fiches Techniques ("Ce qu'il sait faire")
        if path == '/api/employee/profile':
            prov_id = body.get('id') or body.get('provider_id')
            if not prov_id:
                conn.close()
                self.send_json({"error": "Identifiant collaborateur manquant"}, status=400)
                return

            fiches_val = body.get('fiches_json')
            if isinstance(fiches_val, (list, dict)):
                fiches_val = json.dumps(fiches_val, ensure_ascii=False)

            cursor.execute("""
            UPDATE providers SET
                name = COALESCE(?, name),
                role_fr = COALESCE(?, role_fr),
                role_ar = COALESCE(?, role_ar),
                role_en = COALESCE(?, role_en),
                specialty = COALESCE(?, specialty),
                image_url = COALESCE(?, image_url),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                pin_code = COALESCE(?, pin_code),
                category = COALESCE(?, category),
                experience_years = COALESCE(?, experience_years),
                salon_name = COALESCE(?, salon_name),
                address = COALESCE(?, address),
                fiches_json = COALESCE(?, fiches_json)
            WHERE id = ?
            """, (
                body.get('name'),
                body.get('role_fr'), body.get('role_ar'), body.get('role_en'),
                body.get('specialty'),
                body.get('image_url'),
                body.get('email'), body.get('phone'),
                body.get('pin_code'),
                body.get('category'),
                body.get('experience_years'),
                body.get('salon_name'), body.get('address'),
                fiches_val,
                prov_id
            ))
            conn.commit()

            cursor.execute("SELECT id, location_id, name, role_fr, role_ar, role_en, specialty, rating, experience_years, reviews_count, image_url, available, email, phone, pin_code, category, salon_name, address, fiches_json FROM providers WHERE id = ?", (prov_id,))
            updated_emp = cursor.fetchone()
            conn.close()
            self.send_json({"success": True, "employee": dict(updated_emp) if updated_emp else None})
            return

        # Update Service (Admin)
        if path.startswith('/api/services/'):
            service_id = path.split('/')[-1]
            cursor.execute("""
            UPDATE services SET
                location_id = COALESCE(?, location_id),
                category = COALESCE(?, category),
                name_fr = COALESCE(?, name_fr),
                name_ar = COALESCE(?, name_ar),
                name_en = COALESCE(?, name_en),
                description_fr = COALESCE(?, description_fr),
                description_ar = COALESCE(?, description_ar),
                description_en = COALESCE(?, description_en),
                price = COALESCE(?, price),
                duration_minutes = COALESCE(?, duration_minutes),
                image_url = COALESCE(?, image_url),
                badge = COALESCE(?, badge)
            WHERE id = ?
            """, (
                body.get('location_id'), body.get('category'),
                body.get('name_fr'), body.get('name_ar'), body.get('name_en'),
                body.get('description_fr'), body.get('description_ar'), body.get('description_en'),
                body.get('price'), body.get('duration_minutes'),
                body.get('image_url'), body.get('badge'),
                service_id
            ))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        # Update Product (Admin)
        if path.startswith('/api/products/'):
            prod_id = path.split('/')[-1]
            cursor.execute("""
            UPDATE products SET
                category = COALESCE(?, category),
                name_fr = COALESCE(?, name_fr),
                name_ar = COALESCE(?, name_ar),
                name_en = COALESCE(?, name_en),
                description_fr = COALESCE(?, description_fr),
                price_mad = COALESCE(?, price_mad),
                price_xof = COALESCE(?, price_xof),
                stock = COALESCE(?, stock),
                image_url = COALESCE(?, image_url),
                badge = COALESCE(?, badge)
            WHERE id = ?
            """, (
                body.get('category'),
                body.get('name_fr'), body.get('name_ar'), body.get('name_en'),
                body.get('description_fr'),
                body.get('price_mad'), body.get('price_xof'),
                body.get('stock'), body.get('image_url'), body.get('badge'),
                prod_id
            ))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        # Update Appointment Status (Admin)
        if path.startswith('/api/appointments/') and path.endswith('/status'):
            appt_id = path.split('/')[3]
            new_status = body.get('status', 'confirmed')
            cursor.execute("UPDATE appointments SET status = ? WHERE id = ?", (new_status, appt_id))
            conn.commit()
            conn.close()
            self.send_json({"success": True, "status": new_status})
            return

        # Update Order Status (Admin)
        if path.startswith('/api/orders/') and path.endswith('/status'):
            order_id = path.split('/')[3]
            new_status = body.get('status', 'processing')
            cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (new_status, order_id))
            conn.commit()
            conn.close()
            self.send_json({"success": True, "status": new_status})
            return

        # Update Job Application Status (Admin)
        if path.startswith('/api/applications/') and path.endswith('/status'):
            app_id = path.split('/')[3]
            new_status = body.get('status', 'reviewed')
            cursor.execute("UPDATE applications SET status = ? WHERE id = ?", (new_status, app_id))
            conn.commit()
            conn.close()
            self.send_json({"success": True, "status": new_status})
            return

        # Update Job Offer / Annonce (Admin)
        if path.startswith('/api/jobs/'):
            job_id = path.split('/')[-1]
            cursor.execute("""
            UPDATE jobs SET
                location_id = COALESCE(?, location_id),
                contract_type = COALESCE(?, contract_type),
                title_fr = COALESCE(?, title_fr),
                title_ar = COALESCE(?, title_ar),
                title_en = COALESCE(?, title_en),
                salary_range = COALESCE(?, salary_range),
                experience_required = COALESCE(?, experience_required),
                description_fr = COALESCE(?, description_fr),
                description_ar = COALESCE(?, description_ar),
                description_en = COALESCE(?, description_en),
                requirements_fr = COALESCE(?, requirements_fr),
                is_active = COALESCE(?, is_active),
                image_url = COALESCE(?, image_url)
            WHERE id = ?
            """, (
                body.get('location_id'), body.get('contract_type'),
                body.get('title_fr'), body.get('title_ar'), body.get('title_en'),
                body.get('salary_range'), body.get('experience_required'),
                body.get('description_fr'), body.get('description_ar'), body.get('description_en'),
                body.get('requirements_fr'), body.get('is_active'),
                body.get('image_url'),
                job_id
            ))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        # Update Provider / Team Member (Collaborateur)
        if path.startswith('/api/providers/'):
            prov_id = path.split('/')[-1]
            fiches_val = body.get('fiches_json')
            if isinstance(fiches_val, (list, dict)):
                fiches_val = json.dumps(fiches_val, ensure_ascii=False)

            cursor.execute("""
            UPDATE providers SET
                location_id = COALESCE(?, location_id),
                name = COALESCE(?, name),
                role_fr = COALESCE(?, role_fr),
                role_ar = COALESCE(?, role_ar),
                role_en = COALESCE(?, role_en),
                specialty = COALESCE(?, specialty),
                rating = COALESCE(?, rating),
                image_url = COALESCE(?, image_url),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                pin_code = COALESCE(?, pin_code),
                category = COALESCE(?, category),
                experience_years = COALESCE(?, experience_years),
                salon_name = COALESCE(?, salon_name),
                address = COALESCE(?, address),
                available = COALESCE(?, available),
                fiches_json = COALESCE(?, fiches_json)
            WHERE id = ?
            """, (
                body.get('location_id'), body.get('name'),
                body.get('role_fr'), body.get('role_ar'), body.get('role_en'),
                body.get('specialty'), body.get('rating'),
                body.get('image_url'), body.get('email'), body.get('phone'),
                body.get('pin_code'), body.get('category'),
                body.get('experience_years'), body.get('salon_name'),
                body.get('address'), body.get('available'),
                fiches_val,
                prov_id
            ))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        conn.close()
        self.send_json({"error": "Endpoint not found"}, status=404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        conn = get_db()
        cursor = conn.cursor()

        # Delete Service
        if path.startswith('/api/services/'):
            service_id = path.split('/')[-1]
            cursor.execute("DELETE FROM services WHERE id = ?", (service_id,))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        # Delete Product
        if path.startswith('/api/products/'):
            prod_id = path.split('/')[-1]
            cursor.execute("DELETE FROM products WHERE id = ?", (prod_id,))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        # Delete Job
        if path.startswith('/api/jobs/'):
            job_id = path.split('/')[-1]
            cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        # Delete Provider / Team Member (Collaborateur)
        if path.startswith('/api/providers/'):
            prov_id = path.split('/')[-1]
            cursor.execute("DELETE FROM providers WHERE id = ?", (prov_id,))
            conn.commit()
            conn.close()
            self.send_json({"success": True})
            return

        conn.close()
        self.send_json({"error": "Endpoint not found"}, status=404)

def run():
    os.makedirs(STATIC_DIR, exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "images"), exist_ok=True)

    server_address = ('', PORT)
    httpd = HTTPServer(server_address, GoorcoRequestHandler)
    print(f"GOORCO Salon Server running at http://localhost:{PORT}")
    print(f"Client Portal: http://localhost:{PORT}/")
    print(f"Admin Portal:  http://localhost:{PORT}/admin")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping GOORCO Server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
