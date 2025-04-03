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
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// Para Firebase Auth (opcional en este paso, pero recomendable para la parte de profesores)
// import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ✅ INICIALIZAR FIREBASE
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);
// const auth = getAuth(appFirebase); // Descomenta cuando integres la creación de usuarios

// Variables globales para la app
document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px;"></div>
`);
const app = document.getElementById("app");

// Variables para almacenar los datos de alumnos cargados dinámicamente
let alumnosPorClase = {};
let clases = []; // Se completará con los nombres de las clases (ESO, Bachillerato, etc.)
let usuarioActual = "UsuarioDemo"; // Mientras no integremos login

// Función para la vista principal
function mostrarMenuPrincipal() {
  // Menú principal: opciones para acceder a las clases y a la carga de datos (admin)
  app.innerHTML = `
    <h2>Selecciona una opción</h2>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <button id="verClases">Ver Clases</button>
      <button id="cargarExcels">⚙️ Carga de Excels</button>
    </div>
  `;
  document.getElementById("verClases").onclick = () => {
    if (clases.length === 0) {
      alert("Primero carga los datos desde Excel.");
    } else {
      mostrarVistaClases();
    }
  };
  document.getElementById("cargarExcels").onclick = mostrarCargaExcels;
}
window.mostrarMenuPrincipal = mostrarMenuPrincipal;

// Función para mostrar la vista de clases (con los datos cargados)
function mostrarVistaClases() {
  let htmlClases = `<h2>Selecciona una clase</h2><div style="display: flex; flex-wrap: wrap; gap: 1rem;">`;
  clases.forEach(clase => {
    htmlClases += `<button class="clase-btn" data-clase="${clase}">🧑‍🏫 ${clase}</button>`;
  });
  htmlClases += `</div>`;
  app.innerHTML = htmlClases;
  document.querySelectorAll(".clase-btn").forEach(btn => {
    btn.onclick = () => mostrarVistaClase(btn.dataset.clase);
  });
  // Botón para volver al menú principal
  const btnVolver = document.createElement("button");
  btnVolver.textContent = "🔙 Volver";
  btnVolver.style.marginTop = "2rem";
  btnVolver.onclick = mostrarMenuPrincipal;
  app.appendChild(btnVolver);
}

// Función para generar la tarjeta de cada alumno
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

// Función para aplicar estilos a los botones de asistencia
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

// Función para obtener la fecha de hoy en formato YYYY-MM-DD
function getFechaHoy() {
  return new Date().toISOString().split("T")[0];
}

// Función para mostrar la vista de una clase (lista de alumnos)
async function mostrarVistaClase(clase) {
  const alumnos = alumnosPorClase[clase] || [];
  const fecha = getFechaHoy();
  app.innerHTML = `<h2>👨‍🏫 Clase ${clase}</h2>`;

  for (const nombre of alumnos) {
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, clase, alumnoId);
    let docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { nombre, historial: [] });
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
  const btnVolver = document.createElement("button");
  btnVolver.textContent = "🔙 Volver";
  btnVolver.style.marginTop = "2rem";
  btnVolver.onclick = mostrarVistaClases;
  app.appendChild(btnVolver);
}

// -------------------
// Funciones para procesar archivos Excel (usando xlsx)
// -------------------

// Función para leer y parsear el archivo Excel
function parseExcelFile(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);
    callback(json);
  };
  reader.readAsBinaryString(file);
}

// Procesa el Excel de alumnos
function procesarAlumnos(data) {
  // Se espera que cada fila tenga al menos las columnas "Clase" y "Alumno"
  data.forEach(async (row) => {
    const clase = row.Clase;
    const nombre = row.Alumno;
    if (!clase || !nombre) return;
    // Agrupamos los alumnos por clase
    if (!alumnosPorClase[clase]) {
      alumnosPorClase[clase] = [];
    }
    alumnosPorClase[clase].push(nombre);
    // Creamos/actualizamos el documento en Firestore
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, clase, alumnoId);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { nombre, historial: [] });
    }
  });
  // Actualizamos la lista de clases con las claves de alumnosPorClase
  clases = Object.keys(alumnosPorClase);
  alert("Datos de alumnos cargados. Se encontraron las siguientes clases:\n" + clases.join(", "));
}

// Procesa el Excel de profesores
function procesarProfesores(data) {
  // Se espera que cada fila tenga al menos las columnas "Usuario" y "Email"
  data.forEach(async (row) => {
    const usuario = row.Usuario;
    const email = row.Email;
    if (!usuario || !email) return;
    // Guardamos en la colección "profesores" en Firestore
    const ref = doc(db, "profesores", usuario);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { usuario, email });
    }
    // Opcional: Crear usuario en Firebase Auth con una contraseña predeterminada.
    // Esta acción es recomendable hacerlo en un entorno seguro (usando Admin SDK o Cloud Functions)
    // Ejemplo (para pruebas):
    // createUserWithEmailAndPassword(auth, email, "123456")
    //   .then(userCredential => {
    //     console.log("Profesor creado:", userCredential.user);
    //   })
    //   .catch(error => {
    //     console.error("Error al crear profesor:", error);
    //   });
  });
  alert("Datos de profesores cargados.");
}

// Vista de administración para cargar los archivos Excel
function mostrarCargaExcels() {
  app.innerHTML = `
    <h2>⚙️ Carga de datos desde Excel</h2>
    <div>
      <h3>Alumnos</h3>
      <input type="file" id="fileAlumnos" accept=".xlsx,.xls" />
      <button id="cargarAlumnos">Cargar Alumnos</button>
    </div>
    <div style="margin-top: 1rem;">
      <h3>Profesores</h3>
      <input type="file" id="fileProfesores" accept=".xlsx,.xls" />
      <button id="cargarProfesores">Cargar Profesores</button>
    </div>
    <button id="volverMenu" style="margin-top:2rem;">🔙 Volver</button>
  `;
  document.getElementById("volverMenu").onclick = mostrarMenuPrincipal;
  document.getElementById("cargarAlumnos").onclick = () => {
    const fileInput = document.getElementById("fileAlumnos");
    if(fileInput.files.length === 0) {
      alert("Selecciona un archivo de alumnos.");
      return;
    }
    const file = fileInput.files[0];
    parseExcelFile(file, procesarAlumnos);
  };
  document.getElementById("cargarProfesores").onclick = () => {
    const fileInput = document.getElementById("fileProfesores");
    if(fileInput.files.length === 0) {
      alert("Selecciona un archivo de profesores.");
      return;
    }
    const file = fileInput.files[0];
    parseExcelFile(file, procesarProfesores);
  };
}

// INICIO: Mostrar el menú principal
mostrarMenuPrincipal();
