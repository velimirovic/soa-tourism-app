#!/usr/bin/env python3
"""
Seed skripta za SOA Tourism App
Puni sve baze testnim podacima (blogovi, followeri, ture, profili, admin).

Pokretanje:
    python seed.py

Zahtevi:
    - Docker mora biti pokrenut sa: docker compose up -d
    - Python 3.8+
    - Skripta ce sama instalirati: requests, bcrypt
"""

import subprocess
import sys
import json
import random

# ── Auto-install zavisnosti ──────────────────────────────────────────────────

def pip_install(pkg):
    subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

try:
    import requests
except ImportError:
    print("[SETUP] Instaliram requests...")
    pip_install("requests")
    import requests

try:
    import bcrypt
except ImportError:
    print("[SETUP] Instaliram bcrypt...")
    pip_install("bcrypt")
    import bcrypt

# ── Konfiguracija ────────────────────────────────────────────────────────────

BASE_URL = "http://localhost:8080/api"

# ── Helperi ──────────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"

def log_ok(msg):  print(f"  {GREEN}✓{RESET} {msg}")
def log_err(msg): print(f"  {RED}✗{RESET} {msg}")
def log_skip(msg):print(f"  {YELLOW}~{RESET} {msg}")

def api(method, path, token=None, body=None):
    """Poziva API gateway i vraca (status_code, data)."""
    url = f"{BASE_URL}{path}"
    hdrs = {"Content-Type": "application/json"}
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    try:
        r = getattr(requests, method)(url, json=body, headers=hdrs, timeout=15)
        try:
            data = r.json()
        except Exception:
            data = {}
        return r.status_code, data
    except requests.exceptions.ConnectionError:
        log_err(f"Ne mogu da se povezem na {url} — da li je API gateway pokrenut?")
        return 0, {}

def docker_psql(container_filter, db, sql):
    """Izvrsava SQL u PostgreSQL kontejneru koji sadrzi `container_filter` u imenu."""
    result = subprocess.run(
        ["docker", "ps", "--filter", f"name={container_filter}", "--format", "{{.Names}}"],
        capture_output=True, text=True
    )
    containers = [c.strip() for c in result.stdout.strip().splitlines() if c.strip()]
    if not containers:
        log_err(f"Docker kontejner '{container_filter}' nije pronadjen")
        return False
    container = containers[0]
    r = subprocess.run(
        ["docker", "exec", container, "psql", "-U", "postgres", "-d", db, "-c", sql],
        capture_output=True, text=True
    )
    return r.returncode == 0

# ── 1. Admin korisnik (direktno u auth-db) ───────────────────────────────────

print(f"\n{'='*55}")
print("1. ADMIN KORISNIK")
print('='*55)

admin_password = "Admin123!"
hashed = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt(10)).decode()
sql = (
    f"INSERT INTO \"Users\" (\"Username\",\"Email\",\"PasswordHash\",\"Role\",\"IsBlocked\",\"CreatedAt\") "
    f"VALUES ('admin','admin@soa.com','{hashed}','Admin',false,NOW()) "
    f"ON CONFLICT (\"Username\") DO NOTHING;"
)
if docker_psql("auth-db", "auth", sql):
    log_ok("admin unet u bazu")
else:
    log_skip("admin — preskoceno (mozda vec postoji ili docker nije dostupan)")

status, data = api("post", "/auth/login", body={"username": "admin", "password": admin_password})
if status == 200:
    admin = {"token": data["token"], "id": str(data["id"]), "username": "admin", "role": "Admin"}
    log_ok(f"admin login OK (id={admin['id']})")
else:
    log_err(f"admin login FAILED ({status})")
    admin = None

# ── 1b. Popravka stakeholders migracije (CurrentLatitude/CurrentLongitude) ───
print("\n[FIX] Primjenjujem migraciju za poziciju u stakeholders-db...")
fix_sql = (
    'ALTER TABLE "UserProfiles" '
    'ADD COLUMN IF NOT EXISTS "CurrentLatitude" double precision, '
    'ADD COLUMN IF NOT EXISTS "CurrentLongitude" double precision;'
)
if docker_psql("stakeholders-db", "stakeholders", fix_sql):
    log_ok("CurrentLatitude/CurrentLongitude kolone OK")
else:
    log_skip("Nije moguce primijeniti fix (kontejner mozda nije spreman)")

# ── 2. Registracija korisnika ────────────────────────────────────────────────

print(f"\n{'='*55}")
print("2. REGISTRACIJA KORISNIKA")
print('='*55)

users_spec = [
    {"username": "marko_vodic", "email": "marko@soa.com",  "password": "Sifra123!", "role": "Guide"},
    {"username": "ana_vodic",   "email": "ana@soa.com",    "password": "Sifra123!", "role": "Guide"},
    {"username": "petar_t",     "email": "petar@soa.com",  "password": "Sifra123!", "role": "Tourist"},
    {"username": "jovana_t",    "email": "jovana@soa.com", "password": "Sifra123!", "role": "Tourist"},
    {"username": "nikola_t",    "email": "nikola@soa.com", "password": "Sifra123!", "role": "Tourist"},
]

users = {}  # username -> {token, id, username, role}

for spec in users_spec:
    status, data = api("post", "/auth/register", body=spec)
    if status in (200, 201):
        users[spec["username"]] = {
            "token": data["token"], "id": str(data["id"]),
            "username": data["username"], "role": spec["role"]
        }
        log_ok(f"{spec['username']} registrovan (id={data['id']})")
    elif status == 409:
        status2, data2 = api("post", "/auth/login", body={"username": spec["username"], "password": spec["password"]})
        if status2 == 200:
            users[spec["username"]] = {
                "token": data2["token"], "id": str(data2["id"]),
                "username": data2["username"], "role": spec["role"]
            }
            log_skip(f"{spec['username']} vec postoji — ulogovan (id={data2['id']})")
        else:
            log_err(f"{spec['username']} login posle 409 FAILED ({status2})")
    else:
        log_err(f"{spec['username']} registracija FAILED ({status}): {str(data)[:80]}")

if admin:
    users["admin"] = admin

# ── 3. Profili ───────────────────────────────────────────────────────────────

print(f"\n{'='*55}")
print("3. PROFILI")
print('='*55)

profiles = {
    "marko_vodic": {
        "firstName": "Marko",  "lastName": "Petrovic",
        "biography": "Licencirani vodic kroz planine Srbije sa 10 godina iskustva.",
        "motto": "Svaki vrh je nova prica.", "profilePicture": None
    },
    "ana_vodic": {
        "firstName": "Ana",    "lastName": "Nikolic",
        "biography": "Specijalizovana za kulturno-istorijske ture i gradske setnje.",
        "motto": "Putuj pamtno, vrati se bogatiji.", "profilePicture": None
    },
    "petar_t": {
        "firstName": "Petar",  "lastName": "Jovanovic",
        "biography": "Strastveni planinar i fotograf prirode.",
        "motto": "Priroda je moj dom.", "profilePicture": None
    },
    "jovana_t": {
        "firstName": "Jovana", "lastName": "Milosevic",
        "biography": "Volim da otkrivam skrivena mesta u Srbiji.",
        "motto": "Svaki put vodi nekuda lepom.", "profilePicture": None
    },
    "nikola_t": {
        "firstName": "Nikola", "lastName": "Stojanovic",
        "biography": "Backpacker sa vise od 20 zemalja iza sebe.",
        "motto": "Ziveti znaci putovati.", "profilePicture": None
    },
    "admin": {
        "firstName": "Admin",  "lastName": "SOA",
        "biography": "Administrator sistema.",
        "motto": "", "profilePicture": None
    },
}

for username, profile in profiles.items():
    if username not in users:
        continue
    u = users[username]
    status, data = api("put", f"/stakeholders/profile/{u['id']}", token=u["token"], body=profile)
    if status in (200, 201):
        log_ok(f"profil za {username}")
    else:
        log_err(f"profil za {username} FAILED ({status}): {str(data)[:80]}")

# ── 4. Ture ──────────────────────────────────────────────────────────────────

print(f"\n{'='*55}")
print("4. TURE I KLJUCNE TACKE")
print('='*55)

tours_spec = [
    {
        "author": "marko_vodic",
        "tour": {
            "name": "Tara i Zaovine",
            "description": "Dvodnevo putovanje kroz NP Tara sa posetom Zaovine jezera i Banjske stjene.",
            "difficulty": "MEDIUM",
            "tags": ["priroda", "planine", "jezero"],
            "price": 4500
        },
        "keypoints": [
            {"name": "Kaludjerske bare",   "description": "Ulaz u NP Tara, pocetak staze.",           "latitude": 43.9028, "longitude": 19.5342, "imageUrl": ""},
            {"name": "Zaovine jezero",      "description": "Vestacko jezero okruzeno sumom.",           "latitude": 43.8712, "longitude": 19.4891, "imageUrl": ""},
            {"name": "Banjska stijena",     "description": "Vidikovac sa pogledom na kanjon Drine.",   "latitude": 43.8923, "longitude": 19.5011, "imageUrl": ""},
        ]
    },
    {
        "author": "marko_vodic",
        "tour": {
            "name": "Stara planina - Babin Zub",
            "description": "Trekking do vrha Babin Zub (1758m) sa panoramskim pogledom na Srbiju i Bugarsku.",
            "difficulty": "HARD",
            "tags": ["planinarenje", "vrh", "zima"],
            "price": 3000
        },
        "keypoints": [
            {"name": "Jabucko Ravniste",  "description": "Start ture na nadmorskoj visini 1100m.",   "latitude": 43.3751, "longitude": 22.6042, "imageUrl": ""},
            {"name": "Babin Zub",          "description": "Vrh 1758m, karakteristicni stenoviti isturak.", "latitude": 43.3621, "longitude": 22.6089, "imageUrl": ""},
        ]
    },
    {
        "author": "ana_vodic",
        "tour": {
            "name": "Beograd kroz vekove",
            "description": "Pesacka tura kroz Kalemegdan, Skadarliju i Dorcol — istorija na svakom koraku.",
            "difficulty": "EASY",
            "tags": ["kultura", "istorija", "grad"],
            "price": 1500
        },
        "keypoints": [
            {"name": "Kalemegdan",     "description": "Beogradska tvrdava, simbol grada.",        "latitude": 44.8240, "longitude": 20.4509, "imageUrl": ""},
            {"name": "Skadarlija",     "description": "Bohemska cetvrt, srpski Monmartr.",         "latitude": 44.8182, "longitude": 20.4629, "imageUrl": ""},
            {"name": "Zemunski kej",   "description": "Setnja duz Dunava sa pogledom na Zemun.",  "latitude": 44.8443, "longitude": 20.3809, "imageUrl": ""},
        ]
    },
    {
        "author": "ana_vodic",
        "tour": {
            "name": "Manastiri Fruske gore",
            "description": "Poseta pet manastira na Fruskoj gori — duhovni i kulturni dozivljaj.",
            "difficulty": "EASY",
            "tags": ["manastiri", "duhovnost", "Fruska gora"],
            "price": 2500
        },
        "keypoints": [
            {"name": "Manastir Krusedol",    "description": "Najznacajniji manastir Fruske gore, iz 16. veka.", "latitude": 45.1373, "longitude": 19.9542, "imageUrl": ""},
            {"name": "Manastir Novo Hopovo", "description": "Pravoslavni manastir iz 16. veka.",                "latitude": 45.1689, "longitude": 19.9822, "imageUrl": ""},
        ]
    },
]

tour_ids = []  # [(tour_id, author_username)]

for td in tours_spec:
    author = td["author"]
    if author not in users:
        continue
    u = users[author]
    status, data = api("post", "/tours", token=u["token"], body=td["tour"])
    if status in (200, 201):
        tour_id = data["id"]
        tour_ids.append((tour_id, author))
        log_ok(f"tura '{td['tour']['name']}' (id={tour_id})")
        for kp in td["keypoints"]:
            s2, _ = api("post", f"/tours/{tour_id}/keypoints", token=u["token"], body=kp)
            if s2 in (200, 201):
                log_ok(f"  keypoint '{kp['name']}'")
            else:
                log_err(f"  keypoint '{kp['name']}' FAILED ({s2})")
    else:
        log_err(f"tura '{td['tour']['name']}' FAILED ({status}): {str(data)[:80]}")

# ── 5. Blogovi ───────────────────────────────────────────────────────────────

print(f"\n{'='*55}")
print("5. BLOGOVI")
print('='*55)

blogs_spec = [
    {
        "author": "marko_vodic",
        "blog": {
            "title": "Zasto je Tara moje omiljeno mesto u Srbiji",
            "description": (
                "Svaki put kada se penjem prema Zaovinama, osetim kako gradska buka ostaje iza mene. "
                "Tara nije samo planina — to je iskustvo koje menja coveka. Preporucujem svima da barem jednom "
                "probaju nocni kamp pored jezera. Zvezde se vide kao nigde drugde."
            ),
            "images": []
        }
    },
    {
        "author": "marko_vodic",
        "blog": {
            "title": "Saveti za planinare pocetnike na Staroj planini",
            "description": (
                "Mnogo puta sam vodio grupe koje nikad nisu planinarile. Evo nekoliko saveta: "
                "uvek nosite rezervnu vodu, nikada ne krenite na vrh posle 14h, i sto je najvaznije — slusajte vodica! "
                "Babin Zub moze biti kapriciozan, ali ko ga osvoji — ne zaboravlja."
            ),
            "images": []
        }
    },
    {
        "author": "ana_vodic",
        "blog": {
            "title": "Skadarlija - srce starog Beograda",
            "description": (
                "Turisti uvek pitaju gde da jedu u Beogradu. Moj odgovor je uvek isti: Skadarlija. "
                "Uska kaldrma, kafane sa zivom muzikom, miris rostillja... Ovde vreme stoji. "
                "Dodite pre podneva da izbegnete guzvu, ali ne propustite vecernju atmosferu."
            ),
            "images": []
        }
    },
    {
        "author": "ana_vodic",
        "blog": {
            "title": "Fruska gora - mir koji se trazi",
            "description": (
                "Proslog vikenda organizovala sam privatnu turu kroz pet manastira Fruske gore. "
                "Gosti, koji su stigli iz Nemacke, ostali su bez reci pred freskama Krusedola. "
                "Ovo je deo Srbije koji zasluzuje mnogo vise paznje nego sto dobija."
            ),
            "images": []
        }
    },
    {
        "author": "petar_t",
        "blog": {
            "title": "Moje iskustvo sa turom Tara i Zaovine",
            "description": (
                "Prosle nedelje sam bio na Markovoj turi kroz Taru. Sve pohvale! "
                "Organizacija je bila besprekorna, a Zaovine jezero u zalasku sunca je nesto "
                "sto necu zaboraviti do kraja zivota. Toplo preporucujem svima koji vole prirodu."
            ),
            "images": []
        }
    },
    {
        "author": "jovana_t",
        "blog": {
            "title": "Zlatibor van sezone — da li se isplati?",
            "description": (
                "Svi idu na Zlatibor leti. Ja sam probala u februaru i otkrila sasvim drugacije mesto — "
                "mirno, snezno, prelepo. Nema guzve, cene su nize, a vazduh je cist. "
                "Jedina mana — manje restorana radi. Ali priroda? Savrsena."
            ),
            "images": []
        }
    },
    {
        "author": "jovana_t",
        "blog": {
            "title": "Srebrno jezero — letnji hit koji ne razocara",
            "description": (
                "Srebrno jezero je jedno od onih mesta o kojima svi pricaju, a malo ko zapravo poseti. "
                "Kampovanje uz jezero, izlazak na pedaline, rostilj i zalazak sunca — savrsen srpski vikend. "
                "Dodite u sredu/cetvrtak da izbegnete guzvu."
            ),
            "images": []
        }
    },
    {
        "author": "nikola_t",
        "blog": {
            "title": "Nis — grad koji sam pogresno shvatao",
            "description": (
                "Mislio sam da je Nis samo 'tranzitni grad' na putu za jug. Bio sam u krivu. "
                "Niska tvrdava, Cele kula, Medijana — istorija na svakom koraku. "
                "A lokalna kuhinja? Niska pleskavica je stvarno posebna prica. Vredi svaki kilometar."
            ),
            "images": []
        }
    },
]

blog_ids = []  # [(blog_id, author_username)]

for bd in blogs_spec:
    author = bd["author"]
    if author not in users:
        continue
    u = users[author]
    status, data = api("post", "/blogs/", token=u["token"], body=bd["blog"])
    if status in (200, 201):
        blog_id = data.get("_id") or data.get("id")
        blog_ids.append((blog_id, author))
        log_ok(f"blog '{bd['blog']['title'][:45]}...' (id={blog_id})")
    else:
        log_err(f"blog '{bd['blog']['title'][:45]}' FAILED ({status}): {str(data)[:80]}")

# ── 6. Follow relacije ────────────────────────────────────────────────────────

print(f"\n{'='*55}")
print("6. FOLLOW RELACIJE (FOLLOWERI)")
print('='*55)

follows_spec = [
    # Turisti prate vodice i jedni druge
    ("petar_t",     "marko_vodic"),
    ("petar_t",     "ana_vodic"),
    ("petar_t",     "jovana_t"),
    ("jovana_t",    "marko_vodic"),
    ("jovana_t",    "petar_t"),
    ("jovana_t",    "nikola_t"),
    ("nikola_t",    "ana_vodic"),
    ("nikola_t",    "petar_t"),
    ("nikola_t",    "jovana_t"),
    # Vodici prate jedni druge
    ("marko_vodic", "ana_vodic"),
    ("ana_vodic",   "marko_vodic"),
    # Vodici prate neke turiste
    ("ana_vodic",   "petar_t"),
    ("marko_vodic", "jovana_t"),
]

for follower_name, following_name in follows_spec:
    if follower_name not in users or following_name not in users:
        log_skip(f"{follower_name} → {following_name} (korisnik ne postoji)")
        continue
    follower = users[follower_name]
    following = users[following_name]
    status, data = api(
        "post", "/followers/follow",
        token=follower["token"],
        body={"followingId": following["id"], "followingUsername": following["username"]}
    )
    if status == 200:
        log_ok(f"{follower_name} prati {following_name}")
    else:
        log_err(f"{follower_name} → {following_name} FAILED ({status}): {str(data)[:80]}")

# ── 7. Lajkovi na blogovima ───────────────────────────────────────────────────

print(f"\n{'='*55}")
print("7. LAJKOVI NA BLOGOVIMA")
print('='*55)

# Svaki korisnik lajkuje neke blogove (ne svoje)
all_likes = [
    (user, blog_id, blog_author)
    for blog_id, blog_author in blog_ids
    for user in users
    if user != blog_author and user != "admin"
]

random.seed(42)
selected_likes = random.sample(all_likes, min(22, len(all_likes)))

for username, blog_id, blog_author in selected_likes:
    u = users[username]
    status, _ = api("post", f"/blogs/{blog_id}/like", token=u["token"])
    if status == 200:
        log_ok(f"{username} lajkovao blog od {blog_author}")
    else:
        log_err(f"{username} lajk FAILED ({status})")

# ── 8. Komentari na blogovima ─────────────────────────────────────────────────

print(f"\n{'='*55}")
print("8. KOMENTARI NA BLOGOVIMA")
print('='*55)

comments_spec = []

# Napomena: da bi korisnik komentarisao blog, mora pratiti autora.
# Follow relacije: petar_t->marko, petar_t->ana, petar_t->jovana
#                  jovana_t->marko, jovana_t->petar, jovana_t->nikola
#                  nikola_t->ana, nikola_t->petar, nikola_t->jovana
#                  marko_vodic->ana, marko_vodic->jovana
#                  ana_vodic->marko, ana_vodic->petar

if len(blog_ids) >= 1:
    # blog[0] = marko_vodic — mogu komentarisati: petar_t, jovana_t, ana_vodic
    bid = blog_ids[0][0]
    comments_spec += [
        ("petar_t",  bid, "Tara je zaista posebna! Bas me inspirisao za sledeci vikend."),
        ("jovana_t", bid, "Slazem se potpuno! Zaovine u sumrak su magicne."),
        ("ana_vodic",bid, "Uvek govorim turistima: Tara je must-see Srbije!"),
    ]

if len(blog_ids) >= 3:
    # blog[2] = ana_vodic — mogu komentarisati: marko_vodic, petar_t, nikola_t
    bid = blog_ids[2][0]
    comments_spec += [
        ("petar_t",     bid, "Odlicna preporuka! Skadarlija nocu je nezaboravna."),
        ("marko_vodic", bid, "Ana uvek zna gde treba ici. Potvrdjem svaku rec!"),
        ("nikola_t",    bid, "Bio sam prosle godine, apsolutno se slazem."),
    ]

if len(blog_ids) >= 5:
    # blog[4] = petar_t — mogu komentarisati: jovana_t, nikola_t, ana_vodic
    bid = blog_ids[4][0]
    comments_spec += [
        ("jovana_t", bid, "Tura sa Markom je uvek odlican izbor!"),
        ("nikola_t", bid, "I ja planiram ovu turu, hvala na preporuci!"),
        ("ana_vodic",bid, "Drago mi je da si uzivao, Petre!"),
    ]

if len(blog_ids) >= 8:
    # blog[7] = nikola_t — moze komentarisati samo jovana_t (jedina ga prati)
    bid = blog_ids[7][0]
    comments_spec += [
        ("jovana_t", bid, "Nis je zaista potcenjen! I ja sam bila odusevljena."),
    ]

for username, blog_id, text in comments_spec:
    if username not in users:
        continue
    u = users[username]
    status, _ = api("post", f"/blogs/{blog_id}/comments", token=u["token"], body={"text": text})
    if status in (200, 201):
        log_ok(f"{username} komentarisao blog")
    else:
        log_err(f"{username} komentar FAILED ({status})")

# ── 9. Reviews na turama ─────────────────────────────────────────────────────

print(f"\n{'='*55}")
print("9. REVIEWS NA TURAMA")
print('='*55)

reviews_spec = [
    {
        "reviewer": "petar_t",
        "tour_idx": 0,  # Tara i Zaovine
        "review": {
            "touristName": "Petar Jovanovic",
            "rating": 5,
            "comment": "Neverovatno iskustvo! Marko je odlican vodic, sve je bilo savrseno organizovano.",
            "visitDate": "2026-04-15",
            "images": []
        }
    },
    {
        "reviewer": "jovana_t",
        "tour_idx": 0,  # Tara i Zaovine
        "review": {
            "touristName": "Jovana Milosevic",
            "rating": 5,
            "comment": "Tara je bajkovita, a tura je bila i edukativna i zabavna. Definitivno cu se vratiti!",
            "visitDate": "2026-04-20",
            "images": []
        }
    },
    {
        "reviewer": "nikola_t",
        "tour_idx": 1,  # Stara planina
        "review": {
            "touristName": "Nikola Stojanovic",
            "rating": 4,
            "comment": "Zahtevna tura ali vredna svakog napora. Babin Zub je nesto posebno.",
            "visitDate": "2026-03-05",
            "images": []
        }
    },
    {
        "reviewer": "nikola_t",
        "tour_idx": 2,  # Beograd kroz vekove
        "review": {
            "touristName": "Nikola Stojanovic",
            "rating": 4,
            "comment": "Odlicna tura za upoznavanje Beograda. Ana zna sve zanimljive detalje!",
            "visitDate": "2026-03-10",
            "images": []
        }
    },
    {
        "reviewer": "petar_t",
        "tour_idx": 2,  # Beograd kroz vekove
        "review": {
            "touristName": "Petar Jovanovic",
            "rating": 5,
            "comment": "Kalemegdan je uvek impresivan, ali sa vodicem dobija potpuno novu dimenziju.",
            "visitDate": "2026-03-12",
            "images": []
        }
    },
    {
        "reviewer": "jovana_t",
        "tour_idx": 3,  # Manastiri Fruske gore
        "review": {
            "touristName": "Jovana Milosevic",
            "rating": 5,
            "comment": "Fruska gora je remek-delo Srbije. Mir i spokojstvo koje se retko nalazi.",
            "visitDate": "2026-05-01",
            "images": []
        }
    },
]

for rd in reviews_spec:
    reviewer = rd["reviewer"]
    tour_idx = rd["tour_idx"]
    if reviewer not in users or tour_idx >= len(tour_ids):
        log_skip(f"review — preskocen (korisnik ili tura ne postoje)")
        continue
    u = users[reviewer]
    tour_id = tour_ids[tour_idx][0]
    status, _ = api("post", f"/tours/{tour_id}/reviews", token=u["token"], body=rd["review"])
    if status in (200, 201):
        log_ok(f"{reviewer} ostavio review za turu (id={tour_id}, ocena={rd['review']['rating']})")
    else:
        log_err(f"{reviewer} review FAILED ({status})")

# ── Zavrsni izvestaj ─────────────────────────────────────────────────────────

print(f"\n{'='*55}")
print("SEED ZAVRSEN!")
print('='*55)
print(f"Korisnici  : {len(users)} (1 admin, 2 vodica, 3 turista)")
print(f"Ture       : {len(tour_ids)}")
print(f"Blogovi    : {len(blog_ids)}")
print(f"Follow veze: {len(follows_spec)}")
print(f"Lajkovi    : {len(selected_likes)}")
print(f"Komentari  : {len(comments_spec)}")
print(f"Reviews    : {len(reviews_spec)}")
print()
print("LOGIN PODACI:")
print(f"  {'admin':<16} / {admin_password}  (Admin)")
print(f"  {'marko_vodic':<16} / Sifra123!  (Vodic)")
print(f"  {'ana_vodic':<16} / Sifra123!  (Vodic)")
print(f"  {'petar_t':<16} / Sifra123!  (Turista)")
print(f"  {'jovana_t':<16} / Sifra123!  (Turista)")
print(f"  {'nikola_t':<16} / Sifra123!  (Turista)")
print()
print(f"Frontend: http://localhost:4200")
print(f"API:      http://localhost:8080/api")
print('='*55)
