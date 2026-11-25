// Varsayılan randevu saatleri (index.html veya üst kısımda tanımlı değilse kullanılır)
const defaultSlots = [
    "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00", "18:00"
];
const slotsList = (typeof allSlots !== "undefined" && Array.isArray(allSlots))
    ? allSlots
    : defaultSlots;

const TRAINER_PASSWORD = (typeof TRAINER_PASS !== "undefined")
    ? TRAINER_PASS
    : "1234";

// DOM Elementleri
const bookingDateInput = document.getElementById("bookingDate") || document.querySelector('input[type="date"]');
const bookingNameInput = document.getElementById("bookingName") || document.getElementById("fullName");
const bookingForm = document.getElementById("memberNameInput");
const timeSlotsContainer = document.getElementById("timeSlots") || document.getElementById("timeSlotsContainer");
const trainerSlotManager = document.getElementById("trainerSlotManager");

const memberStatusCard = document.getElementById("memberStatusCard");
const statusBadge = document.getElementById("statusBadge");
const statusDetails = document.getElementById("statusDetails");
const joinCallBtn = document.getElementById("joinCallBtn");

const notifBadge = document.getElementById("notifBadge");
const emptyRequestMsg = document.getElementById("emptyRequestMsg");
const incomingRequestCard = document.getElementById("incomingRequestCard");
const requestInfo = document.getElementById("requestInfo");
const approveBtn = document.getElementById("approveBtn");
const rejectBtn = document.getElementById("rejectBtn");

const trainerLoginBtn = document.getElementById("trainerLoginBtn");
const trainerPanelBox = document.getElementById("trainerPanelBox");
const bookingGrid = document.getElementById("bookingGrid");

// Görüntülü Görüşme Modal Elementleri
const videoModal = document.getElementById("videoModal");
const closeModalBtn = document.getElementById("closeModalBtn");

let selectedTime = null;
let currentAppointmentId = null;
let isTrainerLoggedIn = false;
let unsubscribeBlocked = null;
let unsubscribeAppointments = null;

// Başlangıç tarihi ayarla
if (bookingDateInput && !bookingDateInput.value) {
    bookingDateInput.valueAsDate = new Date();
}

// 1. Saatleri Veritabanından Canlı Dinle ve Randevu Durumlarını Takip Et
function listenSlotsAndBookings() {
    if (!bookingDateInput) return;
    const selectedDate = bookingDateInput.value;
    selectedTime = null;

    if (typeof unsubscribeBlocked === "function") {
        unsubscribeBlocked();
    }
    if (typeof unsubscribeAppointments === "function") {
        unsubscribeAppointments();
    }

    if (selectedDate && typeof db !== "undefined") {
        unsubscribeBlocked = db.collection("blockedSlots")
            .doc(selectedDate)
            .onSnapshot((doc) => {
                const blocked = doc.exists ? (doc.data().times || []) : [];
                renderSlots(blocked);
            });
    } else {
        renderSlots([]);
    }

    if (typeof db !== "undefined") {
        unsubscribeAppointments = db.collection("appointments")
            .orderBy("createdAt", "desc")
            .limit(1)
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    if (memberStatusCard) {
                        memberStatusCard.classList.add("hidden");
                        memberStatusCard.style.display = "none";
                    }
                    if (notifBadge) notifBadge.classList.add("hidden");
                    if (incomingRequestCard) incomingRequestCard.classList.add("hidden");
                    if (emptyRequestMsg) {
                        emptyRequestMsg.textContent = "Henüz bekleyen randevu talebi yok.";
                        emptyRequestMsg.classList.remove("hidden");
                    }
                    return;
                }

                const doc = snapshot.docs[0];
                const data = doc.data();
                currentAppointmentId = doc.id;

                if (memberStatusCard) {
                    memberStatusCard.classList.remove("hidden");
                    memberStatusCard.style.display = "block";
                }

                if (data.status === "pending") {
                    if (statusBadge) {
                        statusBadge.className = "status-badge pending";
                        statusBadge.textContent = "Onay Bekleniyor";
                    }
                    if (statusDetails) {
                        statusDetails.textContent = `${data.date} tarihinde saat ${data.time} için talebiniz eğitmene iletildi.`;
                    }
                    if (joinCallBtn) joinCallBtn.classList.add("hidden");

                    if (notifBadge) notifBadge.classList.remove("hidden");
                    if (emptyRequestMsg) emptyRequestMsg.classList.add("hidden");
                    if (incomingRequestCard) incomingRequestCard.classList.remove("hidden");
                    if (requestInfo) {
                        requestInfo.innerHTML = `<strong>${data.name || "Üye"}</strong> adlı üye <strong>${data.date}</strong> günü saat <strong>${data.time}</strong> için ön görüşme talep ediyor.`;
                    }
                } else if (data.status === "approved") {
                    if (statusBadge) {
                        statusBadge.className = "status-badge approved";
                        statusBadge.textContent = "Onaylandı";
                    }
                    if (statusDetails) {
                        statusDetails.textContent = `Randevunuz eğitmen tarafından onaylandı! Görüşme saati: ${data.date} - ${data.time}`;
                    }
                    if (joinCallBtn) joinCallBtn.classList.remove("hidden");

                    if (notifBadge) notifBadge.classList.add("hidden");
                    if (incomingRequestCard) incomingRequestCard.classList.add("hidden");
                    if (emptyRequestMsg) {
                        emptyRequestMsg.textContent = "Son randevu onaylandı.";
                        emptyRequestMsg.classList.remove("hidden");
                    }
                } else if (data.status === "rejected") {
                    if (statusBadge) {
                        statusBadge.className = "status-badge rejected";
                        statusBadge.textContent = "Müsait Değil";
                    }
                    if (statusDetails) {
                        statusDetails.textContent = "Seçtiğiniz saat şu an uygun değil. Lütfen farklı bir saat seçin veya WhatsApp üzerinden iletişime geçin.";
                    }
                    if (joinCallBtn) joinCallBtn.classList.add("hidden");

                    if (notifBadge) notifBadge.classList.add("hidden");
                    if (incomingRequestCard) incomingRequestCard.classList.add("hidden");
                    if (emptyRequestMsg) {
                        emptyRequestMsg.textContent = "Randevu talebi reddedildi.";
                        emptyRequestMsg.classList.remove("hidden");
                    }
                }
            });
    }
}

// 2. Saat Butonlarını Ekrana Bas
function renderSlots(blockedTimes = []) {
    if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = "";
    }
    if (trainerSlotManager) {
        trainerSlotManager.innerHTML = "";
    }

    slotsList.forEach((time) => {
        const isBlocked = blockedTimes.includes(time);

        if (timeSlotsContainer) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `slot-btn ${isBlocked ? "disabled" : ""} ${selectedTime === time ? "selected" : ""}`;
            btn.textContent = isBlocked ? `${time} (Dolu)` : time;
            btn.disabled = isBlocked;

            btn.addEventListener("click", () => {
                selectedTime = time;
                renderSlots(blockedTimes);
            });

            timeSlotsContainer.appendChild(btn);
        }

        if (trainerSlotManager) {
            const manageBtn = document.createElement("button");
            manageBtn.type = "button";
            manageBtn.className = `slot-btn ${isBlocked ? "blocked" : ""}`;
            manageBtn.textContent = isBlocked ? `${time} (Kapalı)` : `${time} (Açık)`;
            manageBtn.addEventListener("click", () => toggleSlotBlock(time, blockedTimes));
            trainerSlotManager.appendChild(manageBtn);
        }
    });
}

// Eğitmen panelinden saat açma/kapatma
function toggleSlotBlock(time, currentBlocked) {
    if (!bookingDateInput || typeof db === "undefined") return;
    const dateKey = bookingDateInput.value;
    if (!dateKey) return;

    const updated = currentBlocked.includes(time)
        ? currentBlocked.filter((t) => t !== time)
        : [...currentBlocked, time];

    db.collection("blockedSlots").doc(dateKey).set({ times: updated }, { merge: true });
}

// 3. Randevu Talebi Oluşturma
const createBookingBtn = document.getElementById("createBookingBtn");

if (createBookingBtn) {
    createBookingBtn.addEventListener("click", () => {
        const name = bookingNameInput ? bookingNameInput.value.trim() : "";
        const date = bookingDateInput ? bookingDateInput.value : "";

        if (!name) {
            alert("Lütfen adınızı ve soyadınızı girin.");
            return;
        }
        if (!date) {
            alert("Lütfen bir tarih seçin.");
            return;
        }
        if (!selectedTime) {
            alert("Lütfen müsait saatlerden birini seçin.");
            return;
        }

        db.collection("appointments").add({
            name: name,
            date: date,
            time: selectedTime,
            status: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("Randevu talebiniz alındı, eğitmen onayı bekleniyor.");
        }).catch((err) => {
            console.error("Randevu kaydı hatası:", err);
            alert("Randevu gönderilirken bir hata oluştu.");
        });
    });
}

// 4. Eğitmen Onay / Red İşlemleri
if (approveBtn) {
    approveBtn.addEventListener("click", () => {
        if (!currentAppointmentId) return;
        db.collection("appointments").doc(currentAppointmentId).update({
            status: "approved"
        });
    });
}

if (rejectBtn) {
    rejectBtn.addEventListener("click", () => {
        if (!currentAppointmentId) return;
        db.collection("appointments").doc(currentAppointmentId).update({
            status: "rejected"
        });
    });
}

// 5. Görüntülü Görüşme Modalı
if (joinCallBtn && videoModal) {
    joinCallBtn.addEventListener("click", () => {
        videoModal.classList.remove("hidden");
        videoModal.style.display = "flex";
    });
}

if (closeModalBtn && videoModal) {
    closeModalBtn.addEventListener("click", () => {
        videoModal.classList.add("hidden");
        videoModal.style.display = "none";
    });
}

// 6. Sayfa Yüklendiğinde ve Tarih Değiştiğinde Dinleyicileri Başlat
document.addEventListener("DOMContentLoaded", () => {
    listenSlotsAndBookings();

    if (bookingDateInput) {
        bookingDateInput.addEventListener("change", () => {
            listenSlotsAndBookings();
        });
    }

    if (trainerLoginBtn && trainerPanelBox) {
        trainerLoginBtn.addEventListener("click", () => {
            if (!isTrainerLoggedIn) {
                const enteredPass = prompt("Eğitmen paneli şifresini girin:");
                if (enteredPass === TRAINER_PASSWORD) {
                    isTrainerLoggedIn = true;
                    trainerPanelBox.classList.remove("hidden");
                    if (bookingGrid) bookingGrid.classList.remove("single-view");
                    trainerLoginBtn.textContent = "Eğitmen Çıkışı";
                    trainerLoginBtn.style.borderColor = "#ef4444";
                    trainerLoginBtn.style.color = "#ef4444";

                    const panelEl = document.getElementById("randevu") || trainerPanelBox;
                    if (panelEl) {
                        panelEl.scrollIntoView({ behavior: "smooth" });
                    }
                } else if (enteredPass !== null) {
                    alert("Hatalı şifre! Bu alana yalnızca yetkili eğitmen erişebilir.");
                }
            } else {
                // Çıkış yapıldığında paneli tekrar gizle
                isTrainerLoggedIn = false;
                trainerPanelBox.classList.add("hidden");
                if (bookingGrid) bookingGrid.classList.add("single-view");
                trainerLoginBtn.textContent = "Eğitmen Girişi";
                trainerLoginBtn.style.borderColor = "";
                trainerLoginBtn.style.color = "";
            }
        });
    }
});