from sensors.views import rfid_event
from django.test import RequestFactory

rfid_uids = [
    "RFID-BUS-003",
    "RFID-BUS-004",
    "RFID-BUS-005",
    "RFID-BUS-006",
    "RFID-BUS-007",
]

factory = RequestFactory()

for uid in rfid_uids:
    request = factory.post(
        "/api/sensors/rfid/",
        data={"sensor_id": "RFID-GATE-IN", "rfid_uid": uid, "event_type": "PARKED"},
        content_type="application/json",
    )
    response = rfid_event(request)
    print(uid, "->", response.status_code, response.data)