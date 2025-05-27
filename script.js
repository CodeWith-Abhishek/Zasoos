// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB3VFVDIyV0aCnXKM3KaNwv1SYZQLeBLcI",
  authDomain: "zasoos.firebaseapp.com",
  projectId: "zasoos",
  storageBucket: "zasoos.firebasestorage.app",
  messagingSenderId: "550620142842",
  appId: "1:550620142842:web:66229a4f7e7cf4585efd43",
  measurementId: "G-DX1L96HFJV"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});
let localStream = null;
const callDoc = db.collection('calls').doc('zasoos-call');
const offerCandidates = callDoc.collection('offerCandidates');
const answerCandidates = callDoc.collection('answerCandidates');

// CLIENT
async function startClient() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  const offerDesc = await pc.createOffer();
  await pc.setLocalDescription(offerDesc);

  const offer = {
    sdp: offerDesc.sdp,
    type: offerDesc.type,
  };
  await callDoc.set({ offer });

  pc.onicecandidate = e => {
    if (e.candidate) {
      offerCandidates.add(e.candidate.toJSON());
    }
  };

  callDoc.onSnapshot(snapshot => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDesc = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDesc);
    }
  });

  answerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };
}

// ADMIN
async function startAdmin() {
  const callData = (await callDoc.get()).data();
  const offerDesc = new RTCSessionDescription(callData.offer);
  await pc.setRemoteDescription(offerDesc);

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  const answerDesc = await pc.createAnswer();
  await pc.setLocalDescription(answerDesc);

  const answer = {
    type: answerDesc.type,
    sdp: answerDesc.sdp,
  };
  await callDoc.update({ answer });

  pc.onicecandidate = e => {
    if (e.candidate) {
      answerCandidates.add(e.candidate.toJSON());
    }
  };

  offerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };
}
