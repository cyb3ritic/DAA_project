class Resource {
    constructor(name) {
        this.name = name;
        this.availability = [];
    }

    isAvailable(startTime, endTime) {
        if (this.availability.length === 0) return true;
        return !this.availability.some(slot => startTime < slot.endTime && endTime > slot.startTime);
    }

    findNextAvailableSlot(startTime, duration) {
        if (this.availability.length === 0) return startTime;

        const sortedSlots = [...this.availability].sort((a, b) => a.startTime - b.startTime);
        
        // Check if we can schedule before the first slot
        if (startTime + duration <= sortedSlots[0].startTime) {
            return startTime;
        }

        // Look for gaps between slots
        for (let i = 0; i < sortedSlots.length - 1; i++) {
            const gapStart = sortedSlots[i].endTime;
            const gapEnd = sortedSlots[i + 1].startTime;
            if (gapEnd - gapStart >= duration) {
                return Math.max(startTime, gapStart);
            }
        }

        // Schedule after the last slot if no gaps found
        return Math.max(startTime, sortedSlots[sortedSlots.length - 1].endTime);
    }

    book(startTime, endTime) {
        this.availability.push({ startTime, endTime });
        this.availability.sort((a, b) => a.startTime - b.startTime);
    }
}

class HospitalScheduler {
    constructor(doctors, rooms) {
        this.doctors = doctors.map(name => new Resource(name));
        this.rooms = rooms.map(name => new Resource(name));
        this.schedule = [];
        this.idleTime = { doctors: {}, rooms: {} };
        this.iterations = [];
    }

    initializeIdleTracking(resources, type) {
        resources.forEach(resource => {
            this.idleTime[type][resource.name] = 0;
        });
    }

    updateIdleTime(resource, type) {
        const slots = resource.availability;
        if (slots.length === 0) return;

        let totalIdle = 0;
        for (let i = 1; i < slots.length; i++) {
            totalIdle += Math.max(0, slots[i].startTime - slots[i-1].endTime);
        }
        this.idleTime[type][resource.name] = totalIdle;
    }

    adjustPriorities(patients, currentTime) {
        patients.forEach(patient => {
            const waitingTime = currentTime - patient.arrivalTime;
            if (waitingTime > 3 && patient.priority < 3) {
                patient.priority = Math.min(patient.priority + Math.floor(waitingTime / 3), 3);
            }
        });
    }

    findBestResourceCombination(patient, currentTime) {
        let bestStartTime = Infinity;
        let bestDoctor = null;
        let bestRoom = null;

        for (const doctor of this.doctors) {
            for (const room of this.rooms) {
                const doctorStart = doctor.findNextAvailableSlot(
                    Math.max(currentTime, patient.arrivalTime),
                    patient.duration
                );
                const roomStart = room.findNextAvailableSlot(
                    Math.max(currentTime, patient.arrivalTime),
                    patient.duration
                );
                const startTime = Math.max(doctorStart, roomStart);

                if (startTime < bestStartTime) {
                    bestStartTime = startTime;
                    bestDoctor = doctor;
                    bestRoom = room;
                }
            }
        }

        return { doctor: bestDoctor, room: bestRoom, startTime: bestStartTime };
    }

    allocateResources(patients) {
        this.initializeIdleTracking(this.doctors, "doctors");
        this.initializeIdleTracking(this.rooms, "rooms");

        let currentTime = Math.min(...patients.map(p => p.arrivalTime));
        let unscheduledPatients = [...patients];
        console.log("hello there");

        while (unscheduledPatients.length > 0) {
            // Adjust priorities dynamically
            this.adjustPriorities(unscheduledPatients, currentTime);

            // Sort patients by priority first, then arrival time
            unscheduledPatients.sort((a, b) => {
                if (a.priority !== b.priority) return b.priority - a.priority;
                return a.arrivalTime - b.arrivalTime;
            });

            // Try to schedule each patient
            const scheduledIndices = [];
            
            for (let i = 0; i < unscheduledPatients.length; i++) {
                const patient = unscheduledPatients[i];
                
                // Only try to schedule if patient has arrived
                if (patient.arrivalTime <= currentTime) {
                    const { doctor, room, startTime } = this.findBestResourceCombination(patient, currentTime);
                    
                    if (doctor && room) {
                        const endTime = startTime + patient.duration;
                        
                        // Book resources
                        doctor.book(startTime, endTime);
                        room.book(startTime, endTime);

                        // Add to schedule
                        this.schedule.push({
                            patient: patient.name,
                            doctor: doctor.name,
                            room: room.name,
                            startTime,
                            endTime,
                            priority: patient.priority,
                            arrivalTime: patient.arrivalTime,
                            waitingTime: startTime - patient.arrivalTime
                        });

                        // Update idle time
                        this.updateIdleTime(doctor, "doctors");
                        this.updateIdleTime(room, "rooms");

                        scheduledIndices.push(i);
                    }
                }
            }

            // Remove scheduled patients from unscheduled list (in reverse order)
            for (let i = scheduledIndices.length - 1; i >= 0; i--) {
                unscheduledPatients.splice(scheduledIndices[i], 1);
            }

            // If no patients were scheduled in this iteration, move time forward
            if (scheduledIndices.length === 0) {
                currentTime++;
            } else {
                // Move time to the earliest next potential slot
                const nextTime = Math.min(
                    ...this.doctors.map(d => d.findNextAvailableSlot(currentTime, 1)),
                    ...this.rooms.map(r => r.findNextAvailableSlot(currentTime, 1))
                );
                currentTime = Math.max(currentTime + 1, nextTime);
            }
        }

        return this.schedule;
    }

    generateReport() {
        const totalPatients = this.schedule.length;
        const doctorUtilization = this.calculateUtilization(this.doctors, "doctors");
        const roomUtilization = this.calculateUtilization(this.rooms, "rooms");
        const averageWaitingTime = this.calculateAverageWaitingTime();

        return {
            totalPatients,
            doctorUtilization,
            roomUtilization,
            averageWaitingTime,
            scheduledAppointments: this.schedule
        };
    }

    calculateUtilization(resources, type) {
        let totalBusyTime = 0;
        let maxEndTime = 0;

        resources.forEach(resource => {
            resource.availability.forEach(slot => {
                totalBusyTime += (slot.endTime - slot.startTime);
                maxEndTime = Math.max(maxEndTime, slot.endTime);
            });
        });

        const totalPossibleTime = resources.length * (maxEndTime || 24);
        return (totalBusyTime / totalPossibleTime) * 100;
    }

    calculateAverageWaitingTime() {
        if (this.schedule.length === 0) return 0;
        const waitingTimes = this.schedule.map(entry => entry.waitingTime);
        return waitingTimes.reduce((acc, time) => acc + time, 0) / waitingTimes.length;
    }
}

module.exports = HospitalScheduler;