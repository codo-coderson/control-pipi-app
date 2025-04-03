console.log("🟢 main.js cargado correctamente");

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsWVffr6yvIZel2Wzhy1v9ZtvKPiMqiFQ",
  authDomain: "controlpipiapp.firebaseapp.com",
  projectId: "controlpipiapp",
  storageBucket: "controlpipiapp.firebasestorage.app",
  messagingSenderId: "1059568174856",
  appId: "1:1059568174856:web:cf9d54881bb07961d60ebd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px;"></div>
`);

const app = document.getElementById("app");

// ==============================
// DATOS SIMULADOS
// ==============================
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

// ==============================
// PANTALLAS
// ==============================
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

function mostrarVistaClase(clase) {
  const alumnos = alumnosPorClase[clase] || [];

  app.innerHTML = `
    <h2>👨‍🏫 Clase ${clase}</h2>
    <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
      ${alumnos.map(nombre => alumnoCardHTML(clase, nombre)).join("")}
    </div>
    <button onclick="mostrarMenuPrincipal()" style="margin-top:2rem;">🔙 Volver</button>
  `;

  document.querySelectorAll(".hour-button").forEach(btn => {
    btn.onclick = () => {
      btn.classList.toggle("active");
      aplicarEstilosBoton(btn);
      const alumno = btn.dataset.alumno;
      const hora = btn.dataset.hora;
      console.log(`⏰ ${usuarioActual} marcó la hora ${hora} para ${alumno} en ${clase}`);
    };
    aplicarEstilosBoton(btn);
  });
}

function alumnoCardHTML(clase, nombre) {
  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    return `<button class="hour-button" data-alumno="${alumnoId}" data-hora="${hora}">${hora}</button>`;
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

// ==============================
// INICIO
// ==============================
mostrarMenuPrincipal();
