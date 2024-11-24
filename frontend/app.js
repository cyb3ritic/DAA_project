const patientForm = document.getElementById("patientForm");
const patientsList = document.getElementById("patientsList");
const scheduleTable = document.querySelector("#scheduleTable tbody");
const reportOutput = document.getElementById("reportOutput");

let patients = [];

// Add patient to the list
patientForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const arrivalTime = parseInt(document.getElementById("arrivalTime").value);
    const duration = parseInt(document.getElementById("duration").value);
    const priority = parseInt(document.getElementById("priority").value);

    const patient = { name, arrivalTime, startTime: arrivalTime, endTime: arrivalTime + duration, duration, priority };
    patients.push(patient);

    renderPatients();
    patientForm.reset();
});

// Render patients in the list
function renderPatients() {
    patientsList.innerHTML = patients
        .map(patient => `<li>${patient.name} - Arrival: ${patient.arrivalTime}, Duration: ${patient.duration}, Priority: ${patient.priority}</li>`)
        .join("");
}

// Send patients to the backend and generate the schedule
async function schedulePatients() {
    try {
        console.log("Sending patients to backend:", patients);
        const response = await fetch("http://localhost:3000/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patients,
                doctors: ["Dr. Smith", "Dr. Brown"],
                rooms: ["Room 101", "Room 102"],
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received schedule from backend:", data);
        renderSchedule(data.schedule);
        renderReport(data.report);
    } catch (error) {
        console.error("Error generating schedule:", error);
        alert("Failed to generate schedule. Check console for details.");
    }
}

// Render the schedule in the table
function renderSchedule(schedule) {
    scheduleTable.innerHTML = schedule
        .map(
            entry =>
                `<tr>
                    <td>${entry.patient}</td>
                    <td>${entry.doctor}</td>
                    <td>${entry.room}</td>
                    <td>${entry.startTime}</td>
                    <td>${entry.endTime}</td>
                    <td>${entry.priority}</td>
                </tr>`
        )
        .join("");
}

// Render the report details
function renderReport(report) {
    reportOutput.textContent = JSON.stringify(report, null, 2);
}

// Attach "Generate Schedule" button
const scheduleButton = document.createElement("button");
scheduleButton.textContent = "Generate Schedule";
scheduleButton.addEventListener("click", schedulePatients);
document.body.appendChild(scheduleButton);
