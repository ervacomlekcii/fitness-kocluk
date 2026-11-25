// Firebase Yapılandırması (Senin Projen)
const firebaseConfig = {
    apiKey: "AIzaSyBQ1INh0k_HwRgbaeShfzYCnWEYoOZQraU",
    authDomain: "fitees-randevu.firebaseapp.com",
    projectId: "fitees-randevu",
    storageBucket: "fitees-randevu.firebasestorage.app",
    messagingSenderId: "585183080466",
    appId: "1:585183080466:web:3f9400efdd524209f728cb"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Saat Listesi
const allSlots = ["09:00", "10:30", "13:00", "15:00", "17:30"];
let selectedTime = null;
let currentAppointmentId = null;

// HTML Elementleri
const timeSlotsContainer = document.getElementById('timeSlotsContainer');
const trainerSlotManager = document.getElementById('trainerSlotManager');
const bookingDateInput = document.getElementById('bookingDateInput');
const memberNameInput = document.getElementById('memberNameInput');
const createBookingBtn = document.getElementById('createBookingBtn');

// Durum & Bildirim Elementleri
const memberStatusCard = document.getElementById('memberStatusCard');
const statusBadge = document.getElementById('statusBadge');
const statusDetails = document.getElementById('statusDetails');
const joinCallBtn = document.getElementById('joinCallBtn');

const notifBadge = document.getElementById('notifBadge');
const emptyRequestMsg = document.getElementById('emptyRequestMsg');
const incomingRequestCard = document.getElementById('incomingRequestCard');
const requestInfo = document.getElementById('requestInfo');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');

// Görüntülü Görüşme Modal Elementleri
const videoModal = document.getElementById('videoModal');
const closeModalBtn = document.getElementById('closeModalBtn');

bookingDateInput.valueAsDate = new Date();

// 1. Saatleri Veritabanından Canlı Dinle ve Çiz
function listenSlotsAndBookings() {
    const selectedDate = bookingDateInput.value;

    db.collection("blockedSlots").doc(selectedDate).onSnapshot((doc) => {
        const blocked = doc.exists ? (doc.data().times || []) : [];
        renderSlots(blocked);
    });

    db.collection("appointments")
      .orderBy("createdAt", "desc")
      .limit(1)
      .onSnapshot((snapshot) => {
          if (snapshot.empty)
            memberStatusCard.classList.add('hidden');
            memberStatusCard.style.display = 'none';
            return;
}
          const doc = snapshot.docs[0];
          const data = doc.data();
          currentAppointmentId = doc.id;

          memberStatusCard.classList.remove('hidden');
          memberStatusCard.style.display = 'block';


          memberStatusCard.classList.remove('hidden');
          if (data.status === 'pending') {
              statusBadge.className = 'status-badge pending';
              statusBadge.textContent = 'Onay Bekleniyor';
              statusDetails.textContent = `${data.date} tarihinde saat ${data.time} için talebiniz eğitmene iletildi.`;
              joinCallBtn.classList.add('hidden');

              notifBadge.classList.remove('hidden');
              emptyRequestMsg.classList.add('hidden');
              incomingRequestCard.classList.remove('hidden');
              requestInfo.innerHTML = `<strong>${data.name}</strong> adlı üye <strong>${data.date}</strong> günü saat <strong>${data.time}</strong> için ön görüşme talep ediyor.`;
          } else if (data.status === 'approved') {
              statusBadge.className = 'status-badge approved';
              statusBadge.textContent = 'Onaylandı ✓';
              statusDetails.textContent = `Randevunuz eğitmen tarafından onaylandı! Görüşme saati: ${data.date} - ${data.time}`;
              joinCallBtn.classList.remove('hidden');

              notifBadge.classList.add('hidden');
              incomingRequestCard.classList.add('hidden');
              emptyRequestMsg.textContent = 'Son randevu onaylandı.';
              emptyRequestMsg.classList.remove('hidden');
          } else if (data.status === 'rejected') {
              statusBadge.className = 'status-badge rejected';
              statusBadge.textContent = 'Müsait Değil ✕';
              statusDetails.textContent = 'Seçtiğiniz saat şu an uygun değil. Lütfen farklı bir saat seçin veya WhatsApp üzerinden ulaşın.';
              joinCallBtn.classList.add('hidden');

              notifBadge.classList.add('hidden');
              incomingRequestCard.classList.add('hidden');
              emptyRequestMsg.textContent = 'Randevu talebi reddedildi.';
              emptyRequestMsg.classList.remove('hidden');
          }
      });
}

function renderSlots(blockedTimes = []) {
    timeSlotsContainer.innerHTML = '';
    if (trainerSlotManager) trainerSlotManager.innerHTML = '';

    allSlots.forEach(time => {
        const isBlocked = blockedTimes.includes(time);

        const btn = document.createElement('button');
        btn.className = `slot-btn ${isBlocked ? 'disabled' : ''} ${selectedTime === time ? 'selected' : ''}`;
        btn.textContent = isBlocked ? `${time} (Dolu)` : time;
        btn.disabled = isBlocked;
        btn.onclick = () => {
            selectedTime = time;
            renderSlots(blockedTimes);
        };
        timeSlotsContainer.appendChild(btn);

        if (trainerSlotManager) {
            const tBtn = document.createElement('button');
            tBtn.className = `slot-btn ${isBlocked ? 'disabled' : 'selected'}`;
            tBtn.textContent = isBlocked ? `${time} (Kapalı)` : `${time} (Açık)`;
            tBtn.onclick = () => {
                const selectedDate = bookingDateInput.value;
                const updated = isBlocked
                    ? blockedTimes.filter(t => t !== time)
                    : [...blockedTimes, time];
                db.collection("blockedSlots").doc(selectedDate).set({ times: updated });
            };
            trainerSlotManager.appendChild(tBtn);
        }
    });
}

bookingDateInput.addEventListener('change', () => {
    selectedTime = null;
    listenSlotsAndBookings();
});

createBookingBtn.onclick = () => {
    const kvkkCheck = document.getElementById('kvkkCheck');
const paymentPrivacyCheck = document.getElementById('paymentPrivacyCheck');

if (!kvkkCheck.checked || !paymentPrivacyCheck.checked) {
    alert('Devam etmek için lütfen Gizlilik, KVKK ve Kart Güvenliği koşullarını okuyup onaylayın.');
    return;
}
    const name = memberNameInput.value.trim();
    const date = bookingDateInput.value;

    if (!name || !date || !selectedTime) {
        alert('Lütfen adınızı girin, tarih ve saat seçin.');
        return;
    }

    db.collection("appointments").add({
        name: name,
        date: date,
        time: selectedTime,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};

approveBtn.onclick = () => {
    if (!currentAppointmentId) return;
    db.collection("appointments").doc(currentAppointmentId).update({
        status: 'approved'
    });
};

rejectBtn.onclick = () => {
    if (!currentAppointmentId) return;
    db.collection("appointments").doc(currentAppointmentId).update({
        status: 'rejected'
    });
};

// Gerçek Jitsi Meet Görüntülü Görüşme
let jitsiApi = null;

joinCallBtn.onclick = () => {
    videoModal.classList.remove('hidden');
    const container = document.getElementById('jitsiContainer');
    container.innerHTML = '';

    const memberName = memberNameInput.value.trim() || 'Danışan';
    const date = bookingDateInput.value || 'Bugun';
    const time = selectedTime ? selectedTime.replace(':', '') : 'Gorusme';
    const roomName = `OnlineFitnessKocluk_${date}_${time}`;

    jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: container,
        userInfo: { displayName: memberName },
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false
        }
    });
};

closeModalBtn.onclick = () => {
    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }
    videoModal.classList.add('hidden');
};

listenSlotsAndBookings();

// =========================================
// EĞİTMEN GİRİŞİ VE KİLİT MEKANİZMASI
// =========================================
// Koşullar Modal Kontrolleri
const legalModal = document.getElementById('legalModal');
const openLegalModalBtn = document.getElementById('openLegalModalBtn');
const closeLegalModalBtn = document.getElementById('closeLegalModalBtn');
const acceptLegalBtn = document.getElementById('acceptLegalBtn');

if (openLegalModalBtn) {
    openLegalModalBtn.onclick = (e) => {
        e.preventDefault();
        legalModal.classList.remove('hidden');
    };
}
if (closeLegalModalBtn) {
    closeLegalModalBtn.onclick = () => legalModal.classList.add('hidden');
}
if (acceptLegalBtn) {
    acceptLegalBtn.onclick = () => {
        document.getElementById('kvkkCheck').checked = true;
        document.getElementById('paymentPrivacyCheck').checked = true;
        legalModal.classList.add('hidden');
    };
}

// Eğitmen İçin Site İçi Canlı Görüşme Başlatma
const trainerJoinCallBtn = document.getElementById('trainerJoinCallBtn');
if (trainerJoinCallBtn) {
    db.collection("appointments").orderBy("createdAt", "desc").limit(1).onSnapshot((snap) => {
        if (!snap.empty && snap.docs[0].data().status === 'approved') {
            const d = snap.docs[0].data();
            trainerJoinCallBtn.classList.remove('hidden');
            trainerJoinCallBtn.onclick = () => {
                videoModal.classList.remove('hidden');
                const container = document.getElementById('jitsiContainer');
                container.innerHTML = '';
                const roomName = `OnlineFitnessKocluk_${d.date}_${d.time.replace(':', '')}`;
                jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
                    roomName: roomName,
                    width: '100%',
                    height: '100%',
                    parentNode: container,
                    userInfo: { displayName: 'Eğitmen' },
                    configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false, prejoinPageEnabled: false }
                });
            };
        } else {
            trainerJoinCallBtn.classList.add('hidden');
        }
    });
}
document.addEventListener("DOMContentLoaded", () => {
  const trainerLoginBtn = document.getElementById("trainerLoginBtn");
  const trainerPanelBox = document.getElementById("trainerPanelBox");
  const bookingGrid = document.querySelector(".booking-grid");

  // Başlangıçta eğitmen panelini gizle ve üye ekranını ortala
  if (trainerPanelBox && bookingGrid) {
    trainerPanelBox.classList.add("hidden");
    bookingGrid.classList.add("single-view");
  }

  let isTrainerLoggedIn = false;
  const TRAINER_PASS = "1234"; // Arkadaşının kullanacağı giriş şifresi

  if (trainerLoginBtn && trainerPanelBox && bookingGrid) {
    trainerLoginBtn.addEventListener("click", () => {
      if (!isTrainerLoggedIn) {
        const enteredPass = prompt("Eğitmen Kontrol Paneli Şifresini Girin:");
        if (enteredPass === TRAINER_PASS) {
          isTrainerLoggedIn = true;
          trainerPanelBox.classList.remove("hidden");
          bookingGrid.classList.remove("single-view");
          trainerLoginBtn.textContent = "Eğitmen Çıkışı";
          trainerLoginBtn.style.borderColor = "#ef4444";
          trainerLoginBtn.style.color = "#ef4444";
          // Sayfayı panelin olduğu bölüme kaydır
          document.getElementById("randevu").scrollIntoView({ behavior: "smooth" });
        } else if (enteredPass !== null) {
          alert("Hatalı şifre! Bu alana yalnızca yetkili eğitmen erişebilir.");
        }
      } else {
        // Çıkış yapıldığında paneli tekrar gizle
        isTrainerLoggedIn = false;
        trainerPanelBox.classList.add("hidden");
        bookingGrid.classList.add("single-view");
        trainerLoginBtn.textContent = "Eğitmen Girişi";
        trainerLoginBtn.style.borderColor = "";
        trainerLoginBtn.style.color = "";
      }
    });
  }
});