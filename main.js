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
let clases = [];            // Array con los cursos (por ejemplo, "1ESO A", "Bachillerato B", etc.)
let usuarioActual = null;   // Se asignará el email del usuario logueado

// ------------------------------------------------------------------
// Función para actualizar el header con email, hora del sistema y enlace para cerrar sesión
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
// Función para cargar datos desde Firestore (datos permanentes)
// Se asume que al importar el Excel se actualiza el documento meta "meta/clases" con el array de clases
// y que cada clase es una colección con documentos de alumnos (cada uno con al menos el campo "nombre")
async function loadDataFromFirestore() {
  try {
    const metaRef = doc(db, "meta", "clases");
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      clases = metaSnap.data().clases || [];
    } else {
      clases = [];
    }
    // Para cada clase, se recuperan los alumnos
    for (const clase of clases) {
      const collRef = collection(db, clase);
      const snapshot = await getDocs(collRef);
      alumnosPorClase[clase] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.nombre && !alumnosPorClase[clase].includes(data.nombre)) {
          alumnosPorClase[clase].push(data.nombre);
        }
      });
    }
  } catch (err) {
    console.error("Error loading data:", err);
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
  // Cargar datos permanentes de Firestore
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

// Función que genera la tarjeta de un alumno con botones para marcar las salidas
// Cada botón se renderiza con inline styles según su estado, y tiene un span al lado para mostrar el nombre del profesor
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
              <button class="hour-button" id="${alumnoId}_btn_${hora}" data-alumno="${alumnoId}" data-hora="${hora}" style="${style}">${hora}</button>
              <span class="teacher-label" id="${alumnoId}_label_${hora}" style="font-size: 0.8rem; margin-left: 0.3rem;">${activa ? salida.usuario.replace("@salesianas.org", "") : ""}</span>
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

async function mostrarVistaClase(clase) {
  updateHeader();
  const fecha = getFechaHoy();
  app.innerHTML = `<h2>👨‍🏫 Clase ${clase}</h2>`;
  app.appendChild(crearBotonVolver(mostrarVistaClases));
  
  const alumnos = alumnosPorClase[clase] || [];
  for (const nombre of alumnos) {
    const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
    const ref = doc(db, clase, alumnoId);
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
    
    const tarjeta = document.createElement("div");
    tarjeta.innerHTML = alumnoCardHTML(nombre, salidas, docData.ultimaSalida || 0, docData.totalAcumulado || 0);
    app.appendChild(tarjeta);
    
    // Asignar listener a cada botón de hora
    tarjeta.querySelectorAll(".hour-button").forEach(btn => {
      btn.onclick = async () => {
        const hora = parseInt(btn.dataset.hora);
        const existing = salidas.find(s => s.hora === hora);
        if (!existing) {
          salidas.push({ hora, usuario: usuarioActual });
        } else {
          if (existing.usuario === usuarioActual) {
            salidas = salidas.filter(s => s.hora !== hora);
          } else {
            alert("No puedes desmarcar una salida registrada por otro usuario.");
            return;
          }
        }
        await actualizarSalidas(ref, docData, fecha, salidas);
        // Actual
