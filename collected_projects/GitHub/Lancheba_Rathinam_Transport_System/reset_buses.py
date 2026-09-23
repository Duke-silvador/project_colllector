from datetime import time
from buses.models import Bus
from parking.models import ParkingSlot, recompute_blocked_slots

# Free every slot that currently has a bus, before the buses are gone.
ParkingSlot.objects.filter(bus__isnull=False).update(
    is_occupied=False, is_blocked=False, bus=None
)
recompute_blocked_slots()

deleted_count, _ = Bus.objects.all().delete()
print(f"Deleted {deleted_count} bus record(s) and cleared their slots.")

buses = [
    ("CAB 1", "RFID-CAB-01", "Ukkadam", time(7, 30), 10, 2.5),
    ("CAB 2", "RFID-CAB-02", "Gandhipuram", time(7, 35), 10, 2.5),
    ("CAB 3", "RFID-CAB-03", "Saibaba Colony", time(7, 40), 10, 2.5),
    ("CAB 4", "RFID-CAB-04", "RS Puram", time(7, 45), 10, 2.5),
    ("CAB 5", "RFID-CAB-05", "Peelamedu", time(7, 50), 10, 2.5),
    ("CAB 6", "RFID-CAB-06", "Singanallur", time(7, 55), 10, 2.5),
    ("CAB 7", "RFID-CAB-07", "Podanur", time(8, 0), 10, 2.5),
    ("CAB 8", "RFID-CAB-08", "Sulur", time(8, 5), 10, 2.5),
    ("CAB 9", "RFID-CAB-09", "Vadavalli", time(8, 10), 10, 2.5),
    ("CAB 10", "RFID-CAB-10", "Thudiyalur", time(8, 15), 10, 2.5),
    ("CAB 11", "RFID-CAB-11", "Kovaipudur", time(8, 20), 10, 2.5),
    ("CAB 12", "RFID-CAB-12", "Ganapathy", time(8, 25), 10, 2.5),
    ("CAB 13", "RFID-CAB-13", "Ramanathapuram", time(8, 30), 10, 2.5),
    ("CAB 14", "RFID-CAB-14", "Kuniyamuthur", time(8, 35), 10, 2.5),
    ("CAB 15", "RFID-CAB-15", "Selvapuram", time(8, 40), 10, 2.5),
]

for bus_number, rfid_uid, route, dep, length, width in buses:
    Bus.objects.create(
        bus_number=bus_number, rfid_uid=rfid_uid, route=route,
        departure_time=dep, length_m=length, width_m=width, is_active=True,
    )

print(f"Created {len(buses)} new bus(es). {Bus.objects.count()} total.")