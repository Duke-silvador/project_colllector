const bookButton = document.getElementById("bookButton");
const bookingForm = document.getElementById("bookingForm");

bookButton.addEventListener("click", function () {
  bookingForm.style.display = "block";
});
const submitBooking = document.getElementById("submitBooking");
let bookings = [
  {
    date: "2026-10-06",
    start: "14:00",
    end: "16:00",
    band: "The Echoes"
  },
  {
    date: "2026-10-06",
    start: "17:00",
    end: "19:00",
    band: "Night Shift"
  }
];

submitBooking.addEventListener("click", function () {

  const name = document.getElementById("nameInput").value;
  const band = document.getElementById("bandInput").value;
  const date = document.getElementById("dateInput").value;
  const start = document.getElementById("startInput").value;
  const end = document.getElementById("endInput").value;
  if (name === "" || band === "" || date === "" || start === "" || end === "") {
     alert("Please fill in all fields.");
     return;
  }
  if (end <= start) {
  alert("End time must be later than start time.");
  return;
}
for (let booking of bookings) {

  if (
    date === booking.date &&
    start < booking.end &&
    end > booking.start
  ) {
    alert("This time slot is already booked by " + booking.band + ".");
    return;
  }

}

  

  const newBooking = document.createElement("div");

  newBooking.className = "booking-card";

  newBooking.innerHTML = `
    <h3>${band}</h3>
    <p>${date} · ${start} - ${end}</p>
    <p>Booked by ${name}</p>
  `;

  document.getElementById("schedule").appendChild(newBooking);

  bookings.push({
  date: date,
  start: start,
  end: end,
  band: band
});

alert("Booking successful!");

document.getElementById("nameInput").value = "";
document.getElementById("bandInput").value = "";
document.getElementById("dateInput").value = "";
document.getElementById("startInput").value = "";
document.getElementById("endInput").value = "";  
bookingForm.style.display = "none";
});