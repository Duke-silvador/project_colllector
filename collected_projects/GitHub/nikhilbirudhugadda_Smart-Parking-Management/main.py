"""
Smart Parking Management System - Interactive CLI Application.
Entry point for the Smart Parking project.
"""

from datetime import datetime, timedelta
import os
import sys
import time
from typing import Optional

# Ensure project root is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Reconfigure stdout/stderr to UTF-8 for Windows console compatibility
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from parking.parking_manager import ParkingManager
from parking.parking_slot import SlotType
from parking.vehicle import VehicleType


# ANSI Colors for terminal formatting
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    RESET = "\033[0m"


def clear_screen():
    # Only clear if terminal is attached
    if sys.stdout.isatty():
        os.system("cls" if os.name == "nt" else "clear")


def print_banner():
    banner = rf"""{Colors.BOLD}{Colors.CYAN}
================================================================================
  ____  __  __    _    ____ _____   ____   _    ____  _  _____ _   _  ____ 
 / ___||  \/  |  / \  |  _ \_   _| |  _ \ / \  |  _ \| |/ /_ _| \ | |/ ___|
 \___ \| |\/| | / _ \ | |_) || |   | |_) / _ \ | |_) | ' / | ||  \| | |  _ 
  ___) | |  | |/ ___ \|  _ < | |   |  __/ ___ \|  _ <| . \ | || |\  | |_| |
 |____/|_|  |_/_/   \_\_| \_\|_|   |_| /_/   \_\_| \_\_|\_\___|_| \_|\____|

                        M A N A G E M E N T   S Y S T E M
================================================================================{Colors.RESET}"""
    print(banner)


def menu_park_vehicle(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.GREEN}--- [1] PARK A VEHICLE ---{Colors.RESET}")
    plate = input("Enter License Plate (e.g. KA-05-MJ-1234): ").strip().upper()
    if not plate:
        print(f"{Colors.RED}License plate cannot be empty.{Colors.RESET}")
        return

    print("\nSelect Vehicle Type:")
    print("  1. Car (Regular / Compact)")
    print("  2. Motorcycle")
    print("  3. Electric Vehicle (EV)")
    print("  4. Truck / Large Vehicle")
    choice = input("Enter choice (1-4) [Default 1]: ").strip()

    vtype_map = {
        "1": VehicleType.CAR,
        "2": VehicleType.MOTORCYCLE,
        "3": VehicleType.ELECTRIC,
        "4": VehicleType.TRUCK,
    }
    vtype = vtype_map.get(choice, VehicleType.CAR)
    gate = "GATE_NORTH"

    print(f"\n{Colors.YELLOW}>> Finding closest vacant slot for {vtype.value}...{Colors.RESET}")
    result = manager.park_vehicle(plate, vtype, gate)

    if not result["success"]:
        print(f"{Colors.RED}❌ Failed to park: {result['error']}{Colors.RESET}")
        return

    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Vehicle Successfully Parked!{Colors.RESET}")
    print(f"  * Ticket ID:       {result['ticket_id']}")
    print(f"  * Allocated Slot:  {Colors.BOLD}{result['slot_id']}{Colors.RESET} (Floor {result['floor']}, Type: {result['slot_type']})")
    print(f"  * Distance:        {result['distance_meters']} meters")
    print(f"  * Entry Timestamp: {result['entry_time']}")


def menu_unpark_vehicle(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.YELLOW}--- [2] UNPARK / CHECKOUT VEHICLE ---{Colors.RESET}")
    plate = input("Enter License Plate to checkout: ").strip().upper()
    if not plate:
        print(f"{Colors.RED}License plate cannot be empty.{Colors.RESET}")
        return

    print(f"\n{Colors.YELLOW}>> Searching for plate '{plate}'...{Colors.RESET}")
    res = manager.unpark_vehicle(plate)

    if not res["success"]:
        print(f"{Colors.RED}❌ Error: {res['error']}{Colors.RESET}")
        return

    rec = res["receipt"]
    print(f"\n{Colors.GREEN}{Colors.BOLD}================ PARKING RECEIPT ================{Colors.RESET}")
    print(f"  Ticket ID:        {rec['ticket_id']}")
    print(f"  License Plate:    {rec['license_plate']}")
    print(f"  Vehicle Type:     {rec['vehicle_type']}")
    print(f"  Vacated Slot:     {rec['slot_id']}")
    print(f"  Entry Time:       {rec['entry_time']}")
    print(f"  Exit Time:        {rec['exit_time']}")
    print(f"  Duration:         {rec['duration_hours']} hours")
    print(f"{Colors.GREEN}================================================={Colors.RESET}")
    print(f"ℹ️ Slot '{rec['slot_id']}' is now vacant.")


def menu_search_vehicle(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.CYAN}--- [3] SEARCH ACTIVE VEHICLE ---{Colors.RESET}")
    plate = input("Enter License Plate to search: ").strip().upper()
    if not plate:
        return

    start_t = time.perf_counter()
    record = manager.search_vehicle(plate)
    elapsed_us = (time.perf_counter() - start_t) * 1_000_000

    if record:
        print(f"\n{Colors.GREEN}✅ Vehicle Found (Query took {elapsed_us:.2f} µs):{Colors.RESET}")
        print(f"  * Ticket:       {record['ticket_id']}")
        print(f"  * Plate:        {record['license_plate']}")
        print(f"  * Type:         {record['vehicle_type']}")
        print(f"  * Current Slot: {Colors.BOLD}{record['slot_id']}{Colors.RESET} (Floor {record['floor']})")
        print(f"  * Entry Time:   {record['entry_time']}")
    else:
        print(f"\n{Colors.RED}❌ Vehicle '{plate}' is not currently parked in the lot.{Colors.RESET}")


def menu_view_lot_status(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.HEADER}--- [4] PARKING LOT STATUS & FLOOR MAP ---{Colors.RESET}")
    summary = manager.parking_lot.get_summary()
    print(f"Facility: {Colors.BOLD}{manager.parking_lot.name}{Colors.RESET}")
    print(f"Total Bays: {summary['total_slots']} | Occupied: {summary['occupied_slots']} | Vacant: {summary['vacant_slots']}\n")

    slots = manager.parking_lot.get_all_slots()
    # Group by floor
    floors = {}
    for s in slots:
        floors.setdefault(s.floor, []).append(s)

    for floor_num in sorted(floors.keys()):
        print(f"{Colors.BOLD}Floor {floor_num}:{Colors.RESET}")
        for s in sorted(floors[floor_num], key=lambda x: x.slot_id):
            if s.is_occupied:
                car_info = s.current_vehicle.license_plate if s.current_vehicle else "OCCUPIED"
                status_str = f"{Colors.RED}[🔴 {s.slot_id:<6} {s.slot_type.value:<10} | {car_info:<14}]{Colors.RESET}"
            else:
                status_str = f"{Colors.GREEN}[🟢 {s.slot_id:<6} {s.slot_type.value:<10} | VACANT (Dist:{s.distance_from_gate:.0f}m)]{Colors.RESET}"
            print(f"  {status_str}")
        print()


def menu_longest_parked(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.YELLOW}--- [5] LONGEST PARKED VEHICLES ---{Colors.RESET}")
    top_vehicles = manager.get_longest_parked_vehicles(limit=5)
    if not top_vehicles:
        print("No vehicles currently parked.")
        return

    print(f"{'Rank':<5} | {'Plate':<15} | {'Slot':<8} | {'Type':<10} | {'Parked Duration':<16}")
    print("-" * 65)
    for idx, v in enumerate(top_vehicles, start=1):
        print(f"#{idx:<4} | {v['license_plate']:<15} | {v['slot_id']:<8} | {v['vehicle_type']:<10} | {v['duration_formatted']:<16}")


def menu_compare_navigation(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.CYAN}--- [6] COMPARE NAVIGATION ROUTES (BFS vs DFS) ---{Colors.RESET}")
    print("Available Entrance Gates: GATE_NORTH, GATE_SOUTH")
    gate = input("Enter Gate [Default GATE_NORTH]: ").strip().upper() or "GATE_NORTH"
    slot_id = input("Enter Destination Slot ID (e.g. A-101, EV-102, T-101): ").strip().upper()

    res = manager.compare_routes(gate, slot_id)
    if "error" in res:
        print(f"{Colors.RED}❌ Error: {res['error']}{Colors.RESET}")
        return

    print(f"\n{Colors.GREEN}{Colors.BOLD}Route Comparison to {slot_id}:{Colors.RESET}")
    print(f"\n{Colors.BOLD}1. BFS (Breadth-First Search - Shortest Physical/Hop Route):{Colors.RESET}")
    print(f"   Path:     {' -> '.join(res['bfs']['path'] or [])}")
    print(f"   Hops:     {res['bfs']['hops']} turns/junctions")
    print(f"   Distance: {res['bfs']['distance']} meters")

    print(f"\n{Colors.BOLD}2. DFS (Depth-First Search - Deep Exploration Route):{Colors.RESET}")
    print(f"   Path:     {' -> '.join(res['dfs']['path'] or [])}")
    print(f"   Hops:     {res['dfs']['hops']} turns/junctions")
    print(f"   Distance: {res['dfs']['distance']} meters")


def menu_inspect_data_structures(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.HEADER}--- [7] INTERNAL DATA STRUCTURES INSPECTOR ---{Colors.RESET}")
    print("  1. Visual ASCII AVL Tree (Active Vehicles)")
    print("  2. Min-Heap Available Slot Pools")
    print("  3. B-Tree Historical Transactions Log")
    choice = input("Select structure to inspect (1-3): ").strip()

    if choice == "1":
        print(f"\n{Colors.CYAN}=== AVL Tree of Active Vehicles (Sorted by Plate) ==={Colors.RESET}")
        print(f"Tree Size: {manager.active_vehicles.size()} active nodes\n")
        print(manager.active_vehicles.visualize())
    elif choice == "2":
        print(f"\n{Colors.CYAN}=== Min-Heap Priority Queues by Slot Type ==={Colors.RESET}")
        for stype, heap in manager.min_heaps.items():
            print(f"\nHeap: {stype.value} (Available: {heap.size()})")
            slots = heap.to_list()
            if slots:
                for s in slots:
                    print(f"   [Slot {s.slot_id} | Dist: {s.distance_from_gate}m | Floor: {s.floor}]")
            else:
                print("   (No vacant slots)")
    elif choice == "3":
        print(f"\n{Colors.CYAN}=== B-Tree Historical Records (Order t=3) ==={Colors.RESET}")
        records = manager.audit_btree.traverse()
        print(f"Total Historical Receipts in B-Tree: {len(records)}\n")
        for key, rec in records:
            print(f"  * Ticket: {key} | Plate: {rec['license_plate']} | Fee: ${rec['fee_paid']:.2f} | Duration: {rec['duration_hours']}h")
    else:
        print("Invalid selection.")


def menu_run_simulation(manager: ParkingManager):
    print(f"\n{Colors.BOLD}{Colors.GREEN}--- [8] AUTOMATED SMART PARKING SIMULATION ---{Colors.RESET}")
    print("Simulating arrival and departure of diverse vehicles...")

    sim_cars = [
        ("TS-09-EV-1001", VehicleType.ELECTRIC, "GATE_NORTH"),
        ("DL-01-CR-2002", VehicleType.CAR, "GATE_NORTH"),
        ("MH-04-TR-3003", VehicleType.TRUCK, "GATE_SOUTH"),
        ("KA-03-MC-4004", VehicleType.MOTORCYCLE, "GATE_SOUTH"),
    ]

    for plate, vtype, gate in sim_cars:
        print(f"\n🚗 Incoming vehicle: {plate} ({vtype.value}) at {gate}...")
        res = manager.park_vehicle(plate, vtype, gate)
        if res["success"]:
            print(f"   -> Allocated: {res['slot_id']} (Floor {res['floor']}) | Dist: {res['distance_meters']}m")
            print(f"   -> BFS Route: {' -> '.join(res['navigation_path'])}")
        else:
            print(f"   -> Failed: {res['error']}")
        time.sleep(0.3)

    print(f"\n{Colors.YELLOW}Simulating departure of vehicle 'TS-09-EV-1001' after 3.5 hours...{Colors.RESET}")
    sim_exit_time = datetime.now() + timedelta(hours=3.5)
    unpark_res = manager.unpark_vehicle("TS-09-EV-1001", exit_time=sim_exit_time)
    if unpark_res["success"]:
        rec = unpark_res["receipt"]
        print(f"   -> Unparked: {rec['license_plate']} from Slot {rec['slot_id']}")
        print(f"   -> Duration: {rec['duration_hours']} hours")
        print(f"   -> Receipt logged into B-Tree.")

    print(f"\n{Colors.GREEN}✅ Simulation completed successfully!{Colors.RESET}")


def main():
    records_path = os.path.join(BASE_DIR, "data", "parking_records.json")
    manager = ParkingManager(records_file=records_path)

    while True:
        print_banner()
        print(f"{Colors.BOLD}Select an Option:{Colors.RESET}")
        print("  1. 🚗 Park a Vehicle")
        print("  2. 🏁 Unpark / Checkout Vehicle")
        print("  3. 🔍 Search Active Vehicle")
        print("  4. 📊 View Parking Lot Status & Floor Map")
        print("  5. ⏱️ View Longest Parked Vehicles")
        print("  6. � Save & Exit")
        print("-" * 72)

        try:
            choice = input(f"{Colors.BOLD}Enter your choice (1-6): {Colors.RESET}").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting...")
            break

        if choice == "1":
            menu_park_vehicle(manager)
        elif choice == "2":
            menu_unpark_vehicle(manager)
        elif choice == "3":
            menu_search_vehicle(manager)
        elif choice == "4":
            menu_view_lot_status(manager)
        elif choice == "5":
            menu_longest_parked(manager)
        elif choice == "6":
            manager.save_to_json(records_path)
            print(f"\n{Colors.GREEN}All records saved to {records_path}. Goodbye!{Colors.RESET}")
            break
        else:
            print(f"{Colors.RED}Invalid choice, please enter 1-6.{Colors.RESET}")

        input(f"\n{Colors.CYAN}Press [Enter] to return to main menu...{Colors.RESET}")


if __name__ == "__main__":
    main()

