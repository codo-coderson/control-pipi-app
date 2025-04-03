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

// Insertamos un header fijo en la esquina superior derecha
document.body.insertAdjacentHTML("afterbegin", `
  <div id="header" style="position: fixed; top: 0; right: 0; padding: 0.5rem; background: #fff; text-align: right; z-index: 1000;"></div>
`);

// == Contenedor principal en el DOM ==
document.body.insertAdjacentHTML("beforeend", `
  <div id="app" style="width:100%; max-width:700px; margin-top: 3rem;"></div>
`);
const app = document.getElementById("app");

// == Variables globales ==
let alumnosPorClase = {};   // { "1ESO A": ["Pérez, Juan", ...], "2ESO B": [...], ... }
let clases = [];            // ["1ESO A", "2ESO B", ...]
let usuarioActual = null;   // Se llenará con user.email cuando se loguee

// ------------------------------------------------------------------
// Función para actualizar el header: muestra el email (sin dominio), la hora del sistema y enlace de cerrar sesión
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
setInterval(updateHeader, 1000);

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
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = user.email;
    mostrarMenuPrincipal();
  } else {
    mostrarVistaLogin();
  }
});

// ------------------------------------------------------------------
// 2) MENÚ PRINCIPAL
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
// 3) VISTA DE CLASES Y MARCADO DE HORAS
// ------------------------------------------------------------------

// Agregamos un botón "Volver" arriba y otro abajo en la vista de clases.
function mostrarVistaClases() {
  let htmlClases = `<h2>Selecciona una clase</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 1rem;">`;
  clases.forEach(clase => {
    htmlClases += `<button class="clase-btn" data-clase="${clase}">🧑‍🏫 ${clase}</button>`;
  });
  htmlClases += `</div>`;
  // Agregamos un botón "Volver" arriba (si se desea, aunque en menú principal ya hay uno)
  const btnArriba = document.createElement("button");
  btnArriba.textContent = "🔙 Volver";
  btnArriba.style.marginBottom = "1rem";
  btnArriba.onclick = mostrarMenuPrincipal;
  
  app.innerHTML = btnArriba.outerHTML + htmlClases;
  document.querySelectorAll(".clase-btn").forEach(btn => {
    btn.onclick = () => mostrarVistaClase(btn.dataset.clase);
  });
  const btnAbajo = document.createElement("button");
  btnAbajo.textContent = "🔙 Volver";
  btnAbajo.style.marginTop = "2rem";
  btnAbajo.onclick = mostrarMenuPrincipal;
  app.appendChild(btnAbajo);
}

// Modificamos alumnoCardHTML para que cada botón de hora muestre el número y, si activo, un span con el usuario (sin dominio)
function alumnoCardHTML(clase, nombre, horasActivas = [], ultimaSalida = 0, totalAcumulado = 0) {
  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    const registro = horasActivas.find(x => x.hora === hora);
    const activa = Boolean(registro);
    const estilo = activa
      ? 'background-color: #0044cc; color: #ff0; border: 1px solid #003399;'
      : 'background-color: #eee; color: #000; border: 1px solid #ccc;';
    const label = activa ? `<span style="font-size:0.8rem; margin-left:0.3rem;">${registro.usuario.replace("@salesianas.org", "")}</span>` : "";
    return `<div style="display: inline-flex; align-items: center; margin-right: 0.5rem;">
              <button class="hour-button ${activa ? "active" : ""}" data-alumno="${alumnoId}" data-hora="${hora}" style="${estilo}">${hora}</button>
              ${label}
            </div>`;
  }).join(" ");
  return `
    <div style="border:1px solid #ccc; padding:1rem; border-radius:8px; margin-bottom:1rem;">
      <div style="font-weight:bold; margin-bottom:0.5rem;">${nombre}</div>
      <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">${botones}</div>
      <div style="margin-top:0.5rem; font-size:0.9rem;">
         Último día: ${ultimaSalida || 0} salidas. Total acumulado: ${totalAcumulado || 0} salidas.
      </div>
    </div>
  `;
}

// Función para obtener la fecha actual en formato YYYY-MM-DD
function getFechaHoy() {
  return new Date().toISOString().split("T")[0];
}

// Función que, si la hora actual es ≥14:30, revisa el registro de hoy en el historial y lo “finaliza”
// Guardando en el documento los valores de última salida y total acumulado y eliminando el registro de hoy.
async function checkAndResetSalidas(docData, ref) {
  const fecha = getFechaHoy();
  const now = new Date();
  if (now.getHours() > 14 || (now.getHours() === 14 && now.getMinutes() >= 30)) {
    const registro = docData.historial ? docData.historial.find(r => r.fecha === fecha) : null;
    if (registro) {
      const count = registro.salidas.length;
      const nuevaUltima = count;
      const nuevoTotal = (docData.totalAcumulado || 0) + count;
      // Actualizamos en Firestore y eliminamos el registro de hoy
      const nuevoHistorial = docData.historial.filter(r => r.fecha !== fecha);
      await updateDoc(ref, {
        historial: nuevoHistorial,
        ultimaSalida: nuevaUltima,
        totalAcumulado: nuevoTotal
      });
      docData.historial = nuevoHistorial;
      docData.ultimaSalida = nuevaUltima;
      docData.totalAcumulado = nuevoTotal;
    }
  }
  return docData;
}

async function mostrarVistaClase(clase) {
  const alumnos = alumnosPorClase[clase] || [];
  const fecha = getFechaHoy();
  // Agregamos un botón "Volver" arriba
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
    let data = docSnap.data();
    data = await checkAndResetSalidas(data, ref);
    // Aquí, en lugar de esperar que data.historial contenga un array de números, esperamos array de objetos: [{hora:1, usuario: ...}, ...]
    const registroHoy = data.historial ? data.historial.find(r => r.fecha === fecha) : null;
    const horasActivas = registroHoy ? registroHoy.salidas : [];
    const tarjeta = document.createElement("div");
    tarjeta.innerHTML = alumnoCardHTML(clase, nombre, horasActivas, data.ultimaSalida, data.totalAcumulado);
    app.appendChild(tarjeta);
    
    tarjeta.querySelectorAll(".hour-button").forEach(btn => {
      btn.onclick = async () => {
        // Primero, volvemos a obtener la información actualizada
        let docSnapActual = await getDoc(ref);
        let dataActual = docSnapActual.data();
        dataActual = await checkAndResetSalidas(dataActual, ref);
        let registroActual = dataActual.historial ? dataActual.historial.find(r => r.fecha === fecha) : null;
        let salidas = registroActual ? registroActual.salidas : [];
        const hora = parseInt(btn.dataset.hora);
        const existente = salidas.find(x => x.hora === hora);
        if (!existente) {
          // Registrar la salida con el usuario actual
          salidas.push({ hora, usuario: usuarioActual });
        } else {
          // Solo se puede desmarcar si fue registrado por el mismo usuario
          if (existente.usuario === usuarioActual) {
            salidas = salidas.filter(x => x.hora !== hora);
          } else {
            alert("No puedes desmarcar una salida registrada por otro usuario.");
            return;
          }
        }
        // Actualizamos el historial para el día de hoy
        const nuevoHistorial = dataActual.historial ? dataActual.historial.filter(r => r.fecha !== fecha) : [];
        if (salidas.length > 0) {
          nuevoHistorial.push({ fecha, salidas });
        }
        await updateDoc(ref, { historial: nuevoHistorial });
        console.log(`✅ Guardado: ${nombre}, clase ${clase}, salidas: [${salidas.map(x=>x.hora).join(", ")}], por ${usuarioActual}`);
        // Re-renderizamos la tarjeta actualizada
        const nuevoHTML = alumnoCardHTML(clase, nombre, salidas, dataActual.ultimaSalida, dataActual.totalAcumulado);
        tarjeta.innerHTML = nuevoHTML;
        // Reasignamos el listener a los botones recién generados
        tarjeta.querySelectorAll(".hour-button").forEach(nuevoBtn => {
          nuevoBtn.onclick = btn.onclick;
        });
      };
    });
  }
  // Botón "Volver" abajo
  const btnAbajo = document.createElement("button");
  btnAbajo.textContent = "🔙 Volver";
  btnAbajo.style.marginTop = "2rem";
  btnAbajo.onclick = mostrarVistaClases;
  app.appendChild(btnAbajo);
}
window.mostrarVistaClase = mostrarVistaClase;

// ------------------------------------------------------------------
// 4) LECTURA DE EXCEL (SheetJS) - DIFERENCIANDO ALUMNOS (con cabecera) Y PROFESORES (sin cabecera)
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
      json = XLSX.utils.sheet_to_json(sheet);
    } else {
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
    const nombre = row.Alumno;
    const curso = row.Curso;
    if (!nombre || !curso) {
      console.log("Fila sin 'Alumno' o 'Curso':", row);
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
  alert("Datos de alumnos cargados. Clases encontradas:\n" + clases.join(", "));
}

// == Procesar PROFESORES (sin cabeceras: columna 1 = "Apellidos, Nombre", columna 2 = "Email") ==
function procesarProfesores(rows) {
  console.log("Datos parseados de profesores:", rows);
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

// ------------------------------------------------------------------
// 5) VISTA PARA CARGAR EXCELS
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

// ------------------------------------------------------------------
// FIN: onAuthStateChanged gestiona la vista inicial
// ------------------------------------------------------------------
