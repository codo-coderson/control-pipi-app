console.log("🟢 main.js cargado correctamente");

// == CONFIG DE FIREBASE ==
const firebaseConfig = {
  apiKey: "AIzaSyCsWVffr6yvIZel2Wzhy1v9ZtvKPiMqiFQ",
  authDomain: "controlpipiapp.firebaseapp.com",
  projectId: "controlpipiapp",
  storageBucket: "controlpipiapp.firebasestorage.app",
  messagingSenderId: "1059568174856",
  appId: "1:1059568174856:web:cf9d54881bb07961d60ebd"
};

// == IMPORTS DE FIREBASE (App, Firestore y Auth) ==
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// == INICIALIZAR FIREBASE ==
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);
const auth = getAuth(appFirebase);

// == Crear contenedor de header (fijo en la esquina superior derecha) ==
document.body.insertAdjacentHTML("afterbegin", `
  <div id="header" style="position: fixed; top: 0; right: 0; padding: 0.5rem; text-align: right; background: #fff; z-index: 1000;"></div>
`);

// == Crear contenedor principal ==
document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px; margin-top: 3rem;"></div>
`);
const app = document.getElementById("app");

// == Variables globales ==
let alumnosPorClase = {};   // { "Curso": [ "Alumno", ... ] }
let clases = [];            // Ej.: ["1ESO A", "Bachillerato B", …]
let usuarioActual = null;   // Se asigna al loguearse

// ------------------------------------------------------------------
// Función para actualizar el header (email, hora del sistema, cerrar sesión)
// ------------------------------------------------------------------
function updateHeader() {
  let displayName = usuarioActual;
  if (displayName && displayName.endsWith("@salesianas.org")) {
    displayName = displayName.replace("@salesianas.org", "");
  }
  const now = new Date();
  const pad = n => n < 10 ? "0" + n : n;
  const horaSistema = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById("header").innerHTML = `
    <div>${displayName || ""}</div>
    <div>Hora del sistema: ${horaSistema}</div>
    <div><a href="#" id="linkLogout">Cerrar sesión</a></div>
  `;
  const logoutLink = document.getElementById("linkLogout");
  if (logoutLink) {
    logoutLink.onclick = async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
      } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
      }
    };
  }
}
setInterval(updateHeader, 1000); // Actualiza la hora cada segundo

// ------------------------------------------------------------------
// Carga de datos permanentes desde Firestore
// Se asume que, al importar el Excel de alumnos, se actualiza el documento meta "meta/clases"
// con la lista de cursos. Aquí leemos ese documento y, para cada curso, cargamos sus alumnos.
async function loadDataFromFirestore() {
  try {
    const metaRef = doc(db, "meta", "clases");
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      clases = metaSnap.data().clases || [];
    } else {
      clases = [];
    }
    // Para cada curso, recuperamos los alumnos
    for (const curso of clases) {
      const collRef = collection(db, curso);
      const snapshot = await getDocs(collRef);
      alumnosPorClase[curso] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.nombre && !alumnosPorClase[curso].includes(data.nombre)) {
          alumnosPorClase[curso].push(data.nombre);
        }
      });
    }
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

// ------------------------------------------------------------------
// 1) AUTENTICACIÓN
// ------------------------------------------------------------------
function mostrarVistaLogin() {
  app.innerHTML = `
    <h2>🔒 Login</h2>
    <div>
      <input type="email" id="email" placeholder="Email" />
    </div>
    <div>
      <input type="password" id="password" placeholder="Contraseña" />
    </div>
    <div style="margin-top: 1rem;">
      <button id="btnLogin">Iniciar sesión</button>
      <button id="btnReset">Recuperar contraseña</button>
    </div>
  `;
  document.getElementById("btnLogin").onclick = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Usuario logueado:", userCredential.user);
    } catch (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  };
  document.getElementById("btnReset").onclick = async () => {
    const email = document.getElementById("email").value;
    if (!email) {
      alert("Introduce el email para recuperar la contraseña.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Se ha enviado un email para restablecer la contraseña.");
    } catch (error) {
      alert("Error al enviar el email de restablecimiento: " + error.message);
    }
  };
}

// Listener de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = user.email;
    updateHeader();
    mostrarMenuPrincipal();
  } else {
    usuarioActual = null;
    updateHeader();
    mostrarVistaLogin();
  }
});

// ------------------------------------------------------------------
// 2) MENÚ PRINCIPAL
// ------------------------------------------------------------------
async function mostrarMenuPrincipal() {
  updateHeader();
  // Cargar datos desde Firestore (si ya se importaron previamente)
  await loadDataFromFirestore();
  app.innerHTML = `
    <h2>Menú Principal</h2>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <button id="verClases">Ver Clases</button>
      <button id="cargarExcels">⚙️ Carga de Excels</button>
    </div>
  `;
  document.getElementById("verClases").onclick = () => {
    if (clases.length === 0) {
      alert("No hay datos cargados. Importa los Excel si es la primera vez.");
    } else {
      mostrarVistaClases();
    }
  };
  document.getElementById("cargarExcels").onclick = mostrarCargaExcels;
}
window.mostrarMenuPrincipal = mostrarMenuPrincipal;

// ------------------------------------------------------------------
// 2.1) VISTA DE CLASES (LISTADO DE CURSOS)
// ------------------------------------------------------------------
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
  app.appendChild(crearBotonVolver(mostrarMenuPrincipal));
}
window.mostrarVistaClases = mostrarVistaClases;

// ------------------------------------------------------------------
// 3) VISTA DE UNA CLASE Y REGISTRO DE SALIDAS
// ------------------------------------------------------------------

// Función para obtener la fecha actual (YYYY-MM-DD)
function getFechaHoy() {
  return new Date().toISOString().split("T")[0];
}

// Función para comprobar y resetear salidas si es después de las 14:30
async function checkAndResetSalidas(docData, ref) {
  const fecha = getFechaHoy();
  const now = new Date();
  if (now.getHours() > 14 || (now.getHours() === 14 && now.getMinutes() >= 30)) {
    const record = docData.historial?.find(d => d.fecha === fecha);
    if (record) {
      const count = record.salidas ? record.salidas.length : 0;
      const nuevaUltimaSalida = count;
      const nuevoTotal = (docData.totalAcumulado || 0) + count;
      const nuevoHistorial = (docData.historial || []).filter(d => d.fecha !== fecha);
      await updateDoc(ref, { 
        historial: nuevoHistorial,
        ultimaSalida: nuevaUltimaSalida,
        totalAcumulado: nuevoTotal
      });
      docData.historial = nuevoHistorial;
      docData.ultimaSalida = nuevaUltimaSalida;
      docData.totalAcumulado = nuevoTotal;
    }
  }
  return docData;
}

// Función que genera la tarjeta de un alumno
// Cada botón se muestra con estilo según su estado; al lado aparece (si activo) el nombre del profesor.
function alumnoCardHTML(nombre, salidas = [], ultimaSalida = 0, totalAcumulado = 0) {
  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    const salida = salidas.find(s => s.hora === hora);
    const activa = Boolean(salida);
    const style = activa 
      ? 'background-color: #0044cc; color: #ff0; border: 1px solid #003399;'
      : 'background-color: #eee; color: #000; border: 1px solid #ccc;';
    return `<div style="display: inline-flex; align-items: center; margin-right: 0.5rem;">
              <button class="hour-button" data-alumno="${alumnoId}" data-hora="${hora}" style="${style}">${hora}</button>
              <span class="teacher-label" style="font-size: 0.8rem; margin-left: 0.3rem;">${activa ? salida.usuario.replace("@salesianas.org", "") : ""}</span>
            </div>`;
  }).join("");
  return `<div style="border:1px solid #ccc; padding:1rem; border-radius:8px; margin-bottom:1rem;">
            <div style="font-weight:bold; margin-bottom:0.5rem;">${nombre}</div>
            <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">${botones}</div>
            <div style="margin-top:0.5rem; font-size: 0.9rem;">
               Último día: <span class="ultimaSalida">${ultimaSalida}</span> salidas. 
               Total acumulado: <span class="totalAcumulado">${totalAcumulado}</span> salidas.
            </div>
          </div>`;
}

// Función para actualizar en Firestore el registro de salidas para el día actual
async function actualizarSalidas(ref, docData, fecha, salidas) {
  const nuevoHistorial = (docData.historial || []).filter(d => d.fecha !== fecha);
  if (salidas.length > 0) {
    nuevoHistorial.push({ fecha, salidas });
  }
  await updateDoc(ref, { historial: nuevoHistorial });
  docData.historial = nuevoHistorial;
}

// Función para crear un botón "Volver"
function crearBotonVolver(callback) {
  const btn = document.createElement("button");
  btn.textContent = "🔙 Volver";
  btn.style.margin = "1rem 0";
  btn.onclick = callback;
  return btn;
}

// Nueva función para renderizar la tarjeta de un alumno de forma independiente.
// Relee la información de Firestore y reconfigura los listeners de los botones.
async function renderAlumno(tarjeta, ref, alumnoId, nombre) {
  const fecha = getFechaHoy();
  let docSnap = await getDoc(ref);
  if (!docSnap.exists()) {
    await setDoc(ref, { 
      nombre, 
      historial: [],
      ultimaSalida: 0,
      totalAcumulado: 0
    });
    docSnap = await getDoc(ref);
  }
  let docData = docSnap.data();
  docData = await checkAndResetSalidas(docData, ref);
  const record = docData.historial?.find(d => d.fecha === fecha);
  let salidas = record ? record.salidas : [];
  
  tarjeta.innerHTML = alumnoCardHTML(nombre, salidas, docData.ultimaSalida || 0, docData.totalAcumulado || 0);
  
  // Para cada botón, asignamos un listener fresco:
  tarjeta.querySelectorAll(".hour-button").forEach(btn => {
    btn.onclick = async () => {
      const hora = parseInt(btn.dataset.hora);
      // Releer datos actualizados
      let updatedSnap = await getDoc(ref);
      let updatedData = updatedSnap.data();
      updatedData = await checkAndResetSalidas(updatedData, ref);
      let recordUpdated = updatedData.historial?.find(d => d.fecha === fecha);
      let currentSalidas = recordUpdated ? recordUpdated.salidas : [];
      let existing = currentSalidas.find(s => s.hora === hora);
      if (!existing) {
        currentSalidas.push({ hora, usuario: usuarioActual });
      } else {
        if (existing.usuario === usuarioActual) {
          currentSalidas = currentSalidas.filter(s => s.hora !== hora);
        } else {
          alert("No puedes desmarcar una salida registrada por otro usuario.");
          return;
        }
      }
      await actualizarSalidas(ref, updatedData, fecha, currentSalidas);
      // Re-renderiza la tarjeta con la información actualizada
      await renderAlumno(tarjeta, ref, alumnoId, nombre);
    };
  });
}

// Función que muestra la vista de una clase
async function mostrarVistaClase(clase) {
  updateHeader();
  const fecha = getFechaHoy();
  app.innerHTML = `<h2>👨‍🏫 Clase ${clase}</h2>`;
  app.appendChild(crearBotonVolver(mostrarVistaClases));
  
  const alumnos = alumnosPorClase[clase] || [];
  for (const nombre of alumnos) {
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, clase, alumnoId);
    const tarjeta = document.createElement("div");
    app.appendChild(tarjeta);
    await renderAlumno(tarjeta, ref, alumnoId, nombre);
  }
  app.appendChild(crearBotonVolver(mostrarVistaClases));
}
window.mostrarVistaClase = mostrarVistaClase;

// ------------------------------------------------------------------
// 4) CARGA DE EXCEL Y BORRADO DE DATOS PREVIOS
// ------------------------------------------------------------------

// Funciones para borrar documentos de alumnos y profesores
async function borrarDatosAlumnos() {
  const cursos = Object.keys(alumnosPorClase);
  for (const curso of cursos) {
    const collRef = collection(db, curso);
    const snapshot = await getDocs(collRef);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
  }
  alumnosPorClase = {};
  clases = [];
}

async function borrarDatosProfesores() {
  const collRef = collection(db, "profesores");
  const snapshot = await getDocs(collRef);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
  }
}

// Función para parsear archivos Excel usando SheetJS
function parseExcelFile(file, hasHeaders, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let json;
    if (hasHeaders) {
      json = XLSX.utils.sheet_to_json(sheet);
    } else {
      json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }
    callback(json);
  };
  reader.readAsBinaryString(file);
}

// Procesar Excel de Alumnos (cabeceras: "Alumno" y "Curso")
// Al finalizar, se actualiza el documento meta "meta/clases" para guardar la lista de cursos.
async function procesarAlumnos(data) {
  console.log("Datos parseados de alumnos:", data);
  if (!confirm("Se borrarán los datos anteriores de alumnos (incluidas las salidas acumuladas). ¿Continuar?")) {
    return;
  }
  await borrarDatosAlumnos();
  
  data.forEach(async (row) => {
    const nombre = row.Alumno;
    const curso = row.Curso;
    if (!nombre || !curso) {
      console.log("Fila sin 'Alumno' o 'Curso':", row);
      return;
    }
    if (!alumnosPorClase[curso]) {
      alumnosPorClase[curso] = [];
    }
    if (!alumnosPorClase[curso].includes(nombre)) {
      alumnosPorClase[curso].push(nombre);
    }
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, curso, alumnoId);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { 
        nombre, 
        historial: [],
        ultimaSalida: 0,
        totalAcumulado: 0
      });
    }
  });
  clases = Object.keys(alumnosPorClase);
  // Actualizar documento meta para conservar los cursos importados
  await setDoc(doc(db, "meta", "clases"), { clases: clases });
  alert("Datos de alumnos cargados. Clases encontradas:\n" + clases.join(", "));
}

// Procesar Excel de Profesores (sin cabeceras: columna 1 = "Apellidos, Nombre", columna 2 = "Email")
async function procesarProfesores(rows) {
  console.log("Datos parseados de profesores:", rows);
  if (!confirm("Se borrarán los datos anteriores de profesores. ¿Continuar?")) {
    return;
  }
  await borrarDatosProfesores();
  
  rows.forEach(async (cols) => {
    if (!cols || cols.length < 2) {
      console.log("Fila sin suficientes columnas:", cols);
      return;
    }
    const nombreCompleto = cols[0];
    const email = cols[1];
    if (!nombreCompleto || !email) {
      console.log("Fila sin nombre o email:", cols);
      return;
    }
    const ref = doc(db, "profesores", email);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { nombreCompleto, email });
    }
  });
  alert("Datos de profesores cargados.");
}

// Vista para cargar archivos Excel
function mostrarCargaExcels() {
  updateHeader();
  app.innerHTML = `
    <h2>⚙️ Carga de datos desde Excel</h2>
    <div>
      <h3>Alumnos (con cabeceras "Alumno" y "Curso")</h3>
      <input type="file" id="fileAlumnos" accept=".xlsx,.xls" />
      <button id="cargarAlumnos">Cargar Alumnos</button>
    </div>
    <div style="margin-top: 1rem;">
      <h3>Profesores (sin cabeceras)</h3>
      <input type="file" id="fileProfesores" accept=".xlsx,.xls" />
      <button id="cargarProfesores">Cargar Profesores</button>
    </div>
    <button id="volverMenu" style="margin-top:2rem;">🔙 Volver</button>
  `;
  document.getElementById("volverMenu").onclick = mostrarMenuPrincipal;
  
  document.getElementById("cargarAlumnos").onclick = () => {
    const fileInput = document.getElementById("fileAlumnos");
    if (fileInput.files.length === 0) {
      alert("Selecciona un archivo de alumnos.");
      return;
    }
    const file = fileInput.files[0];
    parseExcelFile(file, true, procesarAlumnos);
  };
  document.getElementById("cargarProfesores").onclick = () => {
    const fileInput = document.getElementById("fileProfesores");
    if (fileInput.files.length === 0) {
      alert("Selecciona un archivo de profesores.");
      return;
    }
    const file = fileInput.files[0];
    parseExcelFile(file, false, procesarProfesores);
  };
}

// ------------------------------------------------------------------
// FIN: onAuthStateChanged gestiona la vista inicial
// ------------------------------------------------------------------
