// main.js

console.log("🟢 main.js cargado correctamente");

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
  // Añadir más si lo necesitas
};

let usuarioActual = "UsuarioDemo"; // Simulación. Más adelante: Firebase Auth

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
      const alumno = btn.dataset.alumno;
      const hora = btn.dataset.hora;
      console.log(`⏰ ${usuarioActual} marcó la hora ${hora} para ${alumno} en ${clase}`);
      // Aquí en el futuro: guardar en Firebase
    };
  });
}

function alumnoCardHTML(clase, nombre) {
  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    return `<button class="hour-button" data-alumno="${alumnoId}" data-hora="${hora}" style="padding:0.3rem 0.6rem; border-radius:5px; border:1px solid #ccc; background:#eee; font-weight:bold;">${hora}</button>`;
  }).join(" ");

  return `
    <div style="border:1px solid #ccc; padding:1rem; border-radius:8px;">
      <div style="font-weight:bold; margin-bottom:0.5rem;">${nombre}</div>
      <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">${botones}</div>
    </div>
  `;
}

// ==============================
// INICIO
// ==============================
mostrarMenuPrincipal();
