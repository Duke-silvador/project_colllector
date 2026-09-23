from buses.models import Bus
from datetime import time

buses = [
    ("BUS-02", "RFID-BUS-002", "Ukkadam", time(7, 30), 10, 2.5),
    ("BUS-03", "RFID-BUS-003", "Gandhipuram", time(7, 35), 10, 2.5),
    ("BUS-04", "RFID-BUS-004", "Saibaba Colony", time(7, 40), 10, 2.5),
    ("BUS-05", "RFID-BUS-005", "RS Puram", time(7, 45), 10, 2.5),
    ("BUS-06", "RFID-BUS-006", "Peelamedu", time(7, 50), 10, 2.5),
    ("BUS-07", "RFID-BUS-007", "Singanallur", time(7, 55), 10, 2.5),
    ("BUS-08", "RFID-BUS-008", "Podanur", time(8, 0), 10, 2.5),
    ("BUS-09", "RFID-BUS-009", "Sulur", time(8, 5), 10, 2.5),
    ("BUS-10", "RFID-BUS-010", "Vadavalli", time(8, 10), 10, 2.5),
    ("BUS-11", "RFID-BUS-011", "Thudiyalur", time(8, 15), 10, 2.5),
    ("BUS-12", "RFID-BUS-012", "Kovaipudur", time(8, 20), 10, 2.5),
    ("BUS-13", "RFID-BUS-013", "Ganapathy", time(8, 25), 10, 2.5),
    ("BUS-14", "RFID-BUS-014", "Ramanathapuram", time(8, 30), 10, 2.5),
    ("BUS-15", "RFID-BUS-015", "Kuniyamuthur", time(8, 35), 10, 2.5),
    ("BUS-16", "RFID-BUS-016", "Selvapuram", time(8, 40), 10, 2.5),
]

created = 0
for bus_number, rfid_uid, route, dep, length, width in buses:
    _, was_created = Bus.objects.get_or_create(
        bus_number=bus_number,
        defaults=dict(
            rfid_uid=rfid_uid, route=route, departure_time=dep,
            length_m=length, width_m=width, is_active=True,
        ),
    )
    created += was_created

print(f"Created {created} new bus(es). {Bus.objects.count()} total.")