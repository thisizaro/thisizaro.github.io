let navMenu = document.querySelector('.nav-menu');
let navBlocks = document.querySelectorAll('.nav-block');

navMenu.onclick = function() {
    for (let i = 0; i < navBlocks.length; i++) {
        navBlocks[i].classList.toggle('navActive');
    }
}
