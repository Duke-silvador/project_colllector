#!/usr/bin/env python3
"""
We Are Football 2024 Editor - SQLite Database Manager
Manage players, stadiums, coaches, and cups
"""

import sqlite3
from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
import json

class WAFDatabaseManager:
    """
    Database manager for We Are Football 2024 Editor
    """
    
    def __init__(self, db_path: str = 'waf2024.db'):
        """Initialize database connection"""
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        self._init_database()
    
    def _init_database(self):
        """Initialize database schema from SQL file"""
        try:
            with open('database_schema.sql', 'r') as f:
                schema = f.read()
                self.cursor.executescript(schema)
                self.conn.commit()
                print("Database initialized successfully")
        except FileNotFoundError:
            print("database_schema.sql not found")
    
    def close(self):
        """Close database connection"""
        self.conn.close()
    
    # ===== LEAGUE OPERATIONS =====
    
    def add_league(self, name: str, country: str, founded_year: int = None, level: int = 1) -> int:
        """Add a new league"""
        query = "INSERT INTO Leagues (name, country, founded_year, level) VALUES (?, ?, ?, ?)"
        self.cursor.execute(query, (name, country, founded_year, level))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_league(self, league_id: int) -> Dict:
        """Get league details"""
        query = "SELECT * FROM Leagues WHERE league_id = ?"
        self.cursor.execute(query, (league_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
    
    def get_all_leagues(self) -> List[Dict]:
        """Get all leagues"""
        query = "SELECT * FROM Leagues ORDER BY name"
        self.cursor.execute(query)
        return [dict(row) for row in self.cursor.fetchall()]
    
    # ===== STADIUM OPERATIONS =====
    
    def add_stadium(self, name: str, city: str, country: str, capacity: int, 
                   built_year: int = None, surface: str = 'Grass',
                   pitch_length: int = None, pitch_width: int = None) -> int:
        """Add a new stadium"""
        query = """INSERT INTO Stadiums (name, city, country, capacity, built_year, surface, pitch_length, pitch_width)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (name, city, country, capacity, built_year, surface, pitch_length, pitch_width))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_stadium(self, stadium_id: int) -> Dict:
        """Get stadium details"""
        query = "SELECT * FROM Stadiums WHERE stadium_id = ?"
        self.cursor.execute(query, (stadium_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
    
    def get_all_stadiums(self) -> List[Dict]:
        """Get all stadiums"""
        query = "SELECT * FROM Stadiums ORDER BY name"
        self.cursor.execute(query)
        return [dict(row) for row in self.cursor.fetchall()]
    
    # ===== COACH OPERATIONS =====
    
    def add_coach(self, first_name: str, last_name: str, nationality: str, birth_date: str = None,
                 experience_years: int = 0, preferred_formation: str = '4-3-3',
                 salary: float = 0, current_club_id: int = None) -> int:
        """Add a new coach"""
        query = """INSERT INTO Coaches (first_name, last_name, nationality, birth_date, experience_years, 
                   preferred_formation, salary, current_club_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (first_name, last_name, nationality, birth_date, experience_years, 
                                    preferred_formation, salary, current_club_id))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_coach(self, coach_id: int) -> Dict:
        """Get coach details"""
        query = "SELECT * FROM Coaches WHERE coach_id = ?"
        self.cursor.execute(query, (coach_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
    
    def get_all_coaches(self) -> List[Dict]:
        """Get all coaches"""
        query = "SELECT * FROM Coaches ORDER BY last_name, first_name"
        self.cursor.execute(query)
        return [dict(row) for row in self.cursor.fetchall()]
    
    def get_coaches_by_nationality(self, nationality: str) -> List[Dict]:
        """Get coaches by nationality"""
        query = "SELECT * FROM Coaches WHERE nationality = ? ORDER BY last_name"
        self.cursor.execute(query, (nationality,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    # ===== CLUB OPERATIONS =====
    
    def add_club(self, name: str, league_id: int, founded_year: int = None,
                stadium_id: int = None, manager_id: int = None, budget: float = 0) -> int:
        """Add a new club"""
        query = """INSERT INTO Clubs (name, league_id, founded_year, stadium_id, manager_id, budget)
                   VALUES (?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (name, league_id, founded_year, stadium_id, manager_id, budget))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_club(self, club_id: int) -> Dict:
        """Get club details with stadium and manager info"""
        query = """SELECT c.*, s.name as stadium_name, co.first_name as manager_first_name, 
                   co.last_name as manager_last_name FROM Clubs c
                   LEFT JOIN Stadiums s ON c.stadium_id = s.stadium_id
                   LEFT JOIN Coaches co ON c.manager_id = co.coach_id
                   WHERE c.club_id = ?"""
        self.cursor.execute(query, (club_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
    
    def get_clubs_by_league(self, league_id: int) -> List[Dict]:
        """Get all clubs in a league"""
        query = """SELECT c.*, s.name as stadium_name FROM Clubs c
                   LEFT JOIN Stadiums s ON c.stadium_id = s.stadium_id
                   WHERE c.league_id = ? ORDER BY c.name"""
        self.cursor.execute(query, (league_id,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    def get_all_clubs(self) -> List[Dict]:
        """Get all clubs"""
        query = "SELECT * FROM Clubs ORDER BY name"
        self.cursor.execute(query)
        return [dict(row) for row in self.cursor.fetchall()]
    
    def update_club_manager(self, club_id: int, coach_id: int) -> bool:
        """Update club manager"""
        query = "UPDATE Clubs SET manager_id = ? WHERE club_id = ?"
        self.cursor.execute(query, (coach_id, club_id))
        self.conn.commit()
        return self.cursor.rowcount > 0
    
    # ===== PLAYER OPERATIONS =====
    
    def add_player(self, first_name: str, last_name: str, nationality: str, birth_date: str,
                  club_id: int, position: str, shirt_number: int = None, height_cm: int = None,
                  weight_kg: int = None, salary: float = 0, contract_end_date: str = None,
                  market_value: float = 0) -> int:
        """Add a new player"""
        query = """INSERT INTO Players (first_name, last_name, nationality, birth_date, height_cm, weight_kg,
                   position, club_id, shirt_number, salary, contract_end_date, market_value)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (first_name, last_name, nationality, birth_date, height_cm, weight_kg,
                                    position, club_id, shirt_number, salary, contract_end_date, market_value))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_player(self, player_id: int) -> Dict:
        """Get player details"""
        query = "SELECT * FROM Players WHERE player_id = ?"
        self.cursor.execute(query, (player_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
    
    def get_players_by_club(self, club_id: int) -> List[Dict]:
        """Get all players in a club"""
        query = "SELECT * FROM Players WHERE club_id = ? ORDER BY shirt_number, last_name"
        self.cursor.execute(query, (club_id,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    def get_players_by_position(self, position: str) -> List[Dict]:
        """Get all players by position"""
        query = "SELECT * FROM Players WHERE position = ? ORDER BY last_name"
        self.cursor.execute(query, (position,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    def get_players_by_nationality(self, nationality: str) -> List[Dict]:
        """Get all players by nationality"""
        query = "SELECT * FROM Players WHERE nationality = ? ORDER BY last_name"
        self.cursor.execute(query, (nationality,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    def get_all_players(self) -> List[Dict]:
        """Get all players"""
        query = "SELECT * FROM Players ORDER BY last_name, first_name"
        self.cursor.execute(query)
        return [dict(row) for row in self.cursor.fetchall()]
    
    def transfer_player(self, player_id: int, to_club_id: int, transfer_fee: float = 0,
                       transfer_date: str = None, status: str = 'Completed') -> int:
        """Transfer a player to another club"""
        if transfer_date is None:
            transfer_date = date.today().isoformat()
        
        # Get current club
        player = self.get_player(player_id)
        from_club_id = player['club_id'] if player else None
        
        # Update player's club
        query = "UPDATE Players SET club_id = ? WHERE player_id = ?"
        self.cursor.execute(query, (to_club_id, player_id))
        
        # Record transfer
        query = """INSERT INTO Transfers (player_id, from_club_id, to_club_id, transfer_date, transfer_fee, status)
                   VALUES (?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (player_id, from_club_id, to_club_id, transfer_date, transfer_fee, status))
        self.conn.commit()
        return self.cursor.lastrowid
    
    # ===== CUP OPERATIONS =====
    
    def add_cup(self, name: str, start_year: int, end_year: int = None, country: str = None,
               total_teams: int = None, format: str = 'Knockout', champion_club_id: int = None) -> int:
        """Add a new cup competition"""
        query = """INSERT INTO Cups (name, country, start_year, end_year, champion_club_id, total_teams, format)
                   VALUES (?, ?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (name, country, start_year, end_year, champion_club_id, total_teams, format))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_cup(self, cup_id: int) -> Dict:
        """Get cup details"""
        query = "SELECT * FROM Cups WHERE cup_id = ?"
        self.cursor.execute(query, (cup_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
    
    def get_all_cups(self) -> List[Dict]:
        """Get all cups"""
        query = "SELECT * FROM Cups ORDER BY name"
        self.cursor.execute(query)
        return [dict(row) for row in self.cursor.fetchall()]
    
    def add_cup_participant(self, cup_id: int, club_id: int, season_year: int,
                           finished_position: int = None, goals_scored: int = 0,
                           goals_conceded: int = 0) -> int:
        """Add a club's participation in a cup"""
        query = """INSERT INTO Cup_Participants (cup_id, club_id, season_year, finished_position, goals_scored, goals_conceded)
                   VALUES (?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (cup_id, club_id, season_year, finished_position, goals_scored, goals_conceded))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_cup_participants(self, cup_id: int, season_year: int = None) -> List[Dict]:
        """Get all participants of a cup"""
        if season_year:
            query = """SELECT cp.*, c.name as club_name FROM Cup_Participants cp
                       JOIN Clubs c ON cp.club_id = c.club_id
                       WHERE cp.cup_id = ? AND cp.season_year = ?
                       ORDER BY cp.finished_position"""
            self.cursor.execute(query, (cup_id, season_year))
        else:
            query = """SELECT cp.*, c.name as club_name FROM Cup_Participants cp
                       JOIN Clubs c ON cp.club_id = c.club_id
                       WHERE cp.cup_id = ? ORDER BY cp.season_year DESC, cp.finished_position"""
            self.cursor.execute(query, (cup_id,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    def set_cup_champion(self, cup_id: int, club_id: int) -> bool:
        """Set the champion of a cup"""
        query = "UPDATE Cups SET champion_club_id = ? WHERE cup_id = ?"
        self.cursor.execute(query, (club_id, cup_id))
        self.conn.commit()
        return self.cursor.rowcount > 0
    
    # ===== PLAYER STATS OPERATIONS =====
    
    def add_player_stats(self, player_id: int, season_year: int, games_played: int = 0,
                        goals_scored: int = 0, assists: int = 0, yellow_cards: int = 0,
                        red_cards: int = 0, minutes_played: int = 0) -> int:
        """Add player statistics for a season"""
        query = """INSERT INTO Player_Stats (player_id, season_year, games_played, goals_scored, assists,
                   yellow_cards, red_cards, minutes_played)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)"""
        self.cursor.execute(query, (player_id, season_year, games_played, goals_scored, assists,
                                    yellow_cards, red_cards, minutes_played))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_player_stats(self, player_id: int, season_year: int = None) -> List[Dict]:
        """Get player statistics"""
        if season_year:
            query = "SELECT * FROM Player_Stats WHERE player_id = ? AND season_year = ?"
            self.cursor.execute(query, (player_id, season_year))
        else:
            query = "SELECT * FROM Player_Stats WHERE player_id = ? ORDER BY season_year DESC"
            self.cursor.execute(query, (player_id,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    # ===== TRANSFER OPERATIONS =====
    
    def get_player_transfers(self, player_id: int) -> List[Dict]:
        """Get all transfers for a player"""
        query = """SELECT t.*, p.first_name as player_first_name, p.last_name as player_last_name,
                   fc.name as from_club, tc.name as to_club FROM Transfers t
                   JOIN Players p ON t.player_id = p.player_id
                   LEFT JOIN Clubs fc ON t.from_club_id = fc.club_id
                   JOIN Clubs tc ON t.to_club_id = tc.club_id
                   WHERE t.player_id = ? ORDER BY t.transfer_date DESC"""
        self.cursor.execute(query, (player_id,))
        return [dict(row) for row in self.cursor.fetchall()]
    
    def get_transfers_by_club(self, club_id: int) -> List[Dict]:
        """Get all transfers to a club"""
        query = """SELECT t.*, p.first_name as player_first_name, p.last_name as player_last_name,
                   fc.name as from_club FROM Transfers t
                   JOIN Players p ON t.player_id = p.player_id
                   LEFT JOIN Clubs fc ON t.from_club_id = fc.club_id
                   WHERE t.to_club_id = ? ORDER BY t.transfer_date DESC"""
        self.cursor.execute(query, (club_id,))
        return [dict(row) for row in self.cursor.fetchall()]


if __name__ == "__main__":
    # Example usage
    db = WAFDatabaseManager('waf2024.db')
    
    try:
        # Add a league
        league_id = db.add_league('Premier League', 'England', 1992, 1)
        print(f"Added league: {league_id}")
        
        # Add a stadium
        stadium_id = db.add_stadium('Old Trafford', 'Manchester', 'England', 75000, 1910, 'Grass', 105, 68)
        print(f"Added stadium: {stadium_id}")
        
        # Add a coach
        coach_id = db.add_coach('Erik', 'ten Hag', 'Netherlands', '1970-02-02', 20, '4-2-3-1', 15000000)
        print(f"Added coach: {coach_id}")
        
        # Add a club
        club_id = db.add_club('Manchester United', league_id, 1878, stadium_id, coach_id, 500000000)
        print(f"Added club: {club_id}")
        
        # Add players
        player_id = db.add_player('Bruno', 'Fernandes', 'Portugal', '1994-09-08', club_id, 'CM', 8, 179, 73, 300000, '2026-06-30', 80000000)
        print(f"Added player: {player_id}")
        
        # Add a cup
        cup_id = db.add_cup('FA Cup', 1871, None, 'England', 64, 'Knockout')
        print(f"Added cup: {cup_id}")
        
        # Get club details
        club = db.get_club(club_id)
        print(f"\nClub: {club}")
        
        print("\nDatabase setup complete!")
    
    finally:
        db.close()
