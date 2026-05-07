
function checkOverlap(newSlot, slots) {
    const hasOverlap = slots.some(slot => {
        // Overlap condition: S1 < E2 and S2 < E1
        const overlap = newSlot.startTime < slot.endTime && slot.startTime < newSlot.endTime;
        console.log(`Checking ${newSlot.startTime}-${newSlot.endTime} against ${slot.startTime}-${slot.endTime}: ${overlap}`);
        return overlap;
    });
    return hasOverlap;
}

const slots = [
    { startTime: "13:00", endTime: "14:00" }
];

const newSlot = { startTime: "13:00", endTime: "15:00" };

console.log("Result:", checkOverlap(newSlot, slots));

const slots12 = [
    { startTime: "01:00 PM", endTime: "02:00 PM" }
];
const newSlot12 = { startTime: "01:00 PM", endTime: "03:00 PM" };
console.log("Result 12h:", checkOverlap(newSlot12, slots12));

const slotsMixed = [
    { startTime: "01:00 PM", endTime: "02:00 PM" }
];
const newSlotMixed = { startTime: "13:00", endTime: "15:00" };
console.log("Result Mixed:", checkOverlap(newSlotMixed, slotsMixed));
