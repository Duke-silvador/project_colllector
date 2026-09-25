from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
import csv
import math
import os

# *************** Control Constants and Student Data ***************

STUDENT_DATA = [
    {'sn': 1, 'name_ar': "دانه أحمد محمد", 'name_en': "Dana Ahmed Mohammed"},
    {'sn': 2, 'name_ar': "شموخ ناصر عبدالله", 'name_en': "Shomoukh Nasser Abdullah"},
    {'sn': 3, 'name_ar': "أنوار عيسى خالد", 'name_en': "Anwar Eissa Khaled"},
    {'sn': 4, 'name_ar': "وضحى محمد سعد", 'name_en': "Wadha Mohammed Saad"},
    {'sn': 5, 'name_ar': "ريحانه إبراهيم يحيى", 'name_en': "Rehana Ibrahim Yahya"},
    {'sn': 6, 'name_ar': "فاطمة أحمد عبداللطيف", 'name_en': "Fatimah Ahmed AbdulLatif"},
    {'sn': 7, 'name_ar': "لين سالم محمد", 'name_en': "Lynn Salem Mohammed"},
    {'sn': 8, 'name_ar': "أمجاد أحمد خالد", 'name_en': "Amjad Ahmed Khaled"},
    {'sn': 9, 'name_ar': "شهد أحمد محمد", 'name_en': "Shahad Ahmed Mohammed"},
    {'sn': 10, 'name_ar': "الجودي إبراهيم خليفة", 'name_en': "Aljoudi Ibrahim Khalifa"},
    {'sn': 11, 'name_ar': "أروى عادل حمد", 'name_en': "Arwa Adel Hamad"},
    {'sn': 12, 'name_ar': "منيرة عبدالله سالم", 'name_en': "Munira Abdullah Salem"},
    {'sn': 13, 'name_ar': "دانه ضيف الله محمد", 'name_en': "Dana Dhaif Allah Mohammed"},
    {'sn': 14, 'name_ar': "مريم عيسى أحمد", 'name_en': "Maryam Eissa Ahmed"},
    {'sn': 15, 'name_ar': "غزيل عايد عمر", 'name_en': "Ghuzail Ayed Omar"},
    {'sn': 16, 'name_ar': "هدى حسن محمد", 'name_en': "Huda Hassan Mohammed"},
    {'sn': 17, 'name_ar': "جود حسن خالد", 'name_en': "Joud Hassan Khaled"},
    {'sn': 18, 'name_ar': "فجر عبدالمعين أحمد", 'name_en': "Fajr Abdulmaeen Ahmed"},
    {'sn': 19, 'name_ar': "رفيف عبدالله محمد", 'name_en': "Rafif Abdullah Mohammed"},
    {'sn': 20, 'name_ar': "وريف عبدالله خالد", 'name_en': "Wareef Abdullah Khaled"},
    {'sn': 21, 'name_ar': "فاطمة عبد الحميد يونس", 'name_en': "Fatimah Abdulhameed Younis"},
    {'sn': 22, 'name_ar': "فاطمة سعد مبخوت", 'name_en': "Fatimah Saad Makhbout"},
    {'sn': 23, 'name_ar': "منيرة عبدالله فهد", 'name_en': "Munira Abdullah Fahad"},
    {'sn': 24, 'name_ar': "ندى عبدالله صالح", 'name_en': "Nada Abdullah Saleh"},
    {'sn': 25, 'name_ar': "غرام إبراهيم ناصر", 'name_en': "Gharam Ibrahim Nasser"},
    {'sn': 26, 'name_ar': "هدى أحمد خالد", 'name_en': "Huda Ahmed Khaled"},
    {'sn': 27, 'name_ar': "ليان علي حسن", 'name_en': "Layan Ali Hassan"},
    {'sn': 28, 'name_ar': "مريم محسن سيال", 'name_en': "Maryam Mohsen Sial"},
    {'sn': 29, 'name_ar': "فاطمة قاسم أحمد", 'name_en': "Fatimah Qasim Ahmed"},
    {'sn': 30, 'name_ar': "شموخ مرزوق أحمد", 'name_en': "Shomoukh Marzouq Ahmed"},
    {'sn': 31, 'name_ar': "ريجان حيدر محمد", 'name_en': "Rejan Haidar Mohammed"},
    {'sn': 32, 'name_ar': "رضوى راشد أحمد", 'name_en': "Radwa Rashid Ahmed"},
    {'sn': 33, 'name_ar': "لجين أحمد يحيى", 'name_en': "Lujain Ahmed Yahya"},
    {'sn': 34, 'name_ar': "منال محمد خالد", 'name_en': "Manal Mohammed Khaled"},
    {'sn': 35, 'name_ar': "دانه راشد عبدالله", 'name_en': "Dana Rashid Abdullah"},
    {'sn': 36, 'name_ar': "سهام يحيى محمد", 'name_en': "Siham Yahya Mohammed"},
    {'sn': 37, 'name_ar': "بسمه عادل محمد", 'name_en': "Basma Adel Mohammed"}
]

# *************** Location Settings ***************

TARGET_LATITUDE = 26.3150
TARGET_LONGITUDE = 50.1500
MAX_DISTANCE_METERS = 50

# *************** Attendance Time Settings ***************

OPEN_TIME_HOUR = 16
OPEN_TIME_MINUTE = 20
DURATION_MINUTES = 220

# Maximum number of failed location verification attempts
MAX_FAILED_ATTEMPTS = 5

# ************************************************************

app = Flask(__name__)

# Attendance records stored in server memory
attendance_records = {
    item['sn']: {
        'sn': item['sn'],
        'name_ar': item['name_ar'],
        'name_en': item['name_en'],
        'isPresent': False,
        'checkInTime': None,
        'checkType_ar': 'لم يسجل',
        'checkType_en': 'Not Registered',
        'failedAttempts': 0
    }
    for item in STUDENT_DATA
}


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two geographic coordinates
    using the Haversine formula.
    """
    R = 6371000

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def save_attendance_to_csv(student_record):
    """
    Save successful attendance records to a daily CSV file.
    """
    filename = datetime.now().strftime("Attendance_Records_%Y-%m-%d.csv")

    fieldnames = [
        'SN',
        'Student Name',
        'Check-In Time',
        'Check Type'
    ]

    file_exists = os.path.isfile(filename)

    with open(
        filename,
        'a' if file_exists else 'w',
        newline='',
        encoding='utf-8'
    ) as csvfile:

        writer = csv.DictWriter(
            csvfile,
            fieldnames=fieldnames
        )

        if not file_exists:
            writer.writeheader()

        writer.writerow({
            'SN': student_record['sn'],
            'Student Name': student_record['name_en'],
            'Check-In Time': student_record['checkInTime'],
            'Check Type': student_record['checkType_en']
        })


@app.route('/', methods=['GET'])
def index():
    return render_template(
        'index.html',
        student_data=STUDENT_DATA
    )


@app.route('/get_status', methods=['GET'])
def get_status():

    now = datetime.now()

    open_time = now.replace(
        hour=OPEN_TIME_HOUR,
        minute=OPEN_TIME_MINUTE,
        second=0,
        microsecond=0
    )

    close_time = open_time + timedelta(
        minutes=DURATION_MINUTES
    )

    # Determine the current attendance window status
    if now < open_time:

        status_ar = 'مغلق (لم يبدأ بعد)'
        status_en = 'Closed (Not started yet)'

    elif now > close_time:

        status_ar = 'مغلق (انتهى وقت التسجيل)'
        status_en = 'Closed (Registration time finished)'

    else:

        status_ar = 'متاح'
        status_en = 'Available'

    attendance_finished = now > close_time

    attendance_list = []

    for record in attendance_records.values():

        full_record = record.copy()

        # Determine displayed status
        if record['isPresent']:

            full_record['status_ar'] = 'حاضر'
            full_record['status_en'] = 'Present'

        elif attendance_finished:

            full_record['status_ar'] = 'غائب'
            full_record['status_en'] = 'Absent'

        else:

            full_record['status_ar'] = 'لم يسجل'
            full_record['status_en'] = 'Not Registered'

        full_record['attendanceFinished'] = attendance_finished

        attendance_list.append(full_record)

    return jsonify({
        'status_ar': status_ar,
        'status_en': status_en,
        'attendance': attendance_list,
        'attendanceFinished': attendance_finished
    })


@app.route('/submit_attendance', methods=['POST'])
def submit_attendance():

    data = request.get_json()

    if not data:
        return jsonify({
            'success': False,
            'message_ar': '❌ لم يتم إرسال بيانات الحضور.',
            'message_en': '❌ Attendance data was not received.'
        })

    student_name = data.get('name')
    user_lat = data.get('lat')
    user_lon = data.get('lon')

    response = {
        'success': False,
        'message_ar': '',
        'message_en': ''
    }

    # Find student by Arabic or English name
    student_record = None

    for student in STUDENT_DATA:

        if (
            student_name == student['name_ar']
            or student_name == student['name_en']
        ):
            student_record = attendance_records[student['sn']]
            break

    if student_record is None:

        response['message_ar'] = (
            '❌ الاسم غير موجود في قائمة الطالبات.'
        )

        response['message_en'] = (
            '❌ Name not found in the student list.'
        )

        return jsonify(response)

    # Check attendance time
    now = datetime.now()

    open_time = now.replace(
        hour=OPEN_TIME_HOUR,
        minute=OPEN_TIME_MINUTE,
        second=0,
        microsecond=0
    )

    close_time = open_time + timedelta(
        minutes=DURATION_MINUTES
    )

    if now < open_time:

        response['message_ar'] = (
            '⏳ لم يبدأ وقت تسجيل الحضور بعد.'
        )

        response['message_en'] = (
            '⏳ Attendance registration has not started yet.'
        )

        return jsonify(response)

    if now > close_time:

        response['message_ar'] = (
            '⛔ انتهى وقت تسجيل الحضور.'
        )

        response['message_en'] = (
            '⛔ Attendance registration time has ended.'
        )

        return jsonify(response)

    # Prevent duplicate attendance
    if student_record['isPresent']:

        response['message_ar'] = (
            f"🛑 تم تسجيل حضورك سابقاً في: "
            f"{student_record['checkInTime']}"
        )

        response['message_en'] = (
            f"🛑 Attendance already registered at: "
            f"{student_record['checkInTime']}"
        )

        return jsonify(response)

    # Check maximum failed attempts
    if student_record['failedAttempts'] >= MAX_FAILED_ATTEMPTS:

        response['message_ar'] = (
            f"🚫 تم حظر التسجيل لـ "
            f"{student_record['name_ar']}. "
            f"تجاوزت {MAX_FAILED_ATTEMPTS} محاولات فاشلة. "
            f"يرجى مراجعة المعلمة."
        )

        response['message_en'] = (
            f"🚫 Registration blocked for "
            f"{student_record['name_en']}. "
            f"Exceeded {MAX_FAILED_ATTEMPTS} failed attempts."
        )

        return jsonify(response)

    # *************** Location Verification ***************

    location_valid = False

    check_type_ar = 'استثنائي (الموقع غير مؤكد)'
    check_type_en = 'Exceptional (Location not confirmed)'

    distance_message_ar = ''
    distance_message_en = ''

    if user_lat is not None and user_lon is not None:

        try:

            distance = calculate_distance(
                float(user_lat),
                float(user_lon),
                TARGET_LATITUDE,
                TARGET_LONGITUDE
            )

            distance = round(distance)

            if distance <= MAX_DISTANCE_METERS:

                check_type_ar = 'عادي (موقع مؤكد)'
                check_type_en = 'Normal (Location confirmed)'

                location_valid = True

            else:

                distance_message_ar = (
                    f'الموقع يبعد {distance} متر '
                    f'عن النقطة المحددة.'
                )

                distance_message_en = (
                    f'Location is {distance} meters '
                    f'away from the target point.'
                )

                check_type_ar = (
                    f'استثنائي (بعيد بـ {distance} م)'
                )

                check_type_en = (
                    f'Exceptional (Away by {distance} m)'
                )

        except (TypeError, ValueError):

            check_type_ar = (
                'استثنائي (فشل تحديد الموقع)'
            )

            check_type_en = (
                'Exceptional (Location determination failed)'
            )

    # *************** Failed Location Verification ***************

    if not location_valid:

        student_record['failedAttempts'] += 1

        attempt_number = student_record['failedAttempts']

        if user_lat is None or user_lon is None:

            response['message_ar'] = (
                f'❌ فشل التحقق: لم يتم تحديد موقع الجهاز. '
                f'يرجى تفعيل الموقع. '
                f'المحاولة {attempt_number} من '
                f'{MAX_FAILED_ATTEMPTS}'
            )

            response['message_en'] = (
                f'❌ Verification Failed: Device location '
                f'could not be determined. '
                f'Please enable location. '
                f'Attempt {attempt_number} of '
                f'{MAX_FAILED_ATTEMPTS}'
            )

        else:

            response['message_ar'] = (
                f'❌ فشل التحقق: الموقع غير صحيح. '
                f'{distance_message_ar} '
                f'المحاولة {attempt_number} من '
                f'{MAX_FAILED_ATTEMPTS}'
            )

            response['message_en'] = (
                f'❌ Verification Failed: Incorrect location. '
                f'{distance_message_en} '
                f'Attempt {attempt_number} of '
                f'{MAX_FAILED_ATTEMPTS}'
            )

        return jsonify(response)

    # *************** Successful Attendance Registration ***************

    check_in_time = now.strftime("%H:%M:%S")

    student_record['failedAttempts'] = 0
    student_record['isPresent'] = True
    student_record['checkInTime'] = check_in_time
    student_record['checkType_ar'] = check_type_ar
    student_record['checkType_en'] = check_type_en

    save_attendance_to_csv(student_record)

    response['success'] = True

    response['message_ar'] = (
        f"✅ تم تسجيل حضورك يا "
        f"{student_record['name_ar']} "
        f"في {check_in_time} "
        f"({check_type_ar})"
    )

    response['message_en'] = (
        f"✅ Attendance registered for "
        f"{student_record['name_en']} "
        f"at {check_in_time} "
        f"({check_type_en})"
    )

    response['checkType_ar'] = check_type_ar
    response['checkType_en'] = check_type_en

    return jsonify(response)


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
