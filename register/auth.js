const Storage = {
    getUsers: () => {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : [];
    },
    
    saveUsers: (users) => {
        localStorage.setItem('users', JSON.stringify(users));
    },
    
    getCurrentUser: () => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },
    
    setCurrentUser: (user) => {
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    },
    
    addUser: (userData) => {
        const users = Storage.getUsers();
        users.push(userData);
        Storage.saveUsers(users);
    }
};

function initDatabase() {
    const users = Storage.getUsers();
    const adminExists = users.some(u => u.role === 'admin');
    
    if (!adminExists) {
        const adminUser = {
            id: 'admin-001',
            name: 'Администратор',
            email: 'admin@infotelecom.ru',
            phone: '+7 (999) 000-00-00',
            password: 'admin123',
            role: 'admin',
            registeredAt: new Date().toISOString(),
            services: []
        };
        users.push(adminUser);
        Storage.saveUsers(users);
    }
}

initDatabase();

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
}

function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 0) {
        if (value[0] === '8') {
            value = '7' + value.slice(1);
        }
        if (value.length <= 1) {
            input.value = '+7';
        } else if (value.length <= 4) {
            input.value = '+7 (' + value.slice(1);
        } else if (value.length <= 7) {
            input.value = '+7 (' + value.slice(1, 4) + ') ' + value.slice(4);
        } else if (value.length <= 9) {
            input.value = '+7 (' + value.slice(1, 4) + ') ' + value.slice(4, 7) + '-' + value.slice(7);
        } else {
            input.value = '+7 (' + value.slice(1, 4) + ') ' + value.slice(4, 7) + '-' + value.slice(7, 9) + '-' + value.slice(9, 11);
        }
    }
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    const phoneInput = document.getElementById('registerPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', () => formatPhone(phoneInput));
    }

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const phone = document.getElementById('registerPhone').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const agree = document.querySelector('input[name="agree"]').checked;
        
        if (!name || !email || !phone || !password || !passwordConfirm) {
            errorDiv.textContent = 'Все поля обязательны для заполнения';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!validateEmail(email)) {
            errorDiv.textContent = 'Введите корректный email адрес';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!validatePhone(phone)) {
            errorDiv.textContent = 'Введите корректный номер телефона';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (password.length < 6) {
            errorDiv.textContent = 'Пароль должен содержать минимум 6 символов';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (password !== passwordConfirm) {
            errorDiv.textContent = 'Пароли не совпадают';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!agree) {
            errorDiv.textContent = 'Необходимо согласие с условиями использования';
            errorDiv.style.display = 'block';
            return;
        }
        
        const users = Storage.getUsers();
        const existingUser = users.find(u => u.email === email);
        
        if (existingUser) {
            errorDiv.textContent = 'Пользователь с таким email уже зарегистрирован';
            errorDiv.style.display = 'block';
            return;
        }
        
        const newUser = {
            name: name,
            email: email,
            phone: phone,
            password: password,
            role: 'user'
        };
        
        const apiUrl = 'http://localhost/api/register.php';
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUser)
        })
        .then(async response => {
            const responseText = await response.text();
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error('Сервер вернул невалидный JSON: ' + responseText);
            }
            
            if (!response.ok) {
                if (data.error) {
                    errorDiv.textContent = data.error;
                    errorDiv.style.display = 'block';
                }
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        })
        .then(data => {
            if (data.success) {
                const userForStorage = {
                    id: data.user_id.toString(),
                    name: data.user.name,
                    email: data.user.email,
                    phone: data.user.phone,
                    role: data.user.role,
                    registeredAt: data.user.registered_at,
                    services: []
                };
                
                Storage.addUser(userForStorage);
                Storage.setCurrentUser(userForStorage);
                
                window.location.href = 'account.html';
            } else {

            }
        })
        .catch(error => {
            if (error.message.includes('HTTP error! status: 400') || error.message.includes('400')) {
                if (!errorDiv.textContent || errorDiv.textContent === '') {
                    errorDiv.textContent = error.message || 'Ошибка валидации данных';
                }
                errorDiv.style.display = 'block';
                return;
            }
            
            if (error.message.includes('HTTP error! status: 500') || error.message.includes('500')) {
                errorDiv.textContent = 'Ошибка сервера. Попробуйте позже.';
                errorDiv.style.display = 'block';
                return;
            }
            
            if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                const users = Storage.getUsers();
                const existingUser = users.find(u => u.email === email);
                
                if (existingUser) {
                    errorDiv.textContent = 'Пользователь с таким email уже зарегистрирован';
                    errorDiv.style.display = 'block';
                    return;
                }
                
                const userForStorage = {
                    id: Date.now().toString(),
                    name: name,
                    email: email,
                    phone: phone,
                    password: password,
                    role: 'user',
                    registeredAt: new Date().toISOString(),
                    services: []
                };
                
                Storage.addUser(userForStorage);
                Storage.setCurrentUser(userForStorage);
                
                window.location.href = 'account.html';
            } else {
                errorDiv.textContent = error.message || 'Неизвестная ошибка';
                errorDiv.style.display = 'block';
            }
        });
    });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const errorDiv = document.getElementById('loginError');
        errorDiv.style.display = 'none';
        
        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            errorDiv.textContent = 'Вы уже авторизованы. Пожалуйста, выйдите из текущего аккаунта.';
            errorDiv.style.display = 'block';
            return;
        }
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const remember = document.querySelector('input[name="remember"]') ? document.querySelector('input[name="remember"]').checked : false;
        
        if (!email || !password) {
            errorDiv.textContent = 'Все поля обязательны для заполнения';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!validateEmail(email)) {
            errorDiv.textContent = 'Введите корректный email адрес';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (password.length < 1) {
            errorDiv.textContent = 'Введите пароль';
            errorDiv.style.display = 'block';
            return;
        }
        
        const apiUrl = 'http://localhost/api/login.php';
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const userForStorage = {
                    id: data.user.id.toString(),
                    name: data.user.name,
                    email: data.user.email,
                    phone: data.user.phone,
                    role: data.user.role,
                    registeredAt: data.user.registered_at,
                    services: []
                };
                
                Storage.setCurrentUser(userForStorage);
                
                if (data.user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'account.html';
                }
            } else {
                throw new Error(data.error || 'Ошибка входа');
            }
        })
        .catch(error => {
            const users = Storage.getUsers();
            const user = users.find(u => u.email === email && u.password === password);
            
            if (!user) {
                errorDiv.textContent = 'Неверный email или пароль. Авторизоваться могут только пользователи из базы данных.';
                errorDiv.style.display = 'block';
                return;
            }
            
            Storage.setCurrentUser(user);
            
            errorDiv.style.display = 'none';
            
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'account.html';
            }
        });
    });
}

function updateHeaderForAuth() {
    const currentUser = Storage.getCurrentUser();
    const headerActions = document.querySelector('.header-actions');
    
    if (!headerActions) return;
    
    const currentPage = window.location.pathname;
    const isAuthPage = currentPage.includes('login.html') || currentPage.includes('register.html');
    
    const existingAuthBtns = headerActions.querySelectorAll('.auth-btn, .auth-register-btn');
    const existingUserMenu = headerActions.querySelector('.user-menu');
    
    existingAuthBtns.forEach(btn => btn.remove());
    if (existingUserMenu) {
        existingUserMenu.remove();
    }
    
    if (isAuthPage) {
        return;
    }
    
    const menuToggle = headerActions.querySelector('.menu-toggle');
    
    if (currentUser) {
        const accountPage = currentUser.role === 'admin' ? 'admin.html' : 'account.html';
        const accountLabel = currentUser.role === 'admin' ? 'Админ панель' : 'Личный кабинет';
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <span class="user-name">${currentUser.name}</span>
            <a href="${accountPage}" class="btn btn-outline">${accountLabel}</a>
            <button class="btn btn-outline logout-btn-small" id="logoutBtnHeader">Выйти</button>
        `;
        userMenu.style.display = 'flex';
        userMenu.style.alignItems = 'center';
        userMenu.style.gap = '1rem';
        if (menuToggle) {
            headerActions.insertBefore(userMenu, menuToggle);
        } else {
            headerActions.appendChild(userMenu);
        }
        
        const logoutBtn = document.getElementById('logoutBtnHeader');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                Storage.setCurrentUser(null);
                window.location.href = 'index.html';
            });
        }
    } else {
        const loginBtn = document.createElement('a');
        loginBtn.href = 'login.html';
        loginBtn.className = 'btn btn-outline auth-btn';
        loginBtn.textContent = 'Войти';
        
        const registerBtn = document.createElement('a');
        registerBtn.href = 'register.html';
        registerBtn.className = 'btn btn-primary auth-register-btn';
        registerBtn.textContent = 'Регистрация';
        
        if (menuToggle) {
            headerActions.insertBefore(loginBtn, menuToggle);
            headerActions.insertBefore(registerBtn, loginBtn);
        } else {
            headerActions.appendChild(registerBtn);
            headerActions.appendChild(loginBtn);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    updateHeaderForAuth();
    
    if (window.location.pathname.includes('account.html')) {
        const currentUser = Storage.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
        } else if (currentUser.role === 'admin') {
            window.location.href = 'admin.html';
        }
    }
    
    if (window.location.pathname.includes('admin.html')) {
        const currentUser = Storage.getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            window.location.href = 'login.html';
        }
    }
    
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            if (currentUser.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'account.html';
            }
        }
    }
});
