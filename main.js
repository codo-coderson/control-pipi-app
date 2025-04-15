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
  Timestamp,
  onSnapshot
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

// Insertamos meta viewport y estilos para responsive
document.head.insertAdjacentHTML("beforeend", `
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      max-width: 100%;
      overflow-x: hidden;
      background-color: #5b90af; /* Fondo similar al color solicitado */
    }
    #app {
      margin-top: 7rem;
      width: 100%;
      margin: 0 auto;
      padding: 0.5rem;
      box-sizing: border-box;
      /* Mantener legibilidad con un fondo claro en el interior si se desea
         Por ahora dejamos la tipografía en negro. */
    }
    .hour-button {
      flex: 1;
      min-width: 40px;
      padding: 0.5rem;
    }
    @media (max-width: 600px) {
      .clase-btn {
        font-size: 1rem;
        padding: 0.4rem;
      }
      .hour-button {
        min-width: 35px;
        font-size: 0.85rem;
      }
    }

    /* Estilos para inputs de login más anchos y con más espacio */
    #app input[type="email"],
    #app input[type="password"] {
      width: 80%;
      padding: 0.8rem;
      margin-bottom: 1rem;
      font-size: 1rem;
    }

    .clases-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .clase-mini {
      background-color: #fff;
      border: 1px solid #ccc;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border-radius: 4px;
    }
    .clase-mini:hover {
      background-color: #f0f0f0;
    }
  </style>
`);

// --- Insertamos el header y contenedor principal ---
document.body.insertAdjacentHTML("afterbegin", `
  <div id="header" style="position: fixed; top: 0; right: 0; padding: 0.5rem; background: #fff; text-align: right; z-index: 1000; width: auto;"></div>
`);
document.body.insertAdjacentHTML("beforeend", `
  <div id="app"></div>
`);

const app = document.getElementById("app");

// --- Variables globales ---
let alumnosPorClase = {};
let clases = [];
let usuarioActual = null;

// ---------- PERSISTENCIA EN FIRESTORE ----------
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

function updateHeader() {
  const now = new Date();

  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  let diaSemana = dias[now.getDay()];
  let diaMes = now.getDate();
  let mes = meses[now.getMonth()];
  let anio = now.getFullYear();

  // Formato de fecha: "miércoles 3 de agosto de 2025"
  const fechaSistema = `${diaSemana} ${diaMes} de ${mes} de ${anio}`;

  // Formato de hora 24h sin etiqueta
  const pad = n => (n < 10 ? "0" + n : n);
  const horaSistema = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  if (usuarioActual) {
    let displayName = usuarioActual.endsWith("@salesianas.org")
      ? usuarioActual.replace("@salesianas.org", "")
      : usuarioActual;
    document.getElementById("header").innerHTML = `
      <div>${displayName}</div>
      <div>${fechaSistema}</div>
      <div>${horaSistema}</div>
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
    document.getElementById("header").innerHTML = `
      <div>${fechaSistema}</div>
      <div>${horaSistema}</div>
    `;
  }
}
setInterval(updateHeader, 1000);

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
    if (usuarioActual === "salvador.fernandez@salesianas.org") {
      // salvador se queda con el menú principal
      await mostrarMenuPrincipal();
    } else {
      // Cualquier otro usuario va directo a ver clases
      await loadDataFromFirestore();
      mostrarVistaClases();
    }
  } else {
    usuarioActual = null;
    mostrarVistaLogin();
  }
});

async function mostrarMenuPrincipal() {
  await loadDataFromFirestore();
  app.innerHTML = `
    <h2>Gestión de alumnos</h2>
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

function mostrarVistaClases() {
  let html = `<h2>Selecciona una clase</h2>
    <div style=\"display: flex; flex-wrap: wrap; gap: 1rem;\">`;
  clases.forEach(clase => {
    html += `<button class=\"clase-btn\" data-clase=\"${clase}\">🧑‍🏫 ${clase}</button>`;
  });
  html += "</div>";
  app.innerHTML = html;
  document.querySelectorAll(".clase-btn").forEach(btn => {
    btn.onclick = () => mostrarVistaClase(btn.dataset.clase);
  });
  if (usuarioActual === "salvador.fernandez@salesianas.org") {
    const btnAbajo = document.createElement("button");
    btnAbajo.textContent = "🔙 Volver";
    btnAbajo.style.marginTop = "2rem";
    btnAbajo.onclick = mostrarMenuPrincipal;
    app.appendChild(btnAbajo);
  }
}
window.mostrarVistaClases = mostrarVistaClases;

function getFechaHoy() {
  let hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(hoy);
}

// Reemplazamos la lógica con una "media de registros de los días que existan (máx 30)"
// Y en la parte superior de la clase, en lugar del botón Volver, hacemos una "fila de minibotones" para cada clase.

function alumnoCardHTML(clase, nombre, wc = []) {
  // Filtramos y ordenamos desc por fecha
  let sorted = [...wc].sort((a,b)=> b.fecha.toMillis() - a.fecha.toMillis());
  // Tomamos hasta 30
  let slice30 = sorted.slice(0,30);
  // sumamos la cantidad total de salidas en esos días
  let sumSalidas = 0;
  slice30.forEach(d => {
    sumSalidas += (d.salidas?.length || 0);
  });
  let nDias = slice30.length;
  let media = (nDias>0) ? (sumSalidas / nDias) : 0;

  // Salidas de hoy para los botones
  let todayTimestamp = getFechaHoy();
  let registroHoy = wc.find(r => r.fecha.toMillis() === todayTimestamp.toMillis());
  let salidasHoy = registroHoy ? registroHoy.salidas : [];

  const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");

  const botones = Array.from({ length: 6 }, (_, i) => {
    const hora = i + 1;
    let registro = salidasHoy.find(s => s.hora === hora);
    const activa = Boolean(registro);
    const estilo = activa
      ? 'background-color: #0044cc; color: #ff0; border: 1px solid #003399;'
      : 'background-color: #eee; color: #000; border: 1px solid #ccc;';
    const label = activa
      ? `<span style=\"font-size:0.8rem; margin-left:0.3rem;\">${registro.usuario.replace("@salesianas.org", "")}</span>`
      : "";
    return `<div style=\"display: inline-flex; align-items: center; margin-right: 0.5rem;\">\n              <button class=\"hour-button\" data-alumno=\"${alumnoId}\" data-hora=\"${hora}\" style=\"${estilo}\">${hora}</button>\n              ${label}\n            </div>`;
  }).join("");

  return `\n    <div style=\"border: 1px solid #ccc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; background-color: #fff;\">\n      <div style=\"font-weight: bold; margin-bottom: 0.5rem;\">${nombre}</div>\n      <div style=\"display: flex; flex-wrap: wrap; gap: 0.5rem;\">${botones}</div>\n      <div style=\"margin-top: 0.5rem; font-size: 0.9rem;\">\n        Media (hasta 30 días): ${media.toFixed(2)} salidas/día\n      </div>\n    </div>\n  `;
}

function renderCard(container, clase, nombre, wc = [], ref) {
  // Eliminamos salidas_acumuladas si ya no se usa.
  container.innerHTML = alumnoCardHTML(clase, nombre, wc);

  container.querySelectorAll(".hour-button").forEach(button => {
    button.addEventListener("click", async function() {
      const hora = parseInt(this.dataset.hora);

      let docSnap = await getDoc(ref);
      let dataDoc = docSnap.data();
      let current_wc = dataDoc.wc || [];

      let todayTimestamp = getFechaHoy();
      let registroHoy = current_wc.find(r => r.fecha.toMillis() === todayTimestamp.toMillis());
      let old_count = registroHoy ? registroHoy.salidas.length : 0;

      if (!registroHoy) {
        registroHoy = { fecha: todayTimestamp, salidas: [] };
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
        registroHoy.salidas.push({ hora, usuario: usuarioActual });
      }

      await updateDoc(ref, { wc: current_wc });
    });
  });
}

async function mostrarVistaClase(clase) {
  const alumnos = alumnosPorClase[clase] || [];

  // Estructura inicial
  app.innerHTML = `<h2>👨‍🏫 Clase ${clase}</h2>`;

  // Fila con todos los botones de las clases, para saltar de una a otra
  const filaClases = document.createElement("div");
  filaClases.className = "clases-row";

  // Generamos un "mini" botón por cada clase
  for (const c of clases) {
    const miniBtn = document.createElement("div");
    miniBtn.className = "clase-mini";
    miniBtn.textContent = c;
    miniBtn.onclick = () => {
      mostrarVistaClase(c);
    };
    filaClases.appendChild(miniBtn);
  }
  app.appendChild(filaClases);

  // Contenedor de tarjetas
  const contenedorTarjetas = document.createElement("div");
  app.appendChild(contenedorTarjetas);

  // Cargar docs
  const loadPromises = [];

  for (const nombre of alumnos) {
    loadPromises.push((async () => {
      const alumnoId = nombre.replace(/\s+/g, "_").replace(/,/g, "");
      const refDoc = doc(db, clase, alumnoId);
      let docSnap = await getDoc(refDoc);
      if (!docSnap.exists()) {
        await setDoc(refDoc, { nombre, wc: [] });
        docSnap = await getDoc(refDoc);
      }
      // onSnapshot realtime
      const cardContainer = document.createElement("div");
      onSnapshot(refDoc, (snapshot) => {
        if (!snapshot.exists()) {
          cardContainer.innerHTML = `<div style='color:red'>Documento borrado o inexistente</div>`;
          return;
        }
        const data = snapshot.data();
        const wc = data.wc || [];
        renderCard(cardContainer, clase, nombre, wc, refDoc);
      });
      contenedorTarjetas.appendChild(cardContainer);
    })());
  }

  await Promise.all(loadPromises);

  // Botón final "Volver" si es salvador
  if (usuarioActual === "salvador.fernandez@salesianas.org") {
    const btnFinal = document.createElement("button");
    btnFinal.textContent = "🔙 Volver";
    btnFinal.style.marginTop = "2rem";
    btnFinal.onclick = () => {
      mostrarVistaClases();
    };
    app.appendChild(btnFinal);
  }
}

window.mostrarVistaClase = mostrarVistaClase;

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
      const refDoc = doc(db, curso, alumnoId);
      const docSnap = await getDoc(refDoc);
      if (!docSnap.exists()) {
        await setDoc(refDoc, { nombre, wc: [] });
      }
    });
    clases = Object.keys(alumnosPorClase);
    setDoc(doc(db, "meta", "clases"), { clases });
    alert("Datos de alumnos cargados. Clases: " + clases.join(", "));
  });
}

function procesarProfesores(rows) {
  alert("La carga de profesores ha sido deshabilitada.");
}

function mostrarCargaExcels() {
  // No se usa.
}

function mostrarCargaAlumnos() {
  app.innerHTML = `\n    <h2>⚙️ Carga de alumnos</h2>\n    <div>\n      <h3>Alumnos (cabeceras \"Alumno\" y \"Curso\")</h3>\n      <input type=\"file\" id=\"fileAlumnos\" accept=\".xlsx,.xls\" />\n      <button id=\"cargarAlumnos\">Cargar Alumnos</button>\n    </div>\n    <button id=\"volverMenu\" style=\"margin-top:2rem;\">🔙 Volver</button>\n  `;
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
