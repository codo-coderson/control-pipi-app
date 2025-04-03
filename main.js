console.log("🟢 main.js cargado correctamente");

// === CONFIG DE FIREBASE (ya configurada) ===
const firebaseConfig = {
  apiKey: "AIzaSyCsWVffr6yvIZel2Wzhy1v9ZtvKPiMqiFQ",
  authDomain: "controlpipiapp.firebaseapp.com",
  projectId: "controlpipiapp",
  storageBucket: "controlpipiapp.firebasestorage.app",
  messagingSenderId: "1059568174856",
  appId: "1:1059568174856:web:cf9d54881bb07961d60ebd"
};

// == IMPORTS DESDE CDN (Firebase App, Firestore y Auth) ==
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  setDoc
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

// == Contenedor principal en el DOM ==
document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px;"></div>
`);
const app = document.getElementById("app");

// == Variables globales ==
let alumnosPorClase = {};   // { "1ESO A": ["Pérez, Juan", ...], "2ESO B": [...], ... }
let clases = [];            // ["1ESO A", "2ESO B", ...]
let usuarioActual = null;   // Se llenará con user.email cuando se loguee

// ------------------------------------------------------------------
//  1) AUTENTICACIÓN
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

// == Listener de autenticación (muestra login o menú principal) ==
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = user.email; // o user.uid, según prefieras
    mostrarMenuPrincipal();
  } else {
    mostrarVistaLogin();
  }
});

// ------------------------------------------------------------------
//  2) MENÚ PRINCIPAL
// ------------------------------------------------------------------
function mostrarMenuPrincipal() {
  app.innerHTML = `
    <h2>Menú Principal</h2>
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

  // Botón para cerrar sesión
  const btnLogout = document.createElement("button");
  btnLogout.textContent = "Cerrar sesión";
  btnLogout.style.marginTop = "2rem";
  btnLogout.onclick = async () => {
    try {
      await signOut(auth);
      alert("Sesión cerrada.");
    } catch (error) {
      alert("Error al cerrar sesión: " + error.message);
    }
  };
  app.appendChild(btnLogout);
}
window.mostrarMenuPrincipal = mostrarMenuPrincipal;

// ------------------------------------------------------------------
//  3) VISTA DE CLASES Y MARCADO DE HORAS
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

  const btnVolver = document.createElement("button");
  btnVolver.textContent = "🔙 Volver";
  btnVolver.style.marginTop = "2rem";
  btnVolver.onclick = mostrarMenuPrincipal;
  app.appendChild(btnVolver);
}

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

        // Calculamos las horas activas según los botones "active"
        const nuevasHoras = Array.from(tarjeta.querySelectorAll(".hour-button"))
          .filter(b => b.classList.contains("active"))
          .map(b => parseInt(b.dataset.hora));

        // Creamos un nuevo historial
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

// ------------------------------------------------------------------
//  4) LECTURA DE EXCEL (SheetJS) - DIFERENCIANDO ALUMNOS (con cabecera) Y PROFESORES (sin cabecera)
// ------------------------------------------------------------------
function parseExcelFile(file, hasHeaders, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let json;
    if (hasHeaders) {
      // Para alumnos (cabeceras "Alumno" y "Curso")
      json = XLSX.utils.sheet_to_json(sheet);
    } else {
      // Para profesores (sin cabeceras). Genera un array de arrays
      json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }
    callback(json);
  };
  reader.readAsBinaryString(file);
}

// == Procesar ALUMNOS (espera cabeceras "Alumno" y "Curso") ==
function procesarAlumnos(data) {
  console.log("Datos parseados de alumnos:", data);
  data.forEach(async (row) => {
    // row.Alumno, row.Curso (según cabeceras)
    const nombre = row.Alumno;
    const curso = row.Curso;
    if (!nombre || !curso) {
      console.log("Fila sin 'Alumno' o 'Curso':", row);
      return;
    }
    // Agrupamos en alumnosPorClase
    if (!alumnosPorClase[curso]) {
      alumnosPorClase[curso] = [];
    }
    alumnosPorClase[curso].push(nombre);

    // Creamos doc en Firestore si no existe
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, curso, alumnoId);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { nombre, historial: [] });
    }
  });
  // Actualizamos la lista de clases
  clases = Object.keys(alumnosPorClase);
  alert("Datos de alumnos cargados. Clases encontradas:\n" + clases.join(", "));
}

// == Procesar PROFESORES (no hay cabeceras). data es array de arrays: [ [ "Apellido Nombre", "email" ], [...], ... ]
function procesarProfesores(rows) {
  console.log("Datos parseados de profesores:", rows);
  rows.forEach(async (cols) => {
    // cols[0] => "Apellido Nombre", cols[1] => "email"
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
    // Guardamos en la colección "profesores"
    // Usamos el email como ID del documento (único)
    const ref = doc(db, "profesores", email);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { nombreCompleto, email });
    }
  });
  alert("Datos de profesores cargados.");
}

// ------------------------------------------------------------------
//  5) VISTA PARA CARGAR EXCELS
// ------------------------------------------------------------------
function mostrarCargaExcels() {
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

  // Cargar ALUMNOS => hasHeaders = true
  document.getElementById("cargarAlumnos").onclick = () => {
    const fileInput = document.getElementById("fileAlumnos");
    if(fileInput.files.length === 0) {
      alert("Selecciona un archivo de alumnos.");
      return;
    }
    const file = fileInput.files[0];
    parseExcelFile(file, true, procesarAlumnos);
  };

  // Cargar PROFESORES => hasHeaders = false
  document.getElementById("cargarProfesores").onclick = () => {
    const fileInput = document.getElementById("fileProfesores");
    if(fileInput.files.length === 0) {
      alert("Selecciona un archivo de profesores.");
      return;
    }
    const file = fileInput.files[0];
    parseExcelFile(file, false, procesarProfesores);
  };
}

// ------------------------------------------------------------------
//  INICIO: El listener onAuthStateChanged ya gestiona la vista inicial
// ------------------------------------------------------------------
