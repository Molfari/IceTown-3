document.querySelectorAll('.menu-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        document.querySelectorAll('.menu-icon').forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
    });
});

document.getElementById('close-btn').addEventListener('click', () => alert('Закрити гру'));
document.getElementById('menu-btn').addEventListener('click', () => alert('Меню'));

