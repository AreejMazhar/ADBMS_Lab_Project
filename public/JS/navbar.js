document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach(link => {
    if (link.dataset.path === currentPath) {
      link.classList.add("active");
    }
  });
});
