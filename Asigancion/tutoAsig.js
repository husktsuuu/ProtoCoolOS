document.addEventListener("DOMContentLoaded", () => {
    const helpBtn = document.getElementById("helpBtn");
    const helpPopup = document.getElementById("helpPopup");
    const overlay = document.getElementById("overlay");

    function abrirPopup() {
        // Mostrar pantalla oscura y popup
        overlay.classList.remove("hidden");
        helpPopup.classList.remove("hidden");

        overlay.style.display = "block";
        helpPopup.style.display = "block";
    }

    function cerrarPopup() {
        // Ocultar pantalla oscura y popup
        overlay.classList.add("hidden");
        helpPopup.classList.add("hidden");

        overlay.style.display = "none";
        helpPopup.style.display = "none";
    }

    // Abrir popup al presionar ?
    helpBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // evita conflictos con el cierre
        abrirPopup();
    });

    // Cerrar popup al hacer clic en el fondo oscuro
    overlay.addEventListener("click", cerrarPopup);

    // Cerrar popup al hacer clic fuera del recuadro
    document.addEventListener("click", (e) => {
        // No cerrar si:
        // • clic dentro del popup
        // • clic en el botón ?
        if (helpPopup.contains(e.target)) return;
        if (e.target === helpBtn) return;

        cerrarPopup();
    });
});
