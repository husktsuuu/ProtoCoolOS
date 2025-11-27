document.addEventListener("DOMContentLoaded", () => {

    const helpBtn = document.getElementById("helpBtn");
    const helpPopup = document.getElementById("helpPopup");

    // Creamos overlay SI NO EXISTE
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

    helpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirPopup();
    });

    overlay.addEventListener("click", cerrarPopup);

    document.addEventListener("click", (e) => {
        if (!helpPopup.contains(e.target) && e.target !== helpBtn) {
            cerrarPopup();
        }
    });
});
