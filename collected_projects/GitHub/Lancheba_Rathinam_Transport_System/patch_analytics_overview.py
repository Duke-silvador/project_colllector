path = "attendance/views.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

anchor = '''        "morning": slot_block("MORNING"),
        "evening": slot_block("EVENING"),
    })'''

insertion = anchor + '''


# ---------------------------------------------------------------------------
# Analytics: cohort-wide overview (trend, bus comparison, top absentees)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([CanManageBuses])
def attendance_analytics_overview(request):
    period = (request.query_params.get("period") or "monthly").lower()
    bus_id = request.query_params.get("bus")
    department = request.query_params.get("department")

    today = date_cls.today()
    year = int(request.query_params.get("year") or today.year)

    sessions = AttendanceSession.objects.filter(date__year=year, is_holiday=False)
    month = None
    if period == "monthly":
        month = int(request.query_params.get("month") or today.month)
        sessions = sessions.filter(date__month=month)
    if bus_id:
        sessions = sessions.filter(bus_id=bus_id)

    records = AttendanceRecord.objects.filter(
        session__in=sessions, person_type="STUDENT"
    ).select_related("session", "student")
    if department:
        records = records.filter(student__department__iexact=department)

    total = records.count()
    present = records.filter(status="PRESENT").count()
    absent = total - present
    overall_pct = round((present / total) * 100, 1) if total else 0.0

    if period == "monthly":
        trend_qs = (
            records.values("session__date")
            .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
            .order_by("session__date")
        )
        trend = [
            {
                "label": str(row["session__date"]),
                "present": row["present_n"], "total": row["total_n"],
                "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
            }
            for row in trend_qs
        ]
    else:
        trend_qs = (
            records.annotate(month=TruncMonth("session__date"))
            .values("month")
            .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
            .order_by("month")
        )
        trend = [
            {
                "label": row["month"].strftime("%Y-%m"),
                "present": row["present_n"], "total": row["total_n"],
                "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
            }
            for row in trend_qs
        ]

    bus_qs = (
        records.values("session__bus_id", "session__bus__bus_number")
        .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
        .order_by("session__bus__bus_number")
    )
    by_bus = [
        {
            "bus_id": row["session__bus_id"], "bus_number": row["session__bus__bus_number"],
            "present": row["present_n"], "total": row["total_n"],
            "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
        }
        for row in bus_qs
    ]

    absentee_qs = (
        records.filter(status="ABSENT")
        .values("student_id", "student__name", "student__roll_number")
        .annotate(absences=Count("id"))
        .order_by("-absences")[:10]
    )
    top_absentees = [
        {
            "student_id": row["student_id"], "name": row["student__name"],
            "roll_number": row["student__roll_number"], "absences": row["absences"],
        }
        for row in absentee_qs
    ]

    return Response({
        "period": period, "year": year, "month": month,
        "overall_pct": overall_pct, "present_count": present,
        "absent_count": absent, "total_count": total,
        "trend": trend, "by_bus": by_bus, "top_absentees": top_absentees,
    })'''

assert content.count(anchor) == 1, f"expected 1, found {content.count(anchor)}"
content = content.replace(anchor, insertion)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("overview endpoint appended")
