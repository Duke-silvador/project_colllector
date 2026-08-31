#!/usr/bin/env python3
"""
Sample data loader for We Are Football 2024 Editor
Populates database with realistic football data
"""

from database_manager import WAFDatabaseManager

def load_sample_data():
    """Load sample data into database"""
    db = WAFDatabaseManager('waf2024.db')
    
    try:
        # ===== LEAGUES =====
        print("Adding leagues...")
        pl_id = db.add_league('Premier League', 'England', 1992, 1)
        la_liga_id = db.add_league('La Liga', 'Spain', 1929, 1)
        serie_a_id = db.add_league('Serie A', 'Italy', 1929, 1)
        bundesliga_id = db.add_league('Bundesliga', 'Germany', 1963, 1)
        ligue1_id = db.add_league('Ligue 1', 'France', 1932, 1)
        
        # ===== STADIUMS =====
        print("Adding stadiums...")
        stadiums = [
            ('Old Trafford', 'Manchester', 'England', 75000, 1910, 'Grass', 105, 68),
            ('Anfield', 'Liverpool', 'England', 61000, 1892, 'Grass', 105, 68),
            ('Stamford Bridge', 'London', 'England', 63000, 1905, 'Grass', 103, 67),
            ('Emirates Stadium', 'London', 'England', 60000, 2006, 'Grass', 105, 68),
            ('Etihad Stadium', 'Manchester', 'England', 55000, 2003, 'Grass', 105, 68),
            ('Bernabéu', 'Madrid', 'Spain', 81000, 1947, 'Grass', 105, 68),
            ('Camp Nou', 'Barcelona', 'Spain', 99000, 1957, 'Grass', 105, 68),
            ('Atlético Madrid', 'Madrid', 'Spain', 70000, 2017, 'Grass', 105, 68),
            ('San Siro', 'Milan', 'Italy', 80000, 1926, 'Grass', 105, 68),
            ('Allianz Stadium', 'Turin', 'Italy', 41000, 2011, 'Grass', 105, 68),
        ]
        
        stadium_ids = {}
        for idx, (name, city, country, capacity, year, surface, length, width) in enumerate(stadiums):
            sid = db.add_stadium(name, city, country, capacity, year, surface, length, width)
            stadium_ids[name] = sid
        
        # ===== COACHES =====
        print("Adding coaches...")
        coaches = [
            ('Erik', 'ten Hag', 'Netherlands', '1970-02-02', 20, '4-2-3-1', 15000000, None),
            ('Jurgen', 'Klopp', 'Germany', '1967-06-16', 25, '4-3-3', 18000000, None),
            ('Pep', 'Guardiola', 'Spain', '1971-01-18', 25, '4-3-3', 20000000, None),
            ('Carlo', 'Ancelotti', 'Italy', '1959-06-10', 30, '4-4-2', 12000000, None),
            ('Mikel', 'Arteta', 'Spain', '1980-03-26', 8, '4-3-3', 14000000, None),
            ('Unai', 'Emery', 'Spain', '1971-11-03', 22, '4-2-3-1', 10000000, None),
            ('Simone', 'Inzaghi', 'Italy', '1976-04-05', 15, '3-5-2', 8000000, None),
            ('Luis', 'Enrique', 'Spain', '1970-05-08', 28, '4-3-3', 16000000, None),
        ]
        
        coach_ids = {}
        for idx, (fname, lname, nat, birth, exp, form, sal, club) in enumerate(coaches):
            cid = db.add_coach(fname, lname, nat, birth, exp, form, sal, club)
            coach_ids[f"{fname} {lname}"] = cid
        
        # ===== CLUBS =====
        print("Adding clubs...")
        clubs = [
            ('Manchester United', pl_id, 1878, stadium_ids['Old Trafford'], coach_ids['Erik ten Hag'], 500000000),
            ('Liverpool FC', pl_id, 1892, stadium_ids['Anfield'], coach_ids['Jurgen Klopp'], 480000000),
            ('Chelsea FC', pl_id, 1905, stadium_ids['Stamford Bridge'], coach_ids['Carlo Ancelotti'], 520000000),
            ('Arsenal FC', pl_id, 1886, stadium_ids['Emirates Stadium'], coach_ids['Mikel Arteta'], 450000000),
            ('Manchester City', pl_id, 1880, stadium_ids['Etihad Stadium'], coach_ids['Pep Guardiola'], 600000000),
            ('Real Madrid', la_liga_id, 1902, stadium_ids['Bernabéu'], coach_ids['Luis Enrique'], 700000000),
            ('FC Barcelona', la_liga_id, 1899, stadium_ids['Camp Nou'], None, 650000000),
            ('Atlético Madrid', la_liga_id, 1903, None, coach_ids['Simone Inzaghi'], 400000000),
            ('Inter Milan', serie_a_id, 1908, stadium_ids['San Siro'], None, 420000000),
            ('Juventus', serie_a_id, 1897, stadium_ids['Allianz Stadium'], None, 480000000),
        ]
        
        club_ids = {}
        for name, league, year, stadium, coach, budget in clubs:
            cid = db.add_club(name, league, year, stadium, coach, budget)
            club_ids[name] = cid
        
        # ===== PLAYERS =====
        print("Adding players...")
        players = [
            # Manchester United
            ('Bruno', 'Fernandes', 'Portugal', '1994-09-08', club_ids['Manchester United'], 'CM', 8, 179, 73, 300000, '2026-06-30', 80000000),
            ('Harry', 'Maguire', 'England', '1993-03-05', club_ids['Manchester United'], 'CB', 6, 194, 86, 200000, '2025-06-30', 45000000),
            ('Luke', 'Shaw', 'England', '1995-07-12', club_ids['Manchester United'], 'LB', 23, 184, 78, 180000, '2026-06-30', 40000000),
            ('Marcus', 'Rashford', 'England', '1997-10-31', club_ids['Manchester United'], 'LW', 10, 183, 79, 250000, '2028-06-30', 120000000),
            
            # Liverpool
            ('Mohamed', 'Salah', 'Egypt', '1992-06-15', club_ids['Liverpool FC'], 'RW', 11, 175, 71, 350000, '2025-06-30', 100000000),
            ('Virgil', 'van Dijk', 'Netherlands', '1991-07-08', club_ids['Liverpool FC'], 'CB', 4, 193, 92, 320000, '2026-06-30', 95000000),
            ('Andy', 'Robertson', 'Scotland', '1994-03-11', club_ids['Liverpool FC'], 'LB', 26, 178, 73, 280000, '2026-06-30', 60000000),
            
            # Chelsea
            ('Enzo', 'Fernández', 'Argentina', '2001-01-17', club_ids['Chelsea FC'], 'CM', 8, 180, 76, 240000, '2032-06-30', 130000000),
            ('Reece', 'James', 'England', '2002-12-08', club_ids['Chelsea FC'], 'RB', 24, 191, 84, 200000, '2028-06-30', 90000000),
            
            # Arsenal
            ('Bukayo', 'Saka', 'England', '2001-09-05', club_ids['Arsenal FC'], 'RW', 7, 178, 69, 220000, '2027-06-30', 110000000),
            ('William', 'Saliba', 'France', '2001-03-24', club_ids['Arsenal FC'], 'CB', 12, 194, 92, 180000, '2027-06-30', 75000000),
            
            # Manchester City
            ('Erling', 'Haaland', 'Norway', '2000-07-21', club_ids['Manchester City'], 'ST', 9, 194, 88, 400000, '2027-06-30', 180000000),
            ('Phil', 'Foden', 'England', '2000-05-19', club_ids['Manchester City'], 'LW', 20, 180, 73, 330000, '2028-06-30', 150000000),
            
            # Real Madrid
            ('Vinícius', 'Júnior', 'Brazil', '2000-07-12', club_ids['Real Madrid'], 'LW', 28, 176, 73, 380000, '2027-06-30', 140000000),
            ('Jude', 'Bellingham', 'England', '2003-06-29', club_ids['Real Madrid'], 'CM', 5, 186, 84, 320000, '2029-06-30', 160000000),
            ('Rodri', 'Hernández', 'Spain', '1996-06-22', club_ids['Real Madrid'], 'CM', 4, 191, 82, 310000, '2027-06-30', 120000000),
        ]
        
        player_ids = {}
        for fname, lname, nat, birth, club, pos, shirt, height, weight, sal, contract, market in players:
            pid = db.add_player(fname, lname, nat, birth, club, pos, shirt, height, weight, sal, contract, market)
            player_ids[f"{fname} {lname}"] = pid
        
        # ===== CUPS =====
        print("Adding cups...")
        fa_cup_id = db.add_cup('FA Cup', 1871, None, 'England', 64, 'Knockout', club_ids['Manchester City'])
        champions_league_id = db.add_cup('UEFA Champions League', 1955, None, 'Europe', 32, 'Group+Knockout', club_ids['Real Madrid'])
        carabao_cup_id = db.add_cup('Carabao Cup', 1960, None, 'England', 92, 'Knockout')
        europa_league_id = db.add_cup('UEFA Europa League', 1971, None, 'Europe', 32, 'Group+Knockout')
        
        # Add cup participants
        print("Adding cup participants...")
        db.add_cup_participant(fa_cup_id, club_ids['Manchester City'], 2024, 1, 8, 2)
        db.add_cup_participant(fa_cup_id, club_ids['Manchester United'], 2024, 2, 7, 3)
        db.add_cup_participant(fa_cup_id, club_ids['Liverpool FC'], 2024, 3, 6, 4)
        
        db.add_cup_participant(champions_league_id, club_ids['Real Madrid'], 2024, 1, 15, 3)
        db.add_cup_participant(champions_league_id, club_ids['Manchester City'], 2024, 2, 14, 5)
        db.add_cup_participant(champions_league_id, club_ids['Arsenal FC'], 2024, 3, 10, 6)
        
        # ===== PLAYER STATISTICS =====
        print("Adding player statistics...")
        db.add_player_stats(player_ids['Bruno Fernandes'], 2023, 28, 8, 12, 3, 0, 2240)
        db.add_player_stats(player_ids['Mohamed Salah'], 2023, 30, 18, 5, 4, 0, 2700)
        db.add_player_stats(player_ids['Erling Haaland'], 2023, 35, 27, 8, 2, 0, 3100)
        db.add_player_stats(player_ids['Vinícius Júnior'], 2023, 32, 15, 6, 5, 1, 2880)
        db.add_player_stats(player_ids['Bukayo Saka'], 2023, 24, 7, 5, 2, 0, 1920)
        
        print("\n✓ Sample data loaded successfully!")
        
        # Display summary
        print("\n=== DATABASE SUMMARY ===")
        print(f"Leagues: {len(db.get_all_leagues())}")
        print(f"Clubs: {len(db.get_all_clubs())}")
        print(f"Stadiums: {len(db.get_all_stadiums())}")
        print(f"Coaches: {len(db.get_all_coaches())}")
        print(f"Players: {len(db.get_all_players())}")
        print(f"Cups: {len(db.get_all_cups())}")
    
    finally:
        db.close()


if __name__ == "__main__":
    load_sample_data()
