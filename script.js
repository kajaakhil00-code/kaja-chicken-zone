const firebaseConfig = {
  apiKey: "AIzaSyCNiYPiici8jXntfa3L7yhaashHEqmgzGo",
  authDomain: "fresh-chicken-d404f.firebaseapp.com",
  projectId: "fresh-chicken-d404f",
  storageBucket: "fresh-chicken-d404f.appspot.com",
  messagingSenderId: "241407573599",
  appId: "1:241407573599:web:62ef38ddcf4341adcee5ea",
  measurementId: "G-B7CBGLJQR5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let cart = [];

// Setup reCAPTCHA for Phone Authentication
function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'normal',
            'callback': (response) => {
                // reCAPTCHA solved
            }
        }, auth);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setupRecaptcha();
});

// Send OTP
function sendOTP() {
    let phoneNumber = document.getElementById('user-phone').value.trim();
    if (phoneNumber.length !== 10) {
        alert("Please enter a valid 10-digit mobile number!");
        return;
    }

    let formattedPhoneNumber = "+91" + phoneNumber;
    let appVerifier = window.recaptchaVerifier;

    auth.signInWithPhoneNumber(formattedPhoneNumber, appVerifier)
        .then((confirmationResult) => {
            window.confirmationResult = confirmationResult;
            alert("OTP sent successfully to " + phoneNumber);
            document.getElementById('phone-input-box').classList.add('hidden-form');
            document.getElementById('otp-input-box').classList.remove('hidden-form');
        }).catch((error) => {
            console.error("SMS not sent", error);
            alert("Error sending OTP: " + error.message);
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then((widgetId) => {
                    grecaptcha.reset(widgetId);
                });
            }
        });
}

// Verify OTP
function verifyOTP() {
    let code = document.getElementById('user-otp').value.trim();
    if (code.length !== 6) {
        alert("Please enter a valid 6-digit OTP!");
        return;
    }

    window.confirmationResult.confirm(code).then((result) => {
        let user = result.user;
        console.log("Phone Authentication Successful!", user);
    }).catch((error) => {
        alert("Incorrect OTP! Please try again.");
        console.error("Verification error", error);
    });
}

function resetPhoneLogin() {
    document.getElementById('otp-input-box').classList.add('hidden-form');
    document.getElementById('phone-input-box').classList.remove('hidden-form');
}

// Google Login
function handleAppLogin() {
    auth.signInWithPopup(provider).catch((error) => {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
            auth.signInWithRedirect(provider);
        } else {
            alert("Login failed: " + error.message);
        }
    });
}

// Auth State Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app-container').style.display = 'block';
        
        let userInfo = user.phoneNumber || user.email || "Customer";
        let profileName = document.getElementById('profile-display-name');
        let profilePhone = document.getElementById('profile-display-phone');
        let profileInitial = document.getElementById('profile-initial');
        let custPhone = document.getElementById('cust-phone');

        if (profileName) profileName.innerText = user.displayName || "Kaja's Customer";
        if (profilePhone) profilePhone.innerText = userInfo;
        if (profileInitial) profileInitial.innerText = (user.displayName || "K").charAt(0).toUpperCase();
        if (custPhone && user.phoneNumber) custPhone.value = user.phoneNumber.replace("+91", "");

        db.collection("users").doc(user.uid).set({
            info: userInfo,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app-container').style.display = 'none';
    }
});

function logoutApp() {
    auth.signOut().then(() => {
        closeModal('profileModal');
        closeModal('cartModal');
        closeModal('ordersModal');
    });
}

// Navigation & Modals
function switchTab(tabName, element) {
    document.querySelectorAll('.nav-item').forEach(item => { item.classList.remove('active'); });
    if (element) { element.classList.add('active'); }
    
    if (tabName === 'account') openModal('profileModal');
    else if (tabName === 'orders') openOrdersModal();
    else if (tabName === 'cart') openModal('cartModal');
    else {
        closeModal('profileModal');
        closeModal('ordersModal');
        closeModal('cartModal');
    }
}

function openModal(id) { document.getElementById(id).style.display = "block"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

function openOrdersModal() {
    closeModal('profileModal');
    openModal('ordersModal');
    loadUserOrders();
}

// Cart & Orders Logic
function addToCart(name, price) {
    let item = cart.find(i => i.name === name);
    if (item) item.quantity += 1;
    else cart.push({ name: name, price: price, quantity: 1 });
    updateCartUI();
}

function updateCartUI() {
    let totalCount = 0, totalPrice = 0;
    let container = document.getElementById('cart-items-container');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p style="color:#aaa; font-size:13px;">Cart is empty</p>';
        document.getElementById('floating-cart-bar').style.display = 'none';
    } else {
        let html = '';
        cart.forEach((item, index) => {
            totalCount += item.quantity;
            totalPrice += item.price * item.quantity;
            html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: #2b080c; padding: 8px; border-radius: 6px;">
                <div><div style="font-weight: bold; color: #fff; font-size:13px;">${item.name}</div><div style="font-size: 11px; color: #aaa;">₹${item.price} x ${item.quantity}</div></div>
                <div>
                    <button onclick="changeQuantity(${index}, 1)" style="background:#e60023; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer;">+</button>
                    <span style="margin: 0 6px; color:#fff; font-size:13px;">${item.quantity}</span>
                    <button onclick="changeQuantity(${index}, -1)" style="background:#4a1215; color:#fff; border:none; padding:2px 8px; border-radius:4px; cursor:pointer;">-</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
        document.getElementById('floating-cart-bar').style.display = 'flex';
    }
    document.getElementById('floating-cart-count').innerText = totalCount;
    document.getElementById('floating-cart-total').innerText = '₹' + totalPrice;
    let totalElem = document.getElementById('total-price');
    if (totalElem) totalElem.innerText = '₹' + totalPrice;
}

function changeQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    updateCartUI();
}

function promptUpdateProfile() {
    let newName = prompt("Enter your name:", document.getElementById('profile-display-name').innerText);
    if (newName) {
        document.getElementById('profile-display-name').innerText = newName;
        document.getElementById('profile-initial').innerText = newName.charAt(0).toUpperCase();
        alert("Profile name updated successfully!");
    }
}

function placeOrder() {
    let user = auth.currentUser;
    if (!user) { alert("Please login first!"); return; }

    let name = document.getElementById('cust-name').value;
    let phone = document.getElementById('cust-phone').value;
    let address = document.getElementById('cust-address').value;
    let paymentMethod = document.getElementById('paymentMethod').value;

    if (!name || !phone || !address) { alert("Please fill all details!"); return; }
    if (cart.length === 0) { alert("Cart is empty!"); return; }

    let totalPrice = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    if (paymentMethod.includes('Razorpay')) {
        var options = {
            "key": "rzp_live_TMT03OyoVLSYZS",
            "amount": totalPrice * 100,
            "currency": "INR",
            "name": "Kaja's Zone",
            "description": "Food Order Payment",
            "handler": function (response) {
                saveOrderToFirebase(user.uid, name, phone, address, paymentMethod, totalPrice, response.razorpay_payment_id);
            },
            "prefill": { "name": name, "contact": phone },
            "theme": { "color": "#e60023" }
        };
        var rzp1 = new Razorpay(options);
        rzp1.open();
    } else {
        saveOrderToFirebase(user.uid, name, phone, address, paymentMethod, totalPrice, "COD");
    }
}

function saveOrderToFirebase(userId, name, phone, address, paymentMethod, totalPrice, paymentId) {
    db.collection("orders").add({
        userId: userId, customerName: name, phone: phone, address: address,
        paymentMethod: paymentMethod, paymentId: paymentId, items: cart, 
        totalAmount: totalPrice, status: "Order Placed",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Order placed successfully!");
        cart = [];
        updateCartUI();
        closeModal('cartModal');
        switchTab('orders', document.getElementById('nav-orders'));
    }).catch((error) => {
        alert("Order failed: " + error.message);
    });
}

function loadUserOrders() {
    let user = auth.currentUser;
    let container = document.getElementById('user-orders-container');
    if (!container) return;
    
    if (!user) { container.innerHTML = "<p style='color:#aaa; font-size:13px;'>Please login.</p>"; return; }

    container.innerHTML = "<p style='color:#aaa; font-size:13px;'>Loading orders...</p>";
    
    db.collection("orders").where("userId", "==", user.uid).orderBy("timestamp", "desc").get()
    .then((snapshot) => {
        if (snapshot.empty) { container.innerHTML = "<p style='color:#aaa; font-size:13px;'>No past orders found.</p>"; return; }
        let html = "";
        snapshot.forEach((doc) => {
            let order = doc.data();
            let itemsText = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            html += `<div style="background: #2b080c; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #4a1215;">
                <div style="font-weight: bold; color: #ff4d4d; font-size:14px; margin-bottom: 4px;">Total: ₹${order.totalAmount}</div>
                <div style="font-size: 12px; color: #ccc; margin-bottom: 4px;"><b>Items:</b> ${itemsText}</div>
                <div style="font-size: 11px; color: #888;"><b>Payment:</b> ${order.paymentMethod}</div>
            </div>`;
        });
        container.innerHTML = html;
    });
}
