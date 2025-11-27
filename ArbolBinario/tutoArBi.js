document.addEventListener("DOMContentLoaded", () => {
    const helpBtn = document.getElementById("helpBtn");
    const helpPopup = document.getElementById("helpPopup");

    // Crear overlay si aún no existe
    let overlay = document.getElementById("overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "overlay";
        document.body.appendChild(overlay);
    }

    function abrirPopup() {
        overlay.style.display = "block";
        helpPopup.style.display = "block";
    }

    function cerrarPopup() {
        overlay.style.display = "none";
        helpPopup.style.display = "none";
    }

    // Abrir
    helpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirPopup();
    });

    // Cerrar al presionar sobre overlay
    overlay.addEventListener("click", cerrarPopup);

    // Cerrar al hacer clic fuera del popup
    document.addEventListener("click", (e) => {
        if (!helpPopup.contains(e.target) && e.target !== helpBtn) {
            cerrarPopup();
        }
    });
});
