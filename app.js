import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import {
  getFirestore, collection, addDoc, query, orderBy,
  onSnapshot, doc, updateDoc, deleteDoc, getDoc,
  serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// 🔥 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAX6o6USqqHI62II-byRFAHrOqUsuGzGCE",
  authDomain: "moonrise-7b507.firebaseapp.com",
  projectId: "moonrise-7b507",
  storageBucket: "moonrise-7b507.firebasestorage.app",
  messagingSenderId: "504732560591",
  appId: "1:504732560591:web:84e28b4b1a4849a0b19bba"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔐 LOGIN
await signInAnonymously(auth);

// VARIABLES
let currentRoom = "";
let username = "";
let selectedMsgId = "";

// ELEMENTS
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// 🔔 Notifications
if ("Notification" in window) {
  Notification.requestPermission();
}

// 🟢 JOIN ROOM
window.joinRoom = async () => {
  username = document.getElementById("usernameInput").value;
  currentRoom = document.getElementById("roomInput").value;

  if (!username || !currentRoom) return alert("Fill all fields");

  await setDoc(doc(db, "users", auth.currentUser.uid), {
    username,
    online: true
  }, { merge: true });

  listenMessages();
};

// 📩 SEND MESSAGE
sendBtn.onclick = async () => {
  if (!messageInput.value || !currentRoom) return;

  await addDoc(collection(db, "rooms", currentRoom, "messages"), {
    text: messageInput.value,
    sender: auth.currentUser.uid,
    username,
    reactions: {},
    seenBy: [auth.currentUser.uid],
    timestamp: serverTimestamp()
  });

  messageInput.value = "";
};

// 📡 LISTEN MESSAGES
function listenMessages() {
  const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("timestamp"));

  onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";

    // 🔔 Notifications
    snapshot.docChanges().forEach(change => {
      if (change.type === "added") {
        const msg = change.doc.data();

        if (msg.sender !== auth.currentUser.uid) {
          if (Notification.permission === "granted") {
            new Notification(msg.username, { body: msg.text });
          }
        }
      }
    });

    snapshot.forEach(async (docSnap) => {
      const msg = docSnap.data();
      const msgId = docSnap.id;

      // ✔ Seen ticks
      if (!msg.seenBy.includes(auth.currentUser.uid)) {
        msg.seenBy.push(auth.currentUser.uid);

        await updateDoc(doc(db, "rooms", currentRoom, "messages", msgId), {
          seenBy: msg.seenBy
        });
      }

      const div = document.createElement("div");
      div.className = "message";

      if (msg.sender === auth.currentUser.uid) div.classList.add("mine");

      let seen = msg.seenBy.length > 1 ? "✔✔" : "✔";

      div.innerHTML = `<b>${msg.username}</b>: ${msg.text} <span>${seen}</span>`;

      // 😀 Reactions
      if (msg.reactions) {
        const r = document.createElement("div");
        for (const e in msg.reactions) {
          r.innerHTML += `${e} ${msg.reactions[e].length} `;
        }
        div.appendChild(r);
      }

      // Right click menu
      div.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selectedMsgId = msgId;
        document.getElementById("menu").style.display = "block";
      });

      messagesContainer.appendChild(div);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// ✏️ EDIT
document.getElementById("editMsg").onclick = async () => {
  const newText = prompt("Edit message:");
  if (!newText) return;

  await updateDoc(doc(db, "rooms", currentRoom, "messages", selectedMsgId), {
    text: newText
  });
};

// 🗑 DELETE
document.getElementById("deleteMsg").onclick = async () => {
  await deleteDoc(doc(db, "rooms", currentRoom, "messages", selectedMsgId));
};

// 😀 REACT
document.getElementById("reactMsg").onclick = async () => {
  const emoji = prompt("Emoji:");
  if (!emoji) return;

  const ref = doc(db, "rooms", currentRoom, "messages", selectedMsgId);
  const snap = await getDoc(ref);
  const data = snap.data();

  let reactions = data.reactions || {};

  if (!reactions[emoji]) reactions[emoji] = [];

  if (!reactions[emoji].includes(auth.currentUser.uid)) {
    reactions[emoji].push(auth.currentUser.uid);
  }

  await updateDoc(ref, { reactions });
};

// 🔚 OFFLINE STATUS
window.addEventListener("beforeunload", async () => {
  await setDoc(doc(db, "users", auth.currentUser.uid), {
    online: false
  }, { merge: true });
});


