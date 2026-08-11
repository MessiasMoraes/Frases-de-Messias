import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function init() {
    const docRef = doc(db, "estatisticas", "global");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        console.log("Criando documento de estatísticas globais...");
        await setDoc(docRef, { visitas: 0 });
        console.log("Documento criado com sucesso!");
    } else {
        console.log("Documento de estatísticas já existe.");
    }
}

init();
