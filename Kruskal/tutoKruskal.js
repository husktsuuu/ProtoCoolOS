document.addEventListener('DOMContentLoaded', function () {
    const grafoContainer = document.getElementById('grafo-container');
    const importarArchivo = document.getElementById('importarArchivo');
    const colorPicker = document.getElementById('cambiarColorBtn');
    const colorTextoPicker = document.getElementById('cambiarColorTextoBtn');
    const colorAristaPicker = document.getElementById('cambiarColorAristaBtn');
    const resultadoContainer = document.getElementById('resultado-container');

    let estado = {
        seleccionando: false,
        nodoOrigen: null,
        colorActual: '#d2e5ff',
        colorTextoActual: '#ffffff',
        modoEliminar: false
    };

    let nodos = new vis.DataSet();
    let aristas = new vis.DataSet();
    let network = null;
    let ultimoIdNodo = 0;

    const opciones = {
        nodes: {
            shape: 'circle',
            font: { size: 14, color: estado.colorTextoActual },
            borderWidth: 2,
            scaling: { min: 16, max: 32 }
        },
        edges: { arrows: '', font: { align: 'top' } },
        physics: { enabled: false },
        interaction: { dragNodes: true, selectConnectedEdges: false }
    };

    // ===== INICIALIZAR RED =====
    function inicializarRed() {
        const datos = { nodes: nodos, edges: aristas };
        network = new vis.Network(grafoContainer, datos, opciones);

        network.on("click", function (params) {
            if (estado.modoEliminar) {
                const nodeId = this.getNodeAt(params.pointer.DOM);
                const edgeId = this.getEdgeAt(params.pointer.DOM);
                if (nodeId) {
                    nodos.remove({ id: nodeId });
                    const asociadas = aristas.get({ filter: a => a.from === nodeId || a.to === nodeId });
                    aristas.remove(asociadas);
                } else if (edgeId) {
                    aristas.remove({ id: edgeId });
                }
                return;
            }

            // Crear nodo
            if (params.nodes.length === 0 && params.edges.length === 0) {
                const c = params.pointer.canvas;
                const nombre = prompt("Ingrese el nombre del nodo:", `Nodo ${ultimoIdNodo + 1}`);
                if (nombre !== null && nombre.trim() !== "") crearNodo(c.x, c.y, estado.colorActual, nombre);
                return;
            }

            // Crear arista
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                if (estado.seleccionando) {
                    const origen = estado.nodoOrigen;
                    const destino = nodeId;

                    if (origen === destino) {
                        alert("❌ No se puede crear una arista hacia el mismo nodo.");
                        estado.seleccionando = false;
                        estado.nodoOrigen = null;
                        return;
                    }

                    if (aristaDuplicada(origen, destino)) {
                        alert("⚠️ Ya existe una arista entre estos nodos.");
                        estado.seleccionando = false;
                        estado.nodoOrigen = null;
                        return;
                    }

                    let peso;
                    do {
                        peso = prompt("Ingrese el peso de la arista:", "");
                        if (peso === null) break;
                    } while (isNaN(peso) || peso.trim() === "");

                    if (peso !== null) {
                        aristas.add({ from: origen, to: destino, label: peso });
                    }
                    estado.seleccionando = false;
                    estado.nodoOrigen = null;
                } else {
                    estado.seleccionando = true;
                    estado.nodoOrigen = nodeId;
                }
            }
        });

        // Click derecho editar
        network.on("oncontext", function (params) {
            params.event.preventDefault();
            const n = this.getNodeAt(params.pointer.DOM);
            const e = this.getEdgeAt(params.pointer.DOM);
            if (n !== undefined) {
                const nuevo = prompt("Nuevo nombre del nodo:", "");
                if (nuevo !== null) nodos.update({ id: n, label: nuevo });
            } else if (e !== undefined) {
                const nuevo = prompt("Nuevo peso:", "");
                if (nuevo !== null) aristas.update({ id: e, label: nuevo });
            }
        });
    }

    // ===== FUNCIONES BASE =====
    function crearNodo(x, y, color, nombre) {
        ultimoIdNodo++;
        nodos.add({
            id: ultimoIdNodo,
            label: nombre,
            x, y,
            color: { background: color },
            font: { color: estado.colorTextoActual },
            physics: false
        });
    }

    function aristaDuplicada(o, d) {
        return aristas.get({
            filter: i => (i.from === o && i.to === d) || (i.from === d && i.to === o)
        }).length > 0;
    }

    function restaurarColores() {
        nodos.forEach(n => nodos.update({ id: n.id, color: { background: estado.colorActual } }));
        aristas.forEach(e => aristas.update({ id: e.id, color: { color: colorAristaPicker.value }, width: 1 }));
        resultadoContainer.textContent = '';
    }

    // ===== ALGORITMO KRUSKAL =====
    function ejecutarKruskal(tipo = 'min') {
        const edges = aristas.get().map(e => ({
            id: e.id, peso: parseFloat(e.label), from: e.from, to: e.to
        }));

        if (edges.length === 0) {
            alert("No hay aristas en el grafo.");
            return;
        }

        edges.sort((a, b) => tipo === 'min' ? a.peso - b.peso : b.peso - a.peso);

        const parent = {};
        function find(x) { return parent[x] ? find(parent[x]) : x; }
        function union(x, y) { parent[find(x)] = find(y); }

        const seleccionadas = [];
        let total = 0;

        edges.forEach(e => {
            if (find(e.from) !== find(e.to)) {
                union(e.from, e.to);
                seleccionadas.push(e);
                total += e.peso;
            }
        });

        // Detectar componentes
        const componentes = new Set(nodos.getIds().map(find));
        if (componentes.size > 1) {
            alert(`⚠️ El grafo no es conexo. Se generó un bosque de expansión mínima con ${componentes.size} componentes.`);
        }

        // Deseleccionar nodos
        network.unselectAll();

        // Reset
        restaurarColores();

        const colorResaltado = tipo === 'min' ? '#00A86B' : '#E53935';
        const nodosUsados = new Set();

        // Pintar árbol completo
        seleccionadas.forEach(e => {
            aristas.update({ id: e.id, color: { color: colorResaltado }, width: 3 });
            nodosUsados.add(e.from);
            nodosUsados.add(e.to);
        });

        nodosUsados.forEach(id => {
            nodos.update({ id, color: { background: colorResaltado }, font: { color: '#ffffff' } });
        });

        resultadoContainer.innerHTML =
            `<b>${tipo === 'min' ? 'Árbol de costo mínimo' : 'Árbol de costo máximo'}:</b> ` +
            seleccionadas.map(e => `${e.peso}`).join(' + ') + ` = <b>${total}</b>`;
    }

    // ===== BOTONES =====
    document.getElementById('btnMin').addEventListener('click', () => ejecutarKruskal('min'));
    document.getElementById('btnMax').addEventListener('click', () => ejecutarKruskal('max'));
    document.getElementById('volverColorOrig').addEventListener('click', restaurarColores);
    document.getElementById('limpiarBtn').addEventListener('click', () => location.reload());

    document.getElementById('eliminarBtn').addEventListener('click', function () {
        estado.modoEliminar = !estado.modoEliminar;
        grafoContainer.style.cursor = estado.modoEliminar ? 'crosshair' : 'default';
        alert(estado.modoEliminar ? '🗑️ Modo eliminar activado' : 'Modo eliminar desactivado');
    });

    // ===== EXPORTAR / IMPORTAR =====
    document.getElementById('guardarBtn').addEventListener('click', function () {
        const exportOptions = document.getElementById('exportOptions');
        exportOptions.style.display = exportOptions.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('exportPNG').addEventListener('click', async function () {
        const nombreArchivo = prompt("Ingrese el nombre del archivo:", "grafo.png") || "grafo.png";
        const canvas = await html2canvas(grafoContainer, { backgroundColor: "#ffffff" });
        const link = document.createElement("a");
        link.download = nombreArchivo;
        link.href = canvas.toDataURL("image/png");
        link.click();
        document.getElementById('exportOptions').style.display = 'none';
    });

    document.getElementById('exportPDF').addEventListener('click', async function () {
        const nombreArchivo = prompt("Ingrese el nombre del archivo:", "grafo.pdf") || "grafo.pdf";
        const canvas = await html2canvas(grafoContainer, { backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jspdf.jsPDF({ orientation: "landscape" });
        const imgWidth = pdf.internal.pageSize.getWidth() - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
        pdf.save(nombreArchivo);
        document.getElementById('exportOptions').style.display = 'none';
    });

    document.getElementById('exportJSON').addEventListener('click', function () {
        const nombreArchivo = prompt("Ingrese el nombre del archivo:", "grafo.json") || "grafo.json";
        const datos = {
            nodos: nodos.get({ returnType: "Object" }),
            aristas: aristas.get(),
            estado
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = nombreArchivo;
        link.click();
        URL.revokeObjectURL(link.href);
        document.getElementById('exportOptions').style.display = 'none';
    });

    document.getElementById('cargarBtn').addEventListener('click', () => importarArchivo.click());
    importarArchivo.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = f => {
            const datos = JSON.parse(f.target.result);
            nodos.clear(); aristas.clear();
            nodos.add(Object.values(datos.nodos));
            aristas.add(datos.aristas);
            estado = datos.estado;
            colorPicker.value = estado.colorActual;
            ultimoIdNodo = Math.max(...Object.values(datos.nodos).map(n => n.id));
        };
        reader.readAsText(file);
    });

    // ===== Inicializar =====
    inicializarRed();
});

document.addEventListener("DOMContentLoaded", () => {
    const helpBtn = document.getElementById("helpBtn");
    const helpPopup = document.getElementById("helpPopup");
    const overlay = document.createElement("div");

    overlay.id = "overlay";
    document.body.appendChild(overlay);

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
