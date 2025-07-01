// Importar solo si usas módulos (ESM). Si usas <script> en HTML, ignora los imports y usa firebase.initializeApp como antes.
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

// Configuración de Firebase SOLO para unity-bab89
const firebaseConfig = {
    apiKey: "AIzaSyDV20n245vpUObz_0Q1j7U-aNlLnu1F4LM",
    authDomain: "unity-bab89.firebaseapp.com",
    databaseURL: "https://unity-bab89-default-rtdb.firebaseio.com",
    projectId: "unity-bab89",
    storageBucket: "unity-bab89.firebasestorage.app",
    messagingSenderId: "283686167400",
    appId: "1:283686167400:web:2a968f18119f720c37acdd",
    measurementId: "G-V1S3D8S9FW"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Mostrar información de usuario en el header
definirHeaderUsuario = (user) => {
    const nav = document.querySelector('header nav');
    let userInfo = document.getElementById('userInfo');
    if (!userInfo) {
        userInfo = document.createElement('div');
        userInfo.id = 'userInfo';
        userInfo.style.display = 'inline-block';
        userInfo.style.marginLeft = '1rem';
        nav.appendChild(userInfo);
    }
    if (user) {
        let avatar = user.photoURL && user.photoURL !== '' && user.photoURL !== 'null'
            ? `<img src="${user.photoURL}" alt="avatar" style="width:32px;height:32px;border-radius:50%;vertical-align:middle;border:2px solid #7c3aed;object-fit:cover;">`
            : `<div style="width:32px;height:32px;border-radius:50%;background:#e0e7ff;display:inline-flex;align-items:center;justify-content:center;border:2px solid #7c3aed;"><svg width='18' height='18' fill='none' viewBox='0 0 24 24'><circle cx='12' cy='8' r='6' fill='#a5b4fc'/><path d='M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4' fill='#a5b4fc'/></svg></div>`;
        userInfo.innerHTML = `<span id="miPerfil" style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;">${avatar} <span>${user.displayName}</span></span>`;
        userInfo.style.display = 'inline-block';
        // Listener para ver tu propio perfil
        document.getElementById('miPerfil').onclick = () => mostrarPerfilUsuario(user.uid);
    } else {
        userInfo.innerHTML = '';
        userInfo.style.display = 'none';
    }
};

document.getElementById('loginBtn').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Usuario autenticado
        })
        .catch((error) => {
            alert('Error al iniciar sesión: ' + error.message);
        });
};

document.getElementById('logoutBtn').onclick = () => {
    auth.signOut();
};

// Guardar/actualizar perfil de usuario en Firestore
function guardarPerfilUsuario(user) {
    if (!user) return;
    db.collection('users').doc(user.uid).set({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        creado: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

// Mostrar/ocultar header y bienvenida según autenticación
function mostrarUIAutenticado(autenticado) {
    document.getElementById('mainHeader').style.display = autenticado ? 'flex' : 'none';
    document.getElementById('welcome').style.display = autenticado ? 'none' : 'flex';
    document.getElementById('main-content').style.display = autenticado ? 'block' : 'none';
    if (autenticado) {
        document.getElementById('searchUser').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'inline-block';
    } else {
        document.getElementById('searchUser').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    }
}

// Botón de login en pantalla de bienvenida
const loginBtnWelcome = document.getElementById('loginBtnWelcome');
if (loginBtnWelcome) {
    loginBtnWelcome.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .catch((error) => {
                alert('Error al iniciar sesión: ' + error.message);
            });
    };
}

auth.onAuthStateChanged((user) => {
    usuarioActual = user;
    mostrarUIAutenticado(!!user);
    if (user) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        definirHeaderUsuario(user);
        guardarPerfilUsuario(user);
        postSection.style.display = 'block';
        cargarPublicaciones();
    } else {
        document.getElementById('loginBtn').style.display = 'inline-block';
        definirHeaderUsuario(null);
        postSection.style.display = 'none';
        feed.innerHTML = '';
    }
});

// --- Publicaciones ---
const postSection = document.getElementById('post-section');
const postForm = document.getElementById('postForm');
const postContent = document.getElementById('postContent');
const feed = document.getElementById('feed');

// Elimina listeners duplicados y asegura que todo se muestre correctamente
// Solo un listener global para el usuario actual y la UI
let usuarioActual = null;
auth.onAuthStateChanged((user) => {
    usuarioActual = user;
    mostrarUIAutenticado(!!user);
    if (user) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        definirHeaderUsuario(user);
        guardarPerfilUsuario(user);
        postSection.style.display = 'block';
        cargarPublicaciones();
    } else {
        document.getElementById('loginBtn').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'none';
        definirHeaderUsuario(null);
        postSection.style.display = 'none';
        feed.innerHTML = '';
    }
});

// Crear publicación
async function dbPost(user, content) {
    return db.collection('posts').add({
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        content,
        imageUrl: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

if (postForm) {
    postForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!usuarioActual) return;
        const content = postContent.value.trim();
        if (!content) return;
        await dbPost(usuarioActual, content);
        postContent.value = '';
    };
}

// --- Comentarios ---
function renderizarComentarios(postId, comentariosDiv) {
    db.collection('posts').doc(postId).collection('comentarios').orderBy('createdAt', 'asc')
        .onSnapshot((snapshot) => {
            comentariosDiv.innerHTML = '';
            snapshot.forEach((doc) => {
                const comentario = doc.data();
                let avatar = comentario.photoURL && comentario.photoURL !== '' && comentario.photoURL !== 'null'
                    ? `<img src="${comentario.photoURL}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
                    : `<div style="width:32px;height:32px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;border:1px solid #7c3aed;"><svg width='14' height='14' fill='none' viewBox='0 0 24 24'><circle cx='12' cy='8' r='6' fill='#a5b4fc'/><path d='M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4' fill='#a5b4fc'/></svg></div>`;
                const div = document.createElement('div');
                div.className = 'comentario';
                div.innerHTML = `
                    <div style="display:flex;align-items:center;gap:6px;">
                        ${avatar}
                        <b>${comentario.displayName}</b>
                        <span style="color:#888;font-size:0.8em;">${comentario.createdAt?.toDate ? comentario.createdAt.toDate().toLocaleString() : ''}</span>
                    </div>
                    <p style="margin:2px 0 8px 0;">${comentario.content}</p>
                `;
                comentariosDiv.appendChild(div);
            });
            // Siempre agregar el formulario si el usuario está autenticado
            if (usuarioActual) {
                agregarFormularioComentario(postId, usuarioActual, comentariosDiv);
            }
        });
}

function agregarFormularioComentario(postId, user, comentariosDiv) {
    if (!user) return;
    const form = document.createElement('form');
    form.style.marginTop = '6px';
    form.innerHTML = `
        <input type="text" placeholder="Escribe un comentario..." required style="width:70%;padding:4px;">
        <button type="submit">Comentar</button>
    `;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        const content = input.value.trim();
        if (!content) return;
        await db.collection('posts').doc(postId).collection('comentarios').add({
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        input.value = '';
    };
    comentariosDiv.appendChild(form);
}

// --- Reacciones (Me gusta) ---
function renderizarReacciones(postId, reaccionesDiv, user) {
    const likesRef = db.collection('posts').doc(postId).collection('likes');
    likesRef.onSnapshot((snapshot) => {
        const total = snapshot.size;
        let yaLike = false;
        snapshot.forEach(doc => {
            if (user && doc.id === user.uid) yaLike = true;
        });
        reaccionesDiv.innerHTML = `
            <button id="likeBtn-${postId}" style="background:${yaLike ? '#2d72d9' : '#eee'};color:${yaLike ? '#fff':'#333'};border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">👍 Me gusta (${total})</button>
        `;
        const btn = document.getElementById(`likeBtn-${postId}`);
        if (user) {
            btn.onclick = async () => {
                const likeDoc = likesRef.doc(user.uid);
                if (yaLike) {
                    await likeDoc.delete();
                } else {
                    await likeDoc.set({
                        uid: user.uid,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                }
            };
        } else {
            btn.disabled = true;
        }
    });
}

// Modificar cargarPublicaciones para incluir reacciones
function cargarPublicaciones() {
    db.collection('posts').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        feed.innerHTML = '';
        snapshot.forEach((doc) => {
            const post = doc.data();
            let avatar = post.photoURL && post.photoURL !== '' && post.photoURL !== 'null'
                ? `<img src="${post.photoURL}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
                : `<div style="width:32px;height:32px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;border:2px solid #7c3aed;"><svg width='16' height='16' fill='none' viewBox='0 0 24 24'><circle cx='12' cy='8' r='6' fill='#a5b4fc'/><path d='M4 20c0-3.31 4.03-6 8-6s8 2.69 8 6' fill='#a5b4fc'/></svg></div>`;
            const div = document.createElement('div');
            div.className = 'post';
            div.innerHTML = `
                <div style=\"display:flex;align-items:center;gap:8px;\">
                    ${avatar}
                    <b><a href="#" class="user-link" data-uid="${post.uid}">${post.displayName}</a></b>
                    <span style=\"color:#888;font-size:0.9em;\">${post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : ''}</span>
                </div>
                <p>${post.content || ''}</p>
            `;
            // Sección de reacciones
            const reaccionesDiv = document.createElement('div');
            reaccionesDiv.className = 'reacciones';
            renderizarReacciones(doc.id, reaccionesDiv, auth.currentUser);
            div.appendChild(reaccionesDiv);
            // Sección de comentarios
            const comentariosDiv = document.createElement('div');
            comentariosDiv.className = 'comentarios';
            renderizarComentarios(doc.id, comentariosDiv);
            if (auth.currentUser) {
                agregarFormularioComentario(doc.id, auth.currentUser, comentariosDiv);
            }
            div.appendChild(comentariosDiv);
            feed.appendChild(div);
        });
    });
}

// --- Chat privado ---
function abrirChatCon(uid, displayName) {
    let chatDiv = document.getElementById('chatDiv');
    if (!chatDiv) {
        chatDiv = document.createElement('div');
        chatDiv.id = 'chatDiv';
        // Responsivo: ancho completo en móvil
        if (window.innerWidth <= 600) {
          chatDiv.style.position = 'fixed';
          chatDiv.style.bottom = '0';
          chatDiv.style.left = '0';
          chatDiv.style.right = '0';
          chatDiv.style.width = '99vw';
          chatDiv.style.maxWidth = '99vw';
          chatDiv.style.borderRadius = '10px 10px 0 0';
          chatDiv.style.top = '';
          chatDiv.style.transform = '';
          chatDiv.style.minWidth = '0';
        } else {
          chatDiv.style.position = 'fixed';
          chatDiv.style.bottom = '80px';
          chatDiv.style.right = '30px';
          chatDiv.style.width = '320px';
          chatDiv.style.borderRadius = '8px';
          chatDiv.style.left = '';
        }
        chatDiv.style.background = '#fff';
        chatDiv.style.border = '1px solid #ccc';
        chatDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        chatDiv.style.zIndex = '1000';
        chatDiv.innerHTML = '';
        document.body.appendChild(chatDiv);
    }
    chatDiv.innerHTML = `<div style='background:#2d72d9;color:#fff;padding:8px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;'>
        <span>Chat con ${displayName}</span>
        <button id='cerrarChatBtn' style='background:none;border:none;color:#fff;font-size:1.2em;cursor:pointer;'>&times;</button>
    </div>
    <div id='mensajesChat' style='height:200px;overflow-y:auto;padding:8px;'></div>
    <form id='formChat' style='display:flex;border-top:1px solid #eee;'>
        <input id='inputChat' type='text' placeholder='Escribe un mensaje...' style='flex:1;padding:8px;border:none;'>
        <button type='submit' style='background:#2d72d9;color:#fff;border:none;padding:8px 12px;cursor:pointer;'>Enviar</button>
    </form>`;
    document.getElementById('cerrarChatBtn').onclick = () => chatDiv.remove();
    const mensajesDiv = document.getElementById('mensajesChat');
    const formChat = document.getElementById('formChat');
    const inputChat = document.getElementById('inputChat');
    const user = auth.currentUser;
    if (!user) return;
    // ID único para el chat entre dos usuarios
    const chatId = [user.uid, uid].sort().join('_');
    // Escuchar mensajes en tiempo real
    db.collection('chats').doc(chatId).collection('mensajes').orderBy('createdAt').onSnapshot(snap => {
        mensajesDiv.innerHTML = '';
        snap.forEach(doc => {
            const msg = doc.data();
            const align = msg.uid === user.uid ? 'right' : 'left';
            const color = msg.uid === user.uid ? '#e0f0ff' : '#f4f4f4';
            mensajesDiv.innerHTML += `<div style='text-align:${align};margin:4px 0;'><span style='display:inline-block;background:${color};padding:6px 12px;border-radius:12px;'>${msg.content}</span></div>`;
        });
        mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
    });
    formChat.onsubmit = async (e) => {
        e.preventDefault();
        const content = inputChat.value.trim();
        if (!content) return;
        await db.collection('chats').doc(chatId).collection('mensajes').add({
            uid: user.uid,
            displayName: user.displayName,
            content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        inputChat.value = '';
    };
}

// --- Perfil de usuario (modal mejorado y editable) ---
function mostrarPerfilUsuario(uid) {
    db.collection('users').doc(uid).get().then(userDoc => {
        const userData = userDoc.data();
        db.collection('posts').where('uid', '==', uid).orderBy('createdAt', 'desc').get().then(snapshot => {
            let posts = [];
            snapshot.forEach(doc => {
                posts.push(doc.data());
            });
            let perfilDiv = document.getElementById('perfilDiv');
            if (!perfilDiv) {
                perfilDiv = document.createElement('div');
                perfilDiv.id = 'perfilDiv';
                perfilDiv.style.position = 'fixed';
                // Responsivo: ancho completo en móvil
                if (window.innerWidth <= 600) {
                  perfilDiv.style.width = '99vw';
                  perfilDiv.style.maxWidth = '99vw';
                  perfilDiv.style.left = '50%';
                  perfilDiv.style.transform = 'translate(-50%, -50%)';
                  perfilDiv.style.borderRadius = '10px';
                  perfilDiv.style.padding = '0';
                  perfilDiv.style.top = '50%';
                  perfilDiv.style.maxHeight = '95vh';
                  perfilDiv.style.overflowY = 'auto';
                } else {
                  perfilDiv.style.width = '390px';
                  perfilDiv.style.maxHeight = '85vh';
                  perfilDiv.style.overflowY = 'auto';
                  perfilDiv.style.left = '50%';
                  perfilDiv.style.transform = 'translate(-50%, -50%)';
                  perfilDiv.style.borderRadius = '24px';
                  perfilDiv.style.padding = '';
                  perfilDiv.style.top = '50%';
                }
                perfilDiv.style.zIndex = '3000';
                document.body.appendChild(perfilDiv);
            }
            // Si es tu propio perfil, permite editar bio
            const esPropio = auth.currentUser && auth.currentUser.uid === uid;
            let bioHtml = '';
            if (esPropio) {
                bioHtml = `<div style='margin-bottom:1em;'>
                    <textarea id='bioInput' style='width:100%;border-radius:8px;border:1px solid #b3e0ff;padding:0.5em 1em;font-size:1em;resize:none;' rows='2' placeholder='Agrega una biografía...'>${userData && userData.bio ? userData.bio : ''}</textarea>
                    <button id='guardarBioBtn' style='margin-top:0.5em;background:#1da1f2;color:#fff;border:none;border-radius:999px;padding:0.4em 1.2em;font-size:1em;font-weight:bold;cursor:pointer;'>Guardar bio</button>
                </div>`;
            } else if (userData && userData.bio) {
                bioHtml = `<div class='perfil-bio'>${userData.bio}</div>`;
            }
            // Avatar con fallback SVG si no hay foto
            let avatarHtml = (userData && userData.photoURL && userData.photoURL !== '' && userData.photoURL !== 'null')
                ? `<img src='${userData.photoURL}' style='width:32px;height:32px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.08);object-fit:cover;'>`
                : `<div style='width:32px;height:32px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.08);'><svg width='18' height='18' fill='none' viewBox='0 0 24 24'><circle cx='12' cy='8' r='6' fill='#a5b4fc'/><path d='M4 20c0-3.31 4.03-6 8-6s8 2.69 8 6' fill='#a5b4fc'/></svg></div>`;
            perfilDiv.innerHTML = `
                <div style='background:linear-gradient(90deg,#1da1f2 60%,#0d8ddb 100%);color:#fff;padding:18px 20px 12px 20px;border-radius:24px 24px 0 0;display:flex;align-items:center;gap:18px;position:relative;'>
                    ${avatarHtml}
                    <div>
                        <b style='font-size:1.3em;'>${userData ? userData.displayName : 'Usuario'}</b><br>
                        <span style='font-size:0.98em;color:#e0e0e0;'>${userData ? userData.email : ''}</span>
                    </div>
                    <button id='cerrarPerfilBtn' style='margin-left:auto;background:#fff;border:none;color:#7c3aed;font-size:2.2em;cursor:pointer;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px #7c3aed20;position:absolute;top:12px;right:12px;z-index:10;' title='Cerrar'>&times;</button>
                </div>
                <div style='padding:18px;'>
                    ${bioHtml}
                    <h4 style='margin:8px 0 12px 0;'>Publicaciones</h4>
                    <div>
                        ${posts.length === 0 ? '<p style="color:#888;">Sin publicaciones.</p>' : posts.map(p => `<div style='background:#f5f8fa;border-radius:12px;padding:0.7em 1em;margin-bottom:0.7em;'><span style='color:#888;font-size:0.85em;'>${p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : ''}</span><br><span style='font-size:1.05em;'>${p.content || ''}</span>${p.imageUrl ? `<img src='${p.imageUrl}' style='width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin-top:0.5em;'>` : ''}</div>`).join('')}
                    </div>
                    <button id='cerrarPerfilBtnAbajo' style='margin:2em auto 0 auto;display:block;background:#7c3aed;color:#fff;border:none;border-radius:999px;padding:0.7em 2.5em;font-size:1.1em;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px #7c3aed20;'>Cerrar</button>
                </div>
            `;
            document.getElementById('cerrarPerfilBtn').onclick = () => perfilDiv.remove();
            document.getElementById('cerrarPerfilBtnAbajo').onclick = () => perfilDiv.remove();
            if (esPropio && document.getElementById('guardarBioBtn')) {
                document.getElementById('guardarBioBtn').onclick = async () => {
                    const bio = document.getElementById('bioInput').value.trim();
                    await db.collection('users').doc(uid).set({ bio }, { merge: true });
                    mostrarPerfilUsuario(uid);
                };
            }
        });
    });
}
window.mostrarPerfilUsuario = mostrarPerfilUsuario;
// Delegar click en enlaces de usuario para abrir perfil (siempre, sin timeout)
document.addEventListener('DOMContentLoaded', function() {
    const feed = document.getElementById('feed');
    if (feed) {
        feed.addEventListener('click', function(e) {
            let target = e.target;
            if (target.closest('a.user-link')) {
                target = target.closest('a.user-link');
                e.preventDefault();
                const uid = target.getAttribute('data-uid');
                if (typeof window.mostrarPerfilUsuario === 'function') {
                    window.mostrarPerfilUsuario(uid);
                } else {
                    alert('No se pudo abrir el perfil. Función no encontrada.');
                }
            }
        });
    }
});

// --- Búsqueda de usuarios (ahora desde 'users') ---
const searchInput = document.getElementById('searchUser');
const searchResults = document.getElementById('searchResults');

if (searchInput) {
    searchInput.addEventListener('input', async function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            searchResults.innerHTML = '';
            return;
        }
        // Buscar usuarios por nombre en la colección 'users'
        const snapshot = await db.collection('users')
            .orderBy('displayName')
            .startAt(query)
            .endAt(query + '\uf8ff')
            .limit(10)
            .get();
        const arr = [];
        snapshot.forEach(doc => {
            const u = doc.data();
            arr.push(u);
        });
        if (arr.length === 0) {
            searchResults.innerHTML = '<div style="padding:8px;color:#888;">Sin resultados</div>';
        } else {
            searchResults.innerHTML = arr.map(u => `
                <div class="search-user-item" data-uid="${u.uid}" style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;">
                    <img src="${u.photoURL}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
                    <span>${u.displayName}</span>
                </div>
            `).join('');
        }
        searchResults.style.display = 'block';
        const rect = searchInput.getBoundingClientRect();
        searchResults.style.left = rect.left + 'px';
        searchResults.style.top = (rect.bottom + window.scrollY) + 'px';
        searchResults.style.width = rect.width + 'px';
    });
    // Click en resultado
    searchResults.addEventListener('click', function(e) {
        const item = e.target.closest('.search-user-item');
        if (item) {
            const uid = item.getAttribute('data-uid');
            mostrarPerfilUsuario(uid);
            searchResults.style.display = 'none';
            searchInput.value = '';
        }
    });
    // Ocultar resultados al perder foco
    document.addEventListener('click', function(e) {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });
}

// --- Login y registro con email/contraseña y Google ---
const loginBtnGoogle = document.getElementById('loginBtnGoogle');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPass');
const loginError = document.getElementById('loginError');
const registerForm = document.getElementById('registerForm');
const registerEmail = document.getElementById('registerEmail');
const registerPass = document.getElementById('registerPass');
const registerName = document.getElementById('registerName');
const registerError = document.getElementById('registerError');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

if (loginBtnGoogle) {
    loginBtnGoogle.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .catch((error) => {
                alert('Error al iniciar sesión: ' + error.message);
            });
    };
}
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';
        try {
            await auth.signInWithEmailAndPassword(loginEmail.value, loginPass.value);
        } catch (err) {
            loginError.textContent = 'Correo o contraseña incorrectos.';
            loginError.style.display = 'block';
        }
    };
}
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        registerError.style.display = 'none';
        try {
            const cred = await auth.createUserWithEmailAndPassword(registerEmail.value, registerPass.value);
            await cred.user.updateProfile({ displayName: registerName.value });
            await guardarPerfilUsuario({
                uid: cred.user.uid,
                displayName: registerName.value,
                email: cred.user.email,
                photoURL: cred.user.photoURL || '',
            });
        } catch (err) {
            registerError.textContent = 'Error al registrar: ' + (err.message.includes('email-already-in-use') ? 'El correo ya está registrado.' : 'Verifica los datos.');
            registerError.style.display = 'block';
        }
    };
}
if (showRegister) {
    showRegister.onclick = (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    };
}
if (showLogin) {
    showLogin.onclick = (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'flex';
    };
}

document.addEventListener('DOMContentLoaded', function() {
    const feed = document.getElementById('feed');
    if (feed) {
        feed.addEventListener('click', function(e) {
            let target = e.target;
            if (target.closest('a.user-link')) {
                target = target.closest('a.user-link');
                e.preventDefault();
                const uid = target.getAttribute('data-uid');
                console.log('Abriendo perfil de usuario:', uid);
                mostrarPerfilUsuario(uid);
            }
        });
    }
});

// Mostrar usuarios en el aside derecho
function mostrarUsuariosAside() {
    const aside = document.getElementById('usersAside');
    const usersList = document.getElementById('usersList');
    if (!aside || !usersList) return;
    db.collection('users').orderBy('displayName').onSnapshot(snap => {
        usersList.innerHTML = '';
        snap.forEach(doc => {
            const u = doc.data();
            if (!u.displayName) return;
            const div = document.createElement('div');
            div.className = 'user-card';
            let avatar = u.photoURL && u.photoURL !== '' && u.photoURL !== 'null'
                ? `<img src="${u.photoURL}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
                : `<div class="user-avatar-placeholder" style="width:32px;height:32px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;border:2.5px solid #7c3aed;"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6" fill="#a5b4fc"/><path d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4" fill="#a5b4fc"/></svg></div>`;
            div.innerHTML = `${avatar}<span>${u.displayName}</span> <button class='user-msg-btn' style='margin-left:auto;background:linear-gradient(90deg,#a5b4fc 0%,#6366f1 100%);color:#fff;font-weight:bold;border:none;border-radius:999px;padding:0.4em 1.1em;font-size:1em;box-shadow:0 2px 8px #7c3aed20;cursor:pointer;'>Mensaje</button>`;
            div.onclick = (e) => {
                if (e.target.classList.contains('user-msg-btn')) {
                    e.stopPropagation();
                    abrirChatCon(u.uid, u.displayName);
                } else {
                    mostrarPerfilUsuario(u.uid);
                }
            };
            usersList.appendChild(div);
        });
        aside.style.display = snap.size > 0 ? 'block' : 'none';
    });
}
// Mostrar aside solo si autenticado
function mostrarAsideSiAutenticado(autenticado) {
    const aside = document.getElementById('usersAside');
    if (aside) aside.style.display = autenticado ? 'block' : 'none';
    if (autenticado) mostrarUsuariosAside();
}
// Modificar mostrarUIAutenticado para aside
const oldMostrarUIAutenticado = mostrarUIAutenticado;
mostrarUIAutenticado = function(autenticado) {
    oldMostrarUIAutenticado(autenticado);
    mostrarAsideSiAutenticado(autenticado);
}

// Cambiar nombre de la red social a Unify en mensajes, títulos y referencias
// Si hay algún lugar donde se muestre el nombre de la red social, usar 'Unify'
// Por ejemplo, si se usa en notificaciones, modales, etc.

// --- EMOJIS EN EL POST Y COMENTARIOS ---
window.addEventListener('DOMContentLoaded', () => {
    // Para el textarea de publicaciones
    const postContent = document.getElementById('postContent');
    if (postContent) {
        const emojiBtn = document.createElement('button');
        emojiBtn.type = 'button';
        emojiBtn.innerText = '😀';
        emojiBtn.title = 'Agregar emoji';
        emojiBtn.style.marginLeft = '8px';
        emojiBtn.style.fontSize = '1.3em';
        emojiBtn.style.background = 'none';
        emojiBtn.style.border = 'none';
        emojiBtn.style.cursor = 'pointer';
        emojiBtn.style.verticalAlign = 'middle';
        postContent.parentNode.insertBefore(emojiBtn, postContent.nextSibling);
        const picker = new EmojiButton({ position: 'top-end', zIndex: 9999 });
        emojiBtn.addEventListener('click', () => picker.togglePicker(emojiBtn));
        picker.on('emoji', emoji => {
            postContent.value += emoji;
            postContent.focus();
        });
    }
    // Para los comentarios (delegación)
    document.body.addEventListener('focusin', function(e) {
        if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text' && e.target.closest('.comentarios')) {
            let input = e.target;
            if (!input.nextSibling || !input.nextSibling.classList || !input.nextSibling.classList.contains('emoji-btn')) {
                const emojiBtn = document.createElement('button');
                emojiBtn.type = 'button';
                emojiBtn.innerText = '😀';
                emojiBtn.title = 'Agregar emoji';
                emojiBtn.className = 'emoji-btn';
                emojiBtn.style.marginLeft = '6px';
                emojiBtn.style.fontSize = '1.1em';
                emojiBtn.style.background = 'none';
                emojiBtn.style.border = 'none';
                emojiBtn.style.cursor = 'pointer';
                emojiBtn.style.verticalAlign = 'middle';
                input.parentNode.insertBefore(emojiBtn, input.nextSibling);
                const picker = new EmojiButton({ position: 'top-end', zIndex: 9999 });
                emojiBtn.addEventListener('click', () => picker.togglePicker(emojiBtn));
                picker.on('emoji', emoji => {
                    input.value += emoji;
                    input.focus();
                });
            }
        }
    });
});
