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
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  Timestamp
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

// --- Insertamos el header y contenedor principal ---
document.body.insertAdjacentHTML("afterbegin", `
  <div id="header" style="position: fixed; top: 0; right: 0; padding: 0.5rem; background: #fff; text-align: right; z-index: 1000;"></div>
`);
document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px; margin-top: 3rem;"></div>
`);
const app = document.getElementById("app");

// --- Variables globales ---
let alumnosPorClase = {}; // Ej.: { "1ESO A": ["Pérez, Juan", ...] }
let clases = [];          // Ej.: ["1ESO A", "2ESO B", ...]
let usuarioActual = null; // Se asigna tras iniciar sesión

// ---------- PERSISTENCIA EN FIRESTORE ----------
// Lee el documento meta ("meta/clases") y para cada curso carga los alumnos.
async function loadDataFromFirestore() {
  try {
    const metaRef = doc(db, "meta", "clases");
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      clases = metaSnap.data().clases || [];
    } else {
      clases = [];
    }
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
    console.error("Error al cargar datos desde Firestore:", err);
  }
}

// --- Función borrarBaseDeDatos ---
// Borra todos los documentos de cada colección listada en "clases" y el documento meta "meta/clases".
async function borrarBaseDeDatos() {
  try {
    for (const curso of clases) {
      const collRef = collection(db, curso);
      const snapshot = await getDocs(collRef);
      snapshot.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });
    }
    await deleteDoc(doc(db, "meta", "clases"));
    alumnosPorClase = {};
    clases = [];
    alert("Toda la base de datos ha sido borrada.");
  } catch (err) {
    console.error("Error al borrar la base de datos:", err);
    alert("Error al borrar la base de datos.");
  }
}

// --- Función updateHeader ---
// Si hay usuario, muestra su nombre (sin el dominio), la hora y el enlace para cerrar sesión; sino, solo la hora.
function updateHeader() {
  const now = new Date();
  const pad = n => n < 10 ? "0" + n : n;
  const horaSistema = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  if (usuarioActual) {
    let displayName = usuarioActual.endsWith("@salesianas.org")
      ? usuarioActual.replace("@salesianas.org", "")
      : usuarioActual;
    document.getElementById("header").innerHTML = `
      <div>${displayName}</div>
      <div>Hora del sistema: ${horaSistema}</div>
      <div><a href="#" id="linkLogout">Cerrar sesión</a></div>
    `;
    document.getElementById("linkLogout").onclick = async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        usuarioActual = null;
        updateHeader();
      } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
      }
    };
  } else {
    document.getElementById("header").innerHTML = `<div>Hora del sistema: ${horaSistema}</div>`;
  }
}
setInterval(updateHeader, 1000);

// --- 1) AUTENTICACIÓN ---
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
      alert("Error en el envío del email: " + error.message);
    }
  };
}
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user.email;
    await mostrarMenuPrincipal();
  } else {
    usuarioActual = null;
    mostrarVistaLogin();
  }
});

// --- 2) MENÚ PRINCIPAL ---
// Muestra "Ver Clases", "Carga de alumnos" y "Borrar base de datos" (estos dos últimos solo para salvador.fernandez@salesianas.org).
async function mostrarMenuPrincipal() {
  await loadDataFromFirestore();
  app.innerHTML = `
    <h2>Menú Principal</h2>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <button id="verClases">Ver Clases</button>
      ${usuarioActual === "salvador.fernandez@salesianas.org" ? `<button id="cargaAlumnos">Carga de alumnos</button>` : ""}
      ${usuarioActual === "salvador.fernandez@salesianas.org" ? `<button id="borrarBD">Borrar base de datos</button>` : ""}
    </div>
  `;
  document.getElementById("verClases").onclick = () => {
    if (clases.length === 0) {
      alert("No se encontraron datos en Firestore. Carga los excels.");
    } else {
      mostrarVistaClases();
    }
  };
  if (usuarioActual === "salvador.fernandez@salesianas.org") {
    document.getElementById("cargaAlumnos").onclick = mostrarCargaAlumnos;
    document.getElementById("borrarBD").onclick = async () => {
      if (confirm("ATENCIÓN: Esto BORRARÁ TODA la base de datos. ¿Desea continuar?")) {
        await borrarBaseDeDatos();
        alert("La base de datos ha sido borrada.");
      }
    };
  }
  const btnLogout = document.createElement("button");
  btnLogout.textContent = "Cerrar sesión";
  btnLogout.style.marginTop = "2rem";
  btnLogout.onclick = async () => {
    try {
      await signOut(auth);
      usuarioActual = null;
      updateHeader();
    } catch (error) {
      alert("Error al cerrar sesión: " + error.message);
    }
  };
  app.appendChild(btnLogout);
}
window.mostrarMenuPrincipal = mostrarMenuPrincipal;

// --- 3) VISTA DE CLASES ---
// Muestra un listado de cursos con un único botón "Volver" al final.
function mostrarVistaClases() {
  let html = `<h2>Selecciona una clase</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 1rem;">`;
  clases.forEach(clase => {
    html += `<button class="clase-btn" data-clase="${clase}">🧑‍🏫 ${clase}</button>`;
  });
  html += `</div>`;
  app.innerHTML = html;
  document.querySelectorAll(".clase-btn").forEach(btn => {
    btn.onclick = () => mostrarVistaClase(btn.dataset.clase);
  });
  const btnAbajo = document.createElement("button");
  btnAbajo.textContent = "🔙 Volver";
  btnAbajo.style.marginTop = "2rem";
  btnAbajo.onclick = mostrarMenuPrincipal;
  app.appendChild(btnAbajo);
}
window.mostrarVistaClases = mostrarVistaClases;

// --- 4) VISTA DE UNA CLASE Y REGISTRO DE SALIDAS ---
// Función para obtener la fecha (timestamp del inicio del día).
function getFechaHoy() {
  // Devuelve un Timestamp con la hora 00:00:00 del día actual
  return Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)));
}


// Función que genera la tarjeta de un alumno usando los nuevos campos:
// "wc": array de { fecha: Timestamp, salidas: [ { hora, usuario } ] }
// "salidas_acumuladas": número.
function alumnoCardHTML(clase, nombre, wc = [], salidas_acumuladas = 0) {
  let todayTimestamp = getFechaHoy();
let registrosPrevios = (wc || []).filter(r => r.fecha.toMillis() < todayTimestamp.toMillis());
let ultimoDia = registrosPrevios.length > 0
    ? registrosPrevios.reduce((prev, curr) => (prev.fecha.toMillis() > curr.fecha.toMillis() ? prev : curr)).salidas.length
    : 0;

  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    let registro = null;
    if (wc && wc.length > 0) {
      // Usamos el registro del día actual, si existe, para mostrar la salida actual
      let todayTimestamp = getFechaHoy();
let registroHoy = current_wc.find(r => r.fecha.toMillis() === todayTimestamp.toMillis());
if (!registroHoy) {
  registroHoy = { fecha: todayTimestamp, salidas: [] };
  current_wc.push(registroHoy);
}

    }
    const activa = Boolean(registro);
    const estilo = activa
      ? 'background-color: #0044cc; color: #ff0; border: 1px solid #003399;'
      : 'background-color: #eee; color: #000; border: 1px solid #ccc;';
    const label = activa
      ? `<span style="font-size:0.8rem; margin-left:0.3rem;">${registro.usuario.replace("@salesianas.org", "")}</span>`
      : "";
    return `<div style="display: inline-flex; align-items: center; margin-right: 0.5rem;">
              <button class="hour-button" data-alumno="${alumnoId}" data-hora="${hora}" style="${estilo}">${hora}</button>
              ${label}
            </div>`;
  }).join("");
  return `
    <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
      <div style="font-weight: bold; margin-bottom: 0.5rem;">${nombre}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">${botones}</div>
      <div style="margin-top: 0.5rem; font-size: 0.9rem;">
         Último día: ${ultimoDia} salidas. Total acumulado: ${salidas_acumuladas} salidas.
      </div>
    </div>
  `;
}

// Función auxiliar que asigna el listener a cada botón y re-renderiza la tarjeta tras cada clic.
function renderCard(container, clase, nombre, wc = [], salidas_acumuladas = 0, ref, fecha) {
  container.innerHTML = alumnoCardHTML(clase, nombre, wc, salidas_acumuladas);
  container.querySelectorAll(".hour-button").forEach(button => {
    button.addEventListener("click", async function() {
      const hora = parseInt(this.dataset.hora);
      let docSnapNew = await getDoc(ref);
      let dataNew = docSnapNew.data();
      let current_wc = dataNew.wc || [];
      let current_total = dataNew.salidas_acumuladas || 0;
      let todayTimestamp = getFechaHoy();
      
      // Buscar el registro para hoy (comparando timestamp)
      let registroHoy = current_wc.find(r => r.fecha.toMillis() === todayTimestamp);
      let old_count = registroHoy ? registroHoy.salidas.length : 0;
      if (!registroHoy) {
        registroHoy = { fecha: Timestamp.fromDate(new Date(todayTimestamp)), salidas: [] };
        current_wc.push(registroHoy);
      }
      
      const indexSalida = registroHoy.salidas.findIndex(r => r.hora === hora);
      if (indexSalida > -1) {
        if (registroHoy.salidas[indexSalida].usuario === usuarioActual) {
          registroHoy.salidas.splice(indexSalida, 1);
        } else {
          alert("No puedes desmarcar una salida registrada por otro usuario.");
          return;
        }
      } else {
        registroHoy.salidas.push({ hora: hora, usuario: usuarioActual });
      }
      
      let new_count = registroHoy.salidas.length;
      let diff = new_count - old_count; // +1 o -1
      current_total += diff;
      
      await updateDoc(ref, { wc: current_wc, salidas_acumuladas: current_total });
      docSnapNew = await getDoc(ref);
      dataNew = docSnapNew.data();
      renderCard(container, clase, nombre, dataNew.wc || [], dataNew.salidas_acumuladas || 0, ref, fecha);
    });
  });
}

// Función para mostrar la vista de una clase y sus alumnos.
async function mostrarVistaClase(clase) {
  const alumnos = alumnosPorClase[clase] || [];
  const fecha = getFechaHoy();
  app.innerHTML = `<h2>👨‍🏫 Clase ${clase}</h2>`;
  const btnArriba = document.createElement("button");
  btnArriba.textContent = "🔙 Volver";
  btnArriba.style.marginBottom = "1rem";
  btnArriba.onclick = mostrarVistaClases;
  app.appendChild(btnArriba);
  
  for (const nombre of alumnos) {
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, clase, alumnoId);
    let docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      // Al crear un alumno nuevo, almacenar con los nuevos campos.
      await setDoc(ref, { nombre, salidas_acumuladas: 0, wc: [] });
      docSnap = await getDoc(ref);
    }
    const data = docSnap.data();
    const wc = data.wc || [];
    const total_acumuladas = data.salidas_acumuladas || 0;
    const cardContainer = document.createElement("div");
    renderCard(cardContainer, clase, nombre, wc, total_acumuladas, ref, fecha);
    app.appendChild(cardContainer);
  }
  
  const btnAbajo = document.createElement("button");
  btnAbajo.textContent = "🔙 Volver";
  btnAbajo.style.marginTop = "2rem";
  btnAbajo.onclick = mostrarVistaClases;
  app.appendChild(btnAbajo);
}
window.mostrarVistaClase = mostrarVistaClase;

// --- 5) LECTURA DE EXCEL ---
// Solo se carga alumnos.
function parseExcelFile(file, hasHeaders, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let json = hasHeaders 
      ? XLSX.utils.sheet_to_json(sheet) 
      : XLSX.utils.sheet_to_json(sheet, { header: 1 });
    callback(json);
  };
  reader.readAsBinaryString(file);
}

function procesarAlumnos(data) {
  console.log("Datos parseados de alumnos:", data);
  // Avisamos que se borrarán TODOS los registros previos.
  if (!confirm("ATENCIÓN: Se BORRARÁN todos los registros anteriores de la base de datos. ¿Desea continuar?")) {
    return;
  }
  borrarBaseDeDatos().then(() => {
    data.forEach(async (row) => {
      const nombre = row.Alumno;
      const curso = row.Curso;
      if (!nombre || !curso) {
        console.log("Fila incompleta:", row);
        return;
      }
      if (!alumnosPorClase[curso]) {
        alumnosPorClase[curso] = [];
      }
      alumnosPorClase[curso].push(nombre);
      const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
      const ref = doc(db, curso, alumnoId);
      const docSnap = await getDoc(ref);
      if (!docSnap.exists()) {
        // Crear alumno nuevo con los nuevos campos.
        await setDoc(ref, { nombre, salidas_acumuladas: 0, wc: [] });
      }
    });
    clases = Object.keys(alumnosPorClase);
    // Actualizar el documento meta para persistir la lista de cursos.
    setDoc(doc(db, "meta", "clases"), { clases: clases });
    alert("Datos de alumnos cargados. Clases: " + clases.join(", "));
  });
}

function procesarProfesores(rows) {
  alert("La carga de profesores ha sido deshabilitada.");
}

function mostrarCargaExcels() {
  // Ya no se usa.
}

function mostrarCargaAlumnos() {
  app.innerHTML = `
    <h2>⚙️ Carga de alumnos</h2>
    <div>
      <h3>Alumnos (cabeceras "Alumno" y "Curso")</h3>
      <input type="file" id="fileAlumnos" accept=".xlsx,.xls" />
      <button id="cargarAlumnos">Cargar Alumnos</button>
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
}
