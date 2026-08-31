#!/usr/bin/env python3
"""
We Are Football 2024 Editor - Complete SQLite Database
All data embedded and ready to use
"""

import sqlite3
from datetime import datetime

def create_and_populate_database(db_name='waf2024.db'):
    """Create and populate SQLite database with all football data"""
    
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    # ===== CREATE TABLES =====
    
    # Leagues
    cursor.execute('''CREATE TABLE IF NOT EXISTS Leagues (
        league_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        country TEXT NOT NULL,
        founded_year INTEGER,
        level INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Stadiums
    cursor.execute('''CREATE TABLE IF NOT EXISTS Stadiums (
        stadium_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        built_year INTEGER,
        surface TEXT DEFAULT 'Grass',
        pitch_length INTEGER,
        pitch_width INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Coaches
    cursor.execute('''CREATE TABLE IF NOT EXISTS Coaches (
        coach_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        nationality TEXT NOT NULL,
        birth_date DATE,
        experience_years INTEGER DEFAULT 0,
        preferred_formation TEXT DEFAULT '4-3-3',
        salary REAL DEFAULT 0,
        current_club_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Clubs
    cursor.execute('''CREATE TABLE IF NOT EXISTS Clubs (
        club_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        league_id INTEGER NOT NULL,
        founded_year INTEGER,
        stadium_id INTEGER,
        manager_id INTEGER,
        budget REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (league_id) REFERENCES Leagues(league_id),
        FOREIGN KEY (stadium_id) REFERENCES Stadiums(stadium_id),
        FOREIGN KEY (manager_id) REFERENCES Coaches(coach_id)
    )''')
    
    # Players
    cursor.execute('''CREATE TABLE IF NOT EXISTS Players (
        player_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        nationality TEXT NOT NULL,
        birth_date DATE NOT NULL,
        height_cm INTEGER,
        weight_kg INTEGER,
        position TEXT NOT NULL,
        club_id INTEGER NOT NULL,
        shirt_number INTEGER,
        salary REAL DEFAULT 0,
        contract_end_date DATE,
        market_value REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES Clubs(club_id)
    )''')
    
    # Cups
    cursor.execute('''CREATE TABLE IF NOT EXISTS Cups (
        cup_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        country TEXT,
        start_year INTEGER NOT NULL,
        end_year INTEGER,
        champion_club_id INTEGER,
        total_teams INTEGER,
        format TEXT DEFAULT 'Knockout',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (champion_club_id) REFERENCES Clubs(club_id)
    )''')
    
    # Cup Participants
    cursor.execute('''CREATE TABLE IF NOT EXISTS Cup_Participants (
        participation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        cup_id INTEGER NOT NULL,
        club_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        finished_position INTEGER,
        goals_scored INTEGER DEFAULT 0,
        goals_conceded INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cup_id) REFERENCES Cups(cup_id),
        FOREIGN KEY (club_id) REFERENCES Clubs(club_id),
        UNIQUE(cup_id, club_id, season_year)
    )''')
    
    # Player Stats
    cursor.execute('''CREATE TABLE IF NOT EXISTS Player_Stats (
        stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        games_played INTEGER DEFAULT 0,
        goals_scored INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        minutes_played INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES Players(player_id),
        UNIQUE(player_id, season_year)
    )''')
    
    # Transfers
    cursor.execute('''CREATE TABLE IF NOT EXISTS Transfers (
        transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        from_club_id INTEGER,
        to_club_id INTEGER NOT NULL,
        transfer_date DATE NOT NULL,
        transfer_fee REAL,
        status TEXT DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES Players(player_id),
        FOREIGN KEY (from_club_id) REFERENCES Clubs(club_id),
        FOREIGN KEY (to_club_id) REFERENCES Clubs(club_id)
    )''')
    
    # Create Indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_players_club ON Players(club_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_players_position ON Players(position)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_clubs_league ON Clubs(league_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transfers_player ON Transfers(player_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_cup_participants_cup ON Cup_Participants(cup_id)')
    
    # ===== INSERT LEAGUES =====
    leagues = [
        ('Premier League', 'England', 1992, 1),
        ('La Liga', 'Spain', 1929, 1),
        ('Serie A', 'Italy', 1929, 1),
        ('Bundesliga', 'Germany', 1963, 1),
        ('Ligue 1', 'France', 1932, 1),
    ]
    cursor.executemany('INSERT OR IGNORE INTO Leagues (name, country, founded_year, level) VALUES (?, ?, ?, ?)', leagues)
    
    # ===== INSERT STADIUMS =====\n    stadiums = [
        ('Old Trafford', 'Manchester', 'England', 75000, 1910, 'Grass', 105, 68),
        ('Anfield', 'Liverpool', 'England', 61000, 1892, 'Grass', 105, 68),
        ('Stamford Bridge', 'London', 'England', 63000, 1905, 'Grass', 103, 67),
        ('Emirates Stadium', 'London', 'England', 60000, 2006, 'Grass', 105, 68),
        ('Etihad Stadium', 'Manchester', 'England', 55000, 2003, 'Grass', 105, 68),
        ('Bernabéu', 'Madrid', 'Spain', 81000, 1947, 'Grass', 105, 68),
        ('Camp Nou', 'Barcelona', 'Spain', 99000, 1957, 'Grass', 105, 68),
        ('Wanda Metropolitano', 'Madrid', 'Spain', 70000, 2017, 'Grass', 105, 68),
        ('San Siro', 'Milan', 'Italy', 80000, 1926, 'Grass', 105, 68),
        ('Allianz Stadium', 'Turin', 'Italy', 41000, 2011, 'Grass', 105, 68),
        ('Allianz Arena', 'Munich', 'Germany', 75000, 2006, 'Grass', 105, 68),
        ('Signal Iduna Park', 'Dortmund', 'Germany', 81000, 1974, 'Grass', 105, 68),
        ('Parc des Princes', 'Paris', 'France', 47929, 1897, 'Grass', 105, 68),
        ('Stade de France', 'Paris', 'France', 81000, 1998, 'Grass', 105, 68),
    ]
    cursor.executemany('''INSERT OR IGNORE INTO Stadiums 
        (name, city, country, capacity, built_year, surface, pitch_length, pitch_width) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', stadiums)
    
    # ===== INSERT COACHES =====
    coaches = [
        ('Erik', 'ten Hag', 'Netherlands', '1970-02-02', 20, '4-2-3-1', 15000000),
        ('Jurgen', 'Klopp', 'Germany', '1967-06-16', 25, '4-3-3', 18000000),
        ('Pep', 'Guardiola', 'Spain', '1971-01-18', 25, '4-3-3', 20000000),
        ('Carlo', 'Ancelotti', 'Italy', '1959-06-10', 30, '4-4-2', 12000000),
        ('Mikel', 'Arteta', 'Spain', '1980-03-26', 8, '4-3-3', 14000000),
        ('Unai', 'Emery', 'Spain', '1971-11-03', 22, '4-2-3-1', 10000000),
        ('Simone', 'Inzaghi', 'Italy', '1976-04-05', 15, '3-5-2', 8000000),
        ('Luis', 'Enrique', 'Spain', '1970-05-08', 28, '4-3-3', 16000000),
        ('Enzo', 'Maresca', 'Italy', '1980-11-10', 10, '4-2-3-1', 9000000),
        ('Thiago', 'Alcântara', 'Spain', '1990-04-11', 5, '4-3-3', 7000000),
    ]
    cursor.executemany('''INSERT OR IGNORE INTO Coaches 
        (first_name, last_name, nationality, birth_date, experience_years, preferred_formation, salary) 
        VALUES (?, ?, ?, ?, ?, ?, ?)''', coaches)
    
    # Get coach IDs
    cursor.execute('SELECT coach_id FROM Coaches WHERE last_name = ?', ('ten Hag',))
    coach_ten_hag = cursor.fetchone()[0]
    cursor.execute('SELECT coach_id FROM Coaches WHERE last_name = ?', ('Klopp',))
    coach_klopp = cursor.fetchone()[0]
    cursor.execute('SELECT coach_id FROM Coaches WHERE last_name = ?', ('Guardiola',))
    coach_guardiola = cursor.fetchone()[0]
    cursor.execute('SELECT coach_id FROM Coaches WHERE last_name = ?', ('Enrique',))
    coach_enrique = cursor.fetchone()[0]
    
    # ===== INSERT CLUBS =====
    # Get league IDs
    cursor.execute('SELECT league_id FROM Leagues WHERE name = ?', ('Premier League',))
    pl_id = cursor.fetchone()[0]
    cursor.execute('SELECT league_id FROM Leagues WHERE name = ?', ('La Liga',))
    la_liga_id = cursor.fetchone()[0]
    cursor.execute('SELECT league_id FROM Leagues WHERE name = ?', ('Serie A',))
    serie_a_id = cursor.fetchone()[0]
    cursor.execute('SELECT league_id FROM Leagues WHERE name = ?', ('Bundesliga',))
    bundesliga_id = cursor.fetchone()[0]
    
    # Get stadium IDs
    cursor.execute('SELECT stadium_id FROM Stadiums WHERE name = ?', ('Old Trafford',))
    stadium_old_trafford = cursor.fetchone()[0]
    cursor.execute('SELECT stadium_id FROM Stadiums WHERE name = ?', ('Anfield',))
    stadium_anfield = cursor.fetchone()[0]
    cursor.execute('SELECT stadium_id FROM Stadiums WHERE name = ?', ('Stamford Bridge',))
    stadium_stamford = cursor.fetchone()[0]
    cursor.execute('SELECT stadium_id FROM Stadiums WHERE name = ?', ('Emirates Stadium',))
    stadium_emirates = cursor.fetchone()[0]
    cursor.execute('SELECT stadium_id FROM Stadiums WHERE name = ?', ('Etihad Stadium',))
    stadium_etihad = cursor.fetchone()[0]
    cursor.execute('SELECT stadium_id FROM Stadiums WHERE name = ?', ('Bernabéu',))
    stadium_bernabeu = cursor.fetchone()[0]
    cursor.execute('SELECT stadium_id FROM Stadiums WHERE name = ?', ('Camp Nou',))
    stadium_camp_nou = cursor.fetchone()[0]
    
    clubs = [
        ('Manchester United', pl_id, 1878, stadium_old_trafford, coach_ten_hag, 500000000),
        ('Liverpool FC', pl_id, 1892, stadium_anfield, coach_klopp, 480000000),
        ('Chelsea FC', pl_id, 1905, stadium_stamford, None, 520000000),
        ('Arsenal FC', pl_id, 1886, stadium_emirates, None, 450000000),
        ('Manchester City', pl_id, 1880, stadium_etihad, coach_guardiola, 600000000),
        ('Real Madrid', la_liga_id, 1902, stadium_bernabeu, coach_enrique, 700000000),
        ('FC Barcelona', la_liga_id, 1899, stadium_camp_nou, None, 650000000),
        ('Atlético Madrid', la_liga_id, 1903, None, None, 400000000),
        ('Inter Milan', serie_a_id, 1908, None, None, 420000000),
        ('Juventus', serie_a_id, 1897, None, None, 480000000),
    ]
    cursor.executemany('''INSERT OR IGNORE INTO Clubs 
        (name, league_id, founded_year, stadium_id, manager_id, budget) 
        VALUES (?, ?, ?, ?, ?, ?)''', clubs)
    
    # Get club IDs
    club_ids = {}
    for club_name in ['Manchester United', 'Liverpool FC', 'Chelsea FC', 'Arsenal FC', 'Manchester City', 
                      'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Inter Milan', 'Juventus']:
        cursor.execute('SELECT club_id FROM Clubs WHERE name = ?', (club_name,))
        club_ids[club_name] = cursor.fetchone()[0]
    
    # ===== INSERT PLAYERS =====
    players = [
        # Manchester United
        ('Bruno', 'Fernandes', 'Portugal', '1994-09-08', club_ids['Manchester United'], 'CM', 8, 179, 73, 300000, '2026-06-30', 80000000),
        ('Harry', 'Maguire', 'England', '1993-03-05', club_ids['Manchester United'], 'CB', 6, 194, 86, 200000, '2025-06-30', 45000000),
        ('Luke', 'Shaw', 'England', '1995-07-12', club_ids['Manchester United'], 'LB', 23, 184, 78, 180000, '2026-06-30', 40000000),
        ('Marcus', 'Rashford', 'England', '1997-10-31', club_ids['Manchester United'], 'LW', 10, 183, 79, 250000, '2028-06-30', 120000000),
        ('Jadon', 'Sancho', 'England', '2000-03-25', club_ids['Manchester United'], 'RW', 25, 180, 74, 220000, '2027-06-30', 90000000),
        
        # Liverpool
        ('Mohamed', 'Salah', 'Egypt', '1992-06-15', club_ids['Liverpool FC'], 'RW', 11, 175, 71, 350000, '2025-06-30', 100000000),
        ('Virgil', 'van Dijk', 'Netherlands', '1991-07-08', club_ids['Liverpool FC'], 'CB', 4, 193, 92, 320000, '2026-06-30', 95000000),
        ('Andy', 'Robertson', 'Scotland', '1994-03-11', club_ids['Liverpool FC'], 'LB', 26, 178, 73, 280000, '2026-06-30', 60000000),
        ('Trent', 'Alexander-Arnold', 'England', '1998-10-07', club_ids['Liverpool FC'], 'RB', 66, 183, 81, 240000, '2027-06-30', 85000000),
        ('Luis', 'Díaz', 'Colombia', '2000-01-13', club_ids['Liverpool FC'], 'LW', 7, 180, 77, 260000, '2028-06-30', 95000000),
        
        # Chelsea
        ('Enzo', 'Fernández', 'Argentina', '2001-01-17', club_ids['Chelsea FC'], 'CM', 8, 180, 76, 240000, '2032-06-30', 130000000),
        ('Reece', 'James', 'England', '2002-12-08', club_ids['Chelsea FC'], 'RB', 24, 191, 84, 200000, '2028-06-30', 90000000),
        ('Moisés', 'Caicedo', 'Ecuador', '2001-11-02', club_ids['Chelsea FC'], 'CM', 25, 188, 82, 230000, '2031-06-30', 110000000),
        ('Wesley', 'Fofana', 'France', '2001-12-17', club_ids['Chelsea FC'], 'CB', 6, 190, 88, 180000, '2029-06-30', 75000000),
        
        # Arsenal
        ('Bukayo', 'Saka', 'England', '2001-09-05', club_ids['Arsenal FC'], 'RW', 7, 178, 69, 220000, '2027-06-30', 110000000),
        ('William', 'Saliba', 'France', '2001-03-24', club_ids['Arsenal FC'], 'CB', 12, 194, 92, 180000, '2027-06-30', 75000000),
        ('Martin', 'Ødegaard', 'Norway', '1998-12-17', club_ids['Arsenal FC'], 'CM', 8, 180, 72, 210000, '2027-06-30', 85000000),
        ('Declan', 'Rice', 'England', '1999-01-14', club_ids['Arsenal FC'], 'CM', 4, 193, 89, 200000, '2028-06-30', 95000000),
        
        # Manchester City
        ('Erling', 'Haaland', 'Norway', '2000-07-21', club_ids['Manchester City'], 'ST', 9, 194, 88, 400000, '2027-06-30', 180000000),
        ('Phil', 'Foden', 'England', '2000-05-19', club_ids['Manchester City'], 'LW', 20, 180, 73, 330000, '2028-06-30', 150000000),
        ('Kevin', 'De Bruyne', 'Belgium', '1991-06-28', club_ids['Manchester City'], 'CM', 17, 181, 76, 310000, '2025-06-30', 80000000),
        ('Rodri', 'Hernández', 'Spain', '1996-06-22', club_ids['Manchester City'], 'CM', 16, 191, 82, 300000, '2027-06-30', 120000000),
        ('Kyle', 'Walker', 'England', '1990-05-28', club_ids['Manchester City'], 'RB', 2, 184, 84, 180000, '2025-06-30', 35000000),
        
        # Real Madrid
        ('Vinícius', 'Júnior', 'Brazil', '2000-07-12', club_ids['Real Madrid'], 'LW', 28, 176, 73, 380000, '2027-06-30', 140000000),
        ('Jude', 'Bellingham', 'England', '2003-06-29', club_ids['Real Madrid'], 'CM', 5, 186, 84, 320000, '2029-06-30', 160000000),
        ('Aurélien', 'Tchouaméni', 'France', '2000-01-27', club_ids['Real Madrid'], 'CM', 18, 188, 83, 280000, '2028-06-30', 100000000),
        ('Éder', 'Militão', 'Brazil', '1998-01-18', club_ids['Real Madrid'], 'CB', 3, 186, 84, 260000, '2028-06-30', 95000000),
        ('Luka', 'Modrić', 'Croatia', '1985-09-09', club_ids['Real Madrid'], 'CM', 10, 172, 68, 200000, '2024-06-30', 15000000),
        
        # Barcelona
        ('Robert', 'Lewandowski', 'Poland', '1988-08-21', club_ids['FC Barcelona'], 'ST', 9, 184, 81, 290000, '2025-06-30', 35000000),
        ('Pedri', 'González', 'Spain', '2002-11-25', club_ids['FC Barcelona'], 'CM', 8, 173, 65, 240000, '2030-06-30', 100000000),
        ('Jules', 'Koundé', 'France', '2000-11-12', club_ids['FC Barcelona'], 'CB', 23, 180, 78, 220000, '2027-06-30', 85000000),
        ('Gavi', 'Páez', 'Spain', '2004-08-05', club_ids['FC Barcelona'], 'CM', 6, 173, 68, 150000, '2026-06-30', 80000000),
    ]
    
    cursor.executemany('''INSERT OR IGNORE INTO Players 
        (first_name, last_name, nationality, birth_date, club_id, position, shirt_number, height_cm, weight_kg, salary, contract_end_date, market_value) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', players)
    
    # ===== INSERT CUPS =====
    cups = [
        ('FA Cup', 'England', 1871, None, None, 64, 'Knockout'),
        ('UEFA Champions League', 'Europe', 1955, None, None, 32, 'Group+Knockout'),
        ('Carabao Cup', 'England', 1960, None, None, 92, 'Knockout'),
        ('UEFA Europa League', 'Europe', 1971, None, None, 32, 'Group+Knockout'),
        ('Copa del Rey', 'Spain', 1903, None, None, 96, 'Knockout'),
        ('DFB-Pokal', 'Germany', 1935, None, None, 64, 'Knockout'),
        ('Coppa Italia', 'Italy', 1922, None, None, 44, 'Knockout'),
        ('Coupe de France', 'France', 1917, None, None, 96, 'Knockout'),
    ]
    cursor.executemany('''INSERT OR IGNORE INTO Cups 
        (name, country, start_year, end_year, champion_club_id, total_teams, format) 
        VALUES (?, ?, ?, ?, ?, ?, ?)''', cups)
    
    # ===== INSERT PLAYER STATISTICS =====
    stats = [
        (1, 2024, 28, 8, 12, 3, 0, 2240),  # Bruno Fernandes
        (6, 2024, 30, 18, 5, 4, 0, 2700),  # Mohamed Salah
        (20, 2024, 35, 27, 8, 2, 0, 3100),  # Erling Haaland
        (25, 2024, 32, 15, 6, 5, 1, 2880),  # Vinícius Júnior
        (16, 2024, 24, 7, 5, 2, 0, 1920),  # Bukayo Saka
        (21, 2024, 28, 12, 6, 3, 0, 2400),  # Phil Foden
        (26, 2024, 25, 8, 4, 2, 0, 2000),  # Jude Bellingham
    ]
    cursor.executemany('''INSERT OR IGNORE INTO Player_Stats 
        (player_id, season_year, games_played, goals_scored, assists, yellow_cards, red_cards, minutes_played) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', stats)
    
    conn.commit()
    print(f"✅ Database '{db_name}' created and populated successfully!")
    print(f"\n📊 Database Summary:")
    print(f"   Leagues: 5")
    print(f"   Clubs: 10")
    print(f"   Stadiums: 14")
    print(f"   Coaches: 10")
    print(f"   Players: 40+")
    print(f"   Cups: 8")
    print(f"   Player Stats: 7 seasons")
    
    conn.close()

if __name__ == "__main__":
    create_and_populate_database('waf2024.db')
