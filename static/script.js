let isLogin = true;

function showAdmin() { document.getElementById('authModal').style.display = 'flex'; }
function closeModal() { document.getElementById('authModal').style.display = 'none'; }
function toggleAuth() { 
    isLogin = !isLogin; 
    document.getElementById('authTitle').innerText = isLogin ? "LOG IN" : "SIGN UP"; 
}

async function handleAuth() {
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;
    const path = isLogin ? '/login' : '/signup';
    
    const res = await fetch(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: user, password: pass})
    });

    if (res.ok) {
        if (isLogin) {
            localStorage.setItem('ua_session', 'true');
            location.reload();
        } else {
            alert("ACCOUNT CREATED");
            toggleAuth();
        }
    } else { alert("ACCESS DENIED"); }
}

async function fetchProducts() {
    const res = await fetch('/products');
    const data = await res.json();
    const isAdmin = localStorage.getItem('ua_session');
    
    document.getElementById('productGrid').innerHTML = data.map(p => `
        <div class="product-card">
            <img src="${p.image_url}" onerror="this.src='/static/images/logo.png'">
            <h3>${p.name}</h3>
            <p>PHP ${p.price.toLocaleString()}</p>
            ${isAdmin ? `<button onclick="deleteProduct('${p.name}')" class="delete-btn">REMOVE</button>` : ''}
        </div>
    `).join('');
}

async function deleteProduct(name) {
    if(confirm(`Delete ${name}?`)) {
        await fetch(`/products/${encodeURIComponent(name)}`, { method: 'DELETE' });
        fetchProducts();
    }
}

async function saveProduct() {
    const p = {
        name: document.getElementById('pName').value,
        price: parseFloat(document.getElementById('pPrice').value),
        image_url: document.getElementById('pImg').value
    };
    await fetch('/products', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p)});
    fetchProducts();
}

function logout() { localStorage.removeItem('ua_session'); location.reload(); }

if (localStorage.getItem('ua_session')) document.getElementById('adminPanel').style.display = 'block';
fetchProducts();