"""
GOORCO Salon - Database Management & Seeding
Supports Casablanca & Côte d'Ivoire branches with distinct services, providers, products, and jobs.
Includes Employee/Staff authentication credentials and client appointment tracking.
"""

import sqlite3
import os
import json
import hashlib
from datetime import datetime, timedelta

DB_FILE = os.path.join(os.path.dirname(__file__), "goorco.db")

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Locations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name_fr TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        currency TEXT NOT NULL,
        phone TEXT NOT NULL,
        address_fr TEXT NOT NULL,
        address_ar TEXT NOT NULL,
        address_en TEXT NOT NULL,
        opening_hours TEXT NOT NULL,
        image_url TEXT
    )
    """)

    # 2. Staff / Prestataires (with Employee login credentials)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role_fr TEXT NOT NULL,
        role_ar TEXT NOT NULL,
        role_en TEXT NOT NULL,
        specialty TEXT,
        rating REAL DEFAULT 4.9,
        image_url TEXT,
        available INTEGER DEFAULT 1,
        email TEXT UNIQUE,
        phone TEXT,
        pin_code TEXT DEFAULT '1234',
        password_hash TEXT,
        FOREIGN KEY (location_id) REFERENCES locations(id)
    )
    """)

    # 3. Services / Prestations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id TEXT NOT NULL,
        category TEXT NOT NULL,
        name_fr TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        description_fr TEXT,
        description_ar TEXT,
        description_en TEXT,
        price REAL NOT NULL,
        duration_minutes INTEGER NOT NULL,
        image_url TEXT,
        badge TEXT,
        FOREIGN KEY (location_id) REFERENCES locations(id)
    )
    """)

    # 4. Appointments / Rendez-vous
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_code TEXT UNIQUE NOT NULL,
        location_id TEXT NOT NULL,
        service_id INTEGER NOT NULL,
        provider_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        reminder_channel TEXT DEFAULT 'whatsapp',
        notes TEXT,
        staff_notes TEXT,
        status TEXT DEFAULT 'confirmed',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (provider_id) REFERENCES providers(id)
    )
    """)

    # 5. Products / E-Commerce
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id TEXT,
        category TEXT NOT NULL,
        name_fr TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        description_fr TEXT,
        description_ar TEXT,
        description_en TEXT,
        price_mad REAL NOT NULL,
        price_xof REAL NOT NULL,
        stock INTEGER DEFAULT 20,
        rating REAL DEFAULT 4.8,
        image_url TEXT,
        badge TEXT
    )
    """)

    # 6. Orders
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_code TEXT UNIQUE NOT NULL,
        location_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        city TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        total_amount REAL NOT NULL,
        currency TEXT NOT NULL,
        items_json TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 7. Jobs / Recrutement
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id TEXT NOT NULL,
        title_fr TEXT NOT NULL,
        title_ar TEXT NOT NULL,
        title_en TEXT NOT NULL,
        contract_type TEXT NOT NULL,
        salary_range TEXT NOT NULL,
        description_fr TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        description_en TEXT NOT NULL,
        requirements_fr TEXT,
        requirements_ar TEXT,
        requirements_en TEXT,
        experience_required TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id) REFERENCES locations(id)
    )
    """)

    # 8. Job Applications
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        candidate_name TEXT NOT NULL,
        candidate_email TEXT NOT NULL,
        candidate_phone TEXT NOT NULL,
        experience_years INTEGER NOT NULL,
        portfolio_url TEXT,
        cover_note TEXT,
        status TEXT DEFAULT 'new',
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
    """)

    # 9. Admin Settings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'superadmin',
        full_name TEXT NOT NULL
    )
    """)

    conn.commit()
    migrate_schema(conn)
    seed_data(conn)
    conn.close()

def migrate_schema(conn):
    """Ensures existing tables have the required columns for Employee auth and staff notes."""
    cursor = conn.cursor()

    # Check providers columns
    cursor.execute("PRAGMA table_info(providers)")
    cols = [r[1] for r in cursor.fetchall()]

    if 'email' not in cols:
        cursor.execute("ALTER TABLE providers ADD COLUMN email TEXT")
    if 'phone' not in cols:
        cursor.execute("ALTER TABLE providers ADD COLUMN phone TEXT")
    if 'pin_code' not in cols:
        cursor.execute("ALTER TABLE providers ADD COLUMN pin_code TEXT DEFAULT '1234'")
    if 'password_hash' not in cols:
        cursor.execute("ALTER TABLE providers ADD COLUMN password_hash TEXT")

    # Check appointments columns
    cursor.execute("PRAGMA table_info(appointments)")
    appt_cols = [r[1] for r in cursor.fetchall()]
    if 'staff_notes' not in appt_cols:
        cursor.execute("ALTER TABLE appointments ADD COLUMN staff_notes TEXT")

    # Update provider credentials
    default_pw_hash = hashlib.sha256("1234".encode()).hexdigest()

    providers_data = [
        (1, 'karim@goorco.com', '+212 6 61 11 22 33', '1234', default_pw_hash),
        (2, 'yassine@goorco.com', '+212 6 62 33 44 55', '1234', default_pw_hash),
        (3, 'mehdi@goorco.com', '+212 6 63 55 66 77', '1234', default_pw_hash),
        (4, 'jeanluc@goorco.com', '+225 07 10 20 30 40', '1234', default_pw_hash),
        (5, 'aminata@goorco.com', '+225 07 40 50 60 70', '1234', default_pw_hash),
        (6, 'ibrahim@goorco.com', '+225 07 70 80 90 00', '1234', default_pw_hash),
    ]

    for p_id, email, phone, pin, p_hash in providers_data:
        cursor.execute("""
        UPDATE providers
        SET email = ?, phone = ?, pin_code = ?, password_hash = ?
        WHERE id = ?
        """, (email, phone, pin, p_hash, p_id))

    # Add extra sample appointments for employees to have immediate schedule data
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    extra_appts = [
        ('GC-CAS-103', 'casablanca', 2, 1, 'Amine Chraibi', '+212 6 71 44 55 66', 'amine.c@gmail.com', today, '10:00', 'whatsapp', 'Dégradé américain à blanc + serviette chaude', None, 'confirmed'),
        ('GC-CAS-104', 'casablanca', 1, 1, 'Reda Benmoussa', '+212 6 63 99 88 11', 'reda.b@outlook.com', today, '17:30', 'sms', 'Client régulier, pas de cire brillante', None, 'in_progress'),
        ('GC-CAS-105', 'casablanca', 4, 1, 'Youssef Berrada', '+212 6 68 12 34 56', 'youssef@berrada.ma', tomorrow, '11:00', 'whatsapp', 'Lissage brésilien complet', None, 'pending'),
        ('GC-ABI-203', 'cote_divoire', 8, 4, 'Koffi Armand', '+225 07 55 66 77 88', 'armand.k@yahoo.fr', today, '14:00', 'whatsapp', 'Traçage barbe HD + Teinture Bigen foncée', None, 'in_progress'),
        ('GC-ABI-204', 'cote_divoire', 7, 4, 'Stéphane Diop', '+225 05 99 88 77 66', 'steph.diop@gmail.com', today, '16:30', 'sms', 'Taper fade très bas avec raie nette', None, 'confirmed'),
        ('GC-ABI-205', 'cote_divoire', 9, 5, 'Marc-Antoine Konan', '+225 01 22 33 44 55', 'konan.m@gmail.com', today, '10:30', 'whatsapp', 'Nattes plaquées cornrows 6 lignes', None, 'completed')
    ]

    for appt in extra_appts:
        cursor.execute("""
        INSERT OR IGNORE INTO appointments (booking_code, location_id, service_id, provider_id, customer_name, customer_phone, customer_email, appointment_date, appointment_time, reminder_channel, notes, staff_notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, appt)

    conn.commit()

def seed_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM locations")
    if cursor.fetchone()[0] > 0:
        return

    # Seed Locations
    locations = [
        (
            'casablanca',
            'GOORCO Casablanca Prestige',
            'جوركو الدار البيضاء برستيج',
            'GOORCO Casablanca Prestige',
            'Casablanca',
            'Maroc',
            'MAD',
            '+212 5 22 48 90 00',
            '45 Boulevard d’Anfa, Quartier Gauthier, Casablanca',
            '45 شارع أنفا، حي غوتييه، الدار البيضاء',
            '45 Boulevard d’Anfa, Gauthier District, Casablanca',
            'Lun - Sam: 10:00 - 21:00 | Dim: 11:00 - 19:00',
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80'
        ),
        (
            'cote_divoire',
            'GOORCO Abidjan Riviera',
            'جوركو أبيدجان ريفييرا',
            'GOORCO Abidjan Riviera',
            'Abidjan',
            'Côte d’Ivoire',
            'FCFA',
            '+225 07 89 45 12 30',
            'Boulevard Latrille, Riviera Bonoumin (Face Glacier), Cocody, Abidjan',
            'شارع لاتريل، ريفييرا بونومين، كوكودي، أبيدجان',
            'Latrille Boulevard, Riviera Bonoumin, Cocody, Abidjan',
            'Mar - Sam: 09:00 - 21:30 | Dim: 12:00 - 20:00',
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'
        )
    ]
    cursor.executemany("""
    INSERT INTO locations (id, name_fr, name_ar, name_en, city, country, currency, phone, address_fr, address_ar, address_en, opening_hours, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, locations)

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialization and employee schema migration completed successfully!")
