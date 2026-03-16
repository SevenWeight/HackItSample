document.addEventListener('DOMContentLoaded', function () {
    var hamburger = document.getElementById('hamburger-btn');
    var nav = document.getElementById('main-nav');

    if (hamburger && nav) {
        hamburger.addEventListener('click', function () {
            var isOpen = nav.classList.toggle('site-header__nav--open');
            hamburger.classList.toggle('site-header__hamburger--active');
            hamburger.setAttribute('aria-expanded', isOpen);
        });
    }
});
