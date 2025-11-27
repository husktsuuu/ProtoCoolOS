document.addEventListener("DOMContentLoaded", () => {
    const helpBtn = document.getElementById("helpBtn");
    const helpPopup = document.getElementById("helpPopup");
    const overlay = document.getElementById("overlay");

    function abrirPopup() {
        overlay.classList.remove("hidden");
        helpPopup.classList.remove("hidden");

        overlay.style.display = "block";
        helpPopup.style.display = "block";
    }

    function cerrarPopup() {
        overlay.classList.add("hidden");
        helpPopup.classList.add("hidden");

        overlay.style.display = "none";
        helpPopup.style.display = "none";
    }

    // Abrir popup
    helpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirPopup();
    });

    // Cerrar al hacer clic en el fondo oscuro
    overlay.addEventListener("click", cerrarPopup);

    // Cerrar al hacer clic fuera del popup
    document.addEventListener("click", (e) => {
        if (!helpPopup.contains(e.target) && e.target !== helpBtn) {
            cerrarPopup();
        }
    });
});
