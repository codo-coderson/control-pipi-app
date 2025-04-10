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

// --- Insertamos el header y contenedor principal ---
// El header se actualizará (solo cuando hay usuario logueado se mostrará nombre y enlace de logout).
document.body.insertAdjacentHTML("afterbegin", `
  <div id="header" style="position: fixed; top: 0; right: 0; padding: 0.5rem; background: #fff; text-align: right; z-index: 1000;"></div>
`);
document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px; margin-top: 3rem;"></div>
`);
const app = document.getElementById("app");

// --- Variables globales ---
let alumnosPorClase = {};   // Ej: { "1ESO A": ["Pérez, Juan", ...] }
let clases = [];            // Ej: ["1ESO A", "2ESO B", ...]
let usuarioActual = null;   // Se asigna al loguearse

// --- Header: se muestra solo cuando hay usuario logueado ---
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
    // Si no hay usuario, solo mostramos la hora
    document.getElementById("header").innerHTML = `<div>Hora del sistema: ${horaSistema}</div>`;
  }
}
setInterval(updateHeader, 1000);

// --- 1) AUTENTICACIÓN ---
function mostrarVistaLogin() {
  // En login no mostramos datos de usuario ni logout
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
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = user.email;
    mostrarMenuPrincipal();
  } else {
    usuarioActual = null;
    mostrarVistaLogin();
  }
});

// --- 2) MENÚ PRINCIPAL ---
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
  // Agregamos el botón de cerrar sesión
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
// Mostramos un listado de cursos con botón "Volver" arriba y abajo
function mostrarVistaClases() {
  let html = `<h2>Selecciona una clase</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 1rem;">`;
  clases.forEach(clase => {
    html += `<button class="clase-btn" data-clase="${clase}">🧑‍🏫 ${clase}</button>`;
  });
  html += `</div>`;
  const btnArriba = document.createElement("button");
  btnArriba.textContent = "🔙 Volver";
  btnArriba.style.marginBottom = "1rem";
  btnArriba.onclick = mostrarMenuPrincipal;
  app.innerHTML = btnArriba.outerHTML + html;
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
// Usamos la versión que “funcionaba” bien: cada alumno se renderiza con sus botones;
// al pulsar un botón se alterna el estado y se actualiza Firestore.
function getFechaHoy() {
  return new Date().toISOString().split("T")[0];
}

async function mostrarVistaClase(clase) {
  const alumnos = alumnosPorClase[clase] || [];
  const fecha = getFechaHoy();
  // Botón volver arriba
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
      await setDoc(ref, { nombre, historial: [] });
      docSnap = await getDoc(ref);
    }
    const data = docSnap.data();
    // Para este ejemplo, se espera que data.historial contenga objetos con {hora, usuario}.
    const registroHoy = data.historial ? data.historial.find(r => r.fecha === fecha) : null;
    const horasActivas = registroHoy ? registroHoy.horas || [] : [];
    // Renderizamos la tarjeta (sin re-renderizar toda la tarjeta en cada click, actualizamos solo el botón)
    const tarjeta = document.createElement("div");
    tarjeta.innerHTML = alumnoCardHTML(clase, nombre, horasActivas);
    app.appendChild(tarjeta);
    
    // Asignamos listener a cada botón de la tarjeta:
    tarjeta.querySelectorAll(".hour-button").forEach(btn => {
     btn.onclick = async () => {
  // Obtenemos la información actualizada del documento
  let docSnapActual = await getDoc(ref);
  let dataAct = docSnapActual.data();
  
  // Buscar el registro de hoy en el historial (suponiendo que se guarda con el campo "fecha" y "salidas")
  let registroHoy = dataAct.historial ? dataAct.historial.find(r => r.fecha === fecha) : null;
  // Si no existe, empezamos con un array vacío
  let salidas = registroHoy ? registroHoy.salidas || [] : [];
  
  const hora = parseInt(btn.dataset.hora);
  const existente = salidas.find(s => s.hora === hora);
  if (existente) {
    if (existente.usuario === usuarioActual) {
      // Quitar la salida (desmarcar)
      salidas = salidas.filter(s => s.hora !== hora);
    } else {
      alert("No puedes desmarcar una salida registrada por otro usuario.");
      return;
    }
  } else {
    salidas.push({ hora, usuario: usuarioActual });
  }
  
  // Actualizamos el historial: removemos el registro de hoy y lo reemplazamos si hay salidas
  const nuevoHistorial = (dataAct.historial || []).filter(r => r.fecha !== fecha);
  if (salidas.length > 0) {
    nuevoHistorial.push({ fecha, salidas });
  }
  await updateDoc(ref, { historial: nuevoHistorial });
  console.log(`Actualizado ${nombre}, clase ${clase}. Salidas hoy: [${salidas.map(x => x.hora).join(", ")}] por ${usuarioActual}`);
  
  // Actualizamos el botón que se pulsó:
  if (salidas.find(s => s.hora === hora)) {
    btn.classList.add("active");
    btn.style.backgroundColor = "#0044cc";
    btn.style.color = "#ff0";
    btn.style.border = "1px solid #003399";
    // Para el label, necesitarás que la estructura HTML esté tal como definimos en alumnoCardHTML; 
    // si el label se insertó en el HTML ya generado, podría ser necesario re-renderizar la tarjeta completa para actualizar los labels.
  } else {
    btn.classList.remove("active");
    btn.style.backgroundColor = "#eee";
    btn.style.color = "#000";
    btn.style.border = "1px solid #ccc";
    // Quitar el label asociado (p.ej. estableciendo su innerHTML a vacío)
    // Es recomendable re-renderizar la tarjeta completa en este caso.
  }
  
  // Opcional: Re-renderiza toda la tarjeta para asegurar que se actualice el label correctamente:
  // tarjeta.innerHTML = alumnoCardHTML(clase, nombre, salidas);
};

      aplicarEstilosBoton(btn); // Inicialmente se aplica
    });
  }
  // Botón volver abajo
  const btnAbajo = document.createElement("button");
  btnAbajo.textContent = "🔙 Volver";
  btnAbajo.style.marginTop = "2rem";
  btnAbajo.onclick = mostrarVistaClases;
  app.appendChild(btnAbajo);
}

function alumnoCardHTML(clase, nombre, salidas = []) {
  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
  // Cada "salida" es un objeto { hora, usuario }
  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    // Buscar si existe una salida para esa hora
    const salida = salidas.find(s => s.hora === hora);
    const activa = Boolean(salida);
    const style = activa
      ? 'background-color: #0044cc; color: #ff0; border: 1px solid #003399;'
      : 'background-color: #eee; color: #000; border: 1px solid #ccc;';
    // Si está activa, preparamos la etiqueta con el usuario sin el dominio:
    const label = activa ? `<span style="font-size:0.8rem; margin-left:0.3rem;">${salida.usuario.replace("@salesianas.org", "")}</span>` : "";
    return `<div style="display: inline-flex; align-items: center; margin-right: 0.5rem;">
              <button class="hour-button" data-alumno="${alumnoId}" data-hora="${hora}" style="${style}">${hora}</button>
              ${label}
            </div>`;
  }).join("");
  return `
    <div style="border:1px solid #ccc; padding:1rem; border-radius:8px; margin-bottom:1rem;">
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

// --- 5) CARGA DE EXCEL ---
// Se mantiene la versión que tenías, sin cambios significativos
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
      await setDoc(ref, { nombre, historial: [] });
    }
  });
  clases = Object.keys(alumnosPorClase);
  alert("Datos de alumnos cargados. Clases: " + clases.join(", "));
}

function procesarProfesores(rows) {
  console.log("Datos parseados de profesores:", rows);
  rows.forEach(async (cols) => {
    if (!cols || cols.length < 2) return;
    const nombreCompleto = cols[0];
    const email = cols[1];
    if (!nombreCompleto || !email) return;
    const ref = doc(db, "profesores", email);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { nombreCompleto, email });
    }
  });
  alert("Datos de profesores cargados.");
}

function mostrarCargaExcels() {
  app.innerHTML = `
    <h2>⚙️ Carga de datos desde Excel</h2>
    <div>
      <h3>Alumnos (cabeceras "Alumno" y "Curso")</h3>
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
    if(fileInput.files.length === 0) {
      alert("Selecciona un archivo de alumnos.");
      return;
    }
    const file = fileInput.files[0];
    parseExcelFile(file, true, procesarAlumnos);
  };
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
