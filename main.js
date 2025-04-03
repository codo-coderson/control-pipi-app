console.log("🟢 main.js cargado correctamente");

// ✅ CONFIG DE FIREBASE (real, ya copiada)
const firebaseConfig = {
  apiKey: "AIzaSyCsWVffr6yvIZel2Wzhy1v9ZtvKPiMqiFQ",
  authDomain: "controlpipiapp.firebaseapp.com",
  projectId: "controlpipiapp",
  storageBucket: "controlpipiapp.firebasestorage.app",
  messagingSenderId: "1059568174856",
  appId: "1:1059568174856:web:cf9d54881bb07961d60ebd"
};

// ✅ IMPORTS DESDE CDN (no usar npm, porque no estás con Vite todavía)
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ✅ INICIALIZAR FIREBASE
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px;"></div>
`);

const app = document.getElementById("app");

const clases = [
  ["1ºA", "1ºB"],
  ["2ºA", "2ºB"],
  ["3ºA", "3ºB"],
  ["4ºA", "4ºB"],
  ["5ºA", "5ºB"]
];

const alumnosPorClase = {
  "1ºA": ["Pérez Gómez, Laura", "Martínez Ruiz, Pedro"],
  "1ºB": ["García López, Marta", "Sánchez Rivera, Iván"],
  "2ºA": ["Jiménez Bravo, Carla", "Moreno Díaz, Luis"],
  "2ºB": ["Ramos Ortega, Ana", "Ruiz Fernández, Hugo"],
  "3ºA": ["López Martín, Noa", "González Torres, Álvaro"],
  "3ºB": ["Castillo Vega, Lucía", "Delgado Ramírez, Daniel"],
  "4ºA": ["Molina Serrano, Paula", "Vicente Romero, Jorge"],
  "4ºB": ["Navarro Blanco, Emma", "Reyes León, Marcos"],
  "5ºA": ["Santos Marín, Sofía", "Ibáñez Campos, Tomás"],
  "5ºB": ["Paredes Cruz, Inés", "Durán Cabrera, Samuel"]
};

let usuarioActual = "UsuarioDemo";

function mostrarMenuPrincipal() {
  app.innerHTML = `<h2>Selecciona un curso</h2><div style="display: flex; flex-wrap: wrap; gap: 1rem;">${clases.map(pareja =>
    `<div style="display:flex; flex-direction:column; gap: 0.5rem;">
      ${pareja.map(clase =>
        `<button class="clase-btn" data-clase="${clase}">🧑‍🏫 ${clase}</button>`
      ).join("")}
    </div>`
  ).join("")}</div>`;

  document.querySelectorAll(".clase-btn").forEach(btn => {
    btn.onclick = () => mostrarVistaClase(btn.dataset.clase);
  });
}
window.mostrarMenuPrincipal = mostrarMenuPrincipal;

function alumnoCardHTML(clase, nombre, horasActivas = []) {
  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    const activa = horasActivas.includes(hora);
    return `<button class="hour-button ${activa ? "active" : ""}" data-alumno="${alumnoId}" data-hora="${hora}">${hora}</button>`;
  }).join(" ");

  return `
    <div style="border:1px solid #ccc; padding:1rem; border-radius:8px;">
      <div style="font-weight:bold; margin-bottom:0.5rem;">${nombre}</div>
      <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">${botones}</div>
    </div>
  `;
}

function aplicarEstilosBoton(btn) {
  if (btn.classList.contains("active")) {
    btn.style.backgroundColor = "#0044cc";
    btn.style.color = "#ff0";
    btn.style.border = "1px solid #003399";
  } else {
    btn.style.backgroundColor = "#eee";
    btn.style.color = "#000";
    btn.style.border = "1px solid #ccc";
  }
}

function getFechaHoy() {
  return new Date().toISOString().split("T")[0];
}

async function mostrarVistaClase(clase) {
  const alumnos = alumnosPorClase[clase] || [];
  const fecha = getFechaHoy();
  app.innerHTML = `<h2>👨‍🏫 Clase ${clase}</h2>`;

  for (const nombre of alumnos) {
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, clase, alumnoId);
    let docSnap = await getDoc(ref);

    if (!docSnap.exists()) {
      await setDoc(ref, {
        nombre,
        historial: []
      });
      docSnap = await getDoc(ref);
    }

    const data = docSnap.data();
    const hoy = data.historial?.find(d => d.fecha === fecha);
    const horasActivas = hoy ? hoy.horas : [];

    const tarjeta = document.createElement("div");
    tarjeta.innerHTML = alumnoCardHTML(clase, nombre, horasActivas);
    app.appendChild(tarjeta);

    tarjeta.querySelectorAll(".hour-button").forEach(btn => {
      aplicarEstilosBoton(btn);
      btn.onclick = async () => {
        btn.classList.toggle("active");
        aplicarEstilosBoton(btn);

        const nuevasHoras = Array.from(tarjeta.querySelectorAll(".hour-button"))
          .filter(b => b.classList.contains("active"))
          .map(b => parseInt(b.dataset.hora));

        const nuevoHistorial = (data.historial || []).filter(d => d.fecha !== fecha);
        nuevoHistorial.push({
          fecha,
          horas: nuevasHoras,
          usuario: usuarioActual
        });

        await updateDoc(ref, { historial: nuevoHistorial });

        console.log(`✅ Guardado: ${nombre}, clase ${clase}, horas: [${nuevasHoras.join(", ")}], por ${usuarioActual}`);
      };
    });
  }

  app.innerHTML += `<button onclick="mostrarMenuPrincipal()" style="margin-top:2rem;">🔙 Volver</button>`;
}

// INICIO
mostrarMenuPrincipal();
