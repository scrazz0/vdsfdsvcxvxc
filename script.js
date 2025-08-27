const TelegramWebApp = window.Telegram.WebApp;
TelegramWebApp.ready();
const userId = TelegramWebApp.initDataUnsafe.user?.id || 'test_user'; // Получаем Telegram user ID

// i18n (простая реализация)
const translations = {
  ru: {
    home: 'Главная',
    categories: 'Категории',
    createAd: 'Создать объявление',
    admin: 'Админ панель',
    // Добавьте больше
  },
  uk: {
    home: 'Головна',
    categories: 'Категорії',
    createAd: 'Створити оголошення',
    admin: 'Адмін панель',
    // Добавьте больше
  }
};
let lang = 'ru';
function updateLang() {
  document.querySelector('a[href="#home"]').textContent = translations[lang].home;
  // Обновите другие тексты аналогично
}

// Смена языка
document.getElementById('language').addEventListener('change', (e) => {
  lang = e.target.value;
  updateLang();
});

// Темы
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');
  themeToggle.textContent = document.body.classList.contains('dark-theme') ? '🌙' : '☀️';
});
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-theme');
  document.body.classList.remove('dark-theme');
  themeToggle.textContent = '☀️';
} else {
  document.body.classList.add('dark-theme');
}

// Hamburger menu toggle
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const main = document.querySelector('main');

menuToggle.addEventListener('click', () => {
  if (sidebar.style.display === 'none' || sidebar.style.display === '') {
    sidebar.style.display = 'block';
    main.style.marginLeft = '240px'; // Adjust for mobile
  } else {
    sidebar.style.display = 'none';
    main.style.marginLeft = '0';
  }
});

// Навигация
document.querySelectorAll('.sidebar a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    document.querySelector(link.getAttribute('href')).style.display = 'block';
    // Close sidebar on mobile after click
    if (window.innerWidth <= 768) {
      sidebar.style.display = 'none';
      main.style.marginLeft = '0';
    }
  });
});

// Загрузка объявлений
async function loadAds(containerId, query = {}) {
  const res = await fetch(`http://localhost:3000/ads?${new URLSearchParams(query)}`);
  const ads = await res.json();
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  ads.forEach(ad => {
    const card = document.createElement('div');
    card.classList.add('ad-card');
    card.innerHTML = `
      <img src="${ad.photos[0]}" alt="${ad.title}">
      <h3>${ad.title}</h3>
      <p class="price">${ad.price} UAH</p>
      <p class="city">${ad.city}</p>
    `;
    card.addEventListener('click', () => showModal(ad));
    container.appendChild(card);
  });
}

// Модальное окно
const modal = document.getElementById('modal');
const close = document.querySelector('.close');
close.addEventListener('click', () => modal.style.display = 'none');
function showModal(ad) {
  let currentPhotoIndex = 0;
  const photoElem = document.getElementById('modal-photo');
  const prevBtn = document.querySelector('.prev');
  const nextBtn = document.querySelector('.next');

  function updatePhoto() {
    photoElem.src = ad.photos[currentPhotoIndex];
  }

  prevBtn.onclick = () => {
    currentPhotoIndex = (currentPhotoIndex - 1 + ad.photos.length) % ad.photos.length;
    updatePhoto();
  };

  nextBtn.onclick = () => {
    currentPhotoIndex = (currentPhotoIndex + 1) % ad.photos.length;
    updatePhoto();
  };

  updatePhoto();
  document.getElementById('modal-title').textContent = ad.title;
  document.getElementById('modal-price').textContent = `${ad.price} UAH`;
  document.getElementById('modal-city').textContent = ad.city;
  document.getElementById('modal-description').textContent = ad.description;
  document.getElementById('chat-button').onclick = () => {
    TelegramWebApp.openTelegramLink(`https://t.me/user?id=${ad.userId}`);
  };
  modal.style.display = 'block';
}

// Фильтры
document.getElementById('apply-filters').addEventListener('click', () => {
  const query = {
    search: document.getElementById('search').value,
    minPrice: document.getElementById('min-price').value,
    maxPrice: document.getElementById('max-price').value,
    city: document.getElementById('city-filter').value
  };
  loadAds('ads-list', query);
});

// Категории
document.getElementById('category-select').addEventListener('change', (e) => {
  loadAds('category-ads', { category: e.target.value });
});

// Создать объявление
document.getElementById('ad-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  formData.append('userId', userId);
  await fetch('http://localhost:3000/ads', {
    method: 'POST',
    body: formData
  });
  alert('Объявление отправлено на модерацию');
  e.target.reset();
});

// Админ логин
document.getElementById('admin-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;
  const res = await fetch('http://localhost:3000/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const { token } = await res.json();
  if (token) {
    localStorage.setItem('adminToken', token);
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
    loadPendingAds();
  } else {
    alert('Неверный пароль');
  }
});

// Загрузка pending для админа
async function loadPendingAds() {
  const res = await fetch('http://localhost:3000/ads?status=pending', {
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });
  const ads = await res.json();
  const container = document.getElementById('pending-ads');
  container.innerHTML = '';
  ads.forEach(ad => {
    const card = document.createElement('div');
    card.classList.add('ad-card');
    card.innerHTML = `
      <img src="${ad.photos[0]}" alt="${ad.title}">
      <h3>${ad.title}</h3>
      <button onclick="approveAd('${ad._id}')">Одобрить</button>
      <button onclick="rejectAd('${ad._id}')">Отклонить</button>
    `;
    container.appendChild(card);
  });
}

// Одобрить/отклонить
async function approveAd(id) {
  await fetch(`http://localhost:3000/ads/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('adminToken')}`
    },
    body: JSON.stringify({ status: 'approved' })
  });
  loadPendingAds();
}

async function rejectAd(id) {
  await fetch(`http://localhost:3000/ads/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('adminToken')}`
    },
    body: JSON.stringify({ status: 'rejected' })
  });
  loadPendingAds();
}

// Инициализация
loadAds('ads-list');
loadAds('category-ads');
if (localStorage.getItem('adminToken')) {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-content').style.display = 'block';
  loadPendingAds();
}