document.addEventListener('DOMContentLoaded', function () {
    const grafoContainer = document.getElementById('grafo-container');
    const matrizHeader = document.getElementById('matriz-header');
    const matrizBody = document.getElementById('matriz-body');
    const importarArchivo = document.getElementById('importarArchivo');
    const colorPicker = document.getElementById('cambiarColorBtn');
    const cambiarColorTextoBtn = document.getElementById('cambiarColorTextoBtn');

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
            font: { size: 14, color: estado.colorTextoActual, vadjust: -15, align: 'center' },
            borderWidth: 2,
            scaling: { min: 16, max: 32 },
            margin: { top: 20, left: 20, right: 20, bottom: 20 }
        },
        edges: { arrows: 'to', font: { align: 'top' } },
        physics: { enabled: true },
        interaction: { dragNodes: true }
    };

    // === Variables CPM ===
    const COLOR_CRITICO = '#E53935';
    const COLOR_MAX = '#1E88E5';
    const COLOR_MIN = '#00A86B';
    const NODE_TEXT_COLOR = '#ffffff';

    let topoOrden = [];
    let ES = {}, LS = {}, slackByEdge = {};

    // === Overrides para mostrar valores específicos en la ruta pintada ===
    let displayOverrides = { ES: {}, LS: {} };

    function clearDisplayOverrides() {
        displayOverrides = { ES: {}, LS: {} };
    }

    // Genera valores mostrados (izq/der) para el camino seleccionado
    function setOverridesForPath(path) {
        clearDisplayOverrides();
        let acc = 0;
        for (let i = 0; i < path.length; i++) {
            const id = path[i];
            displayOverrides.ES[id] = acc;      // izquierda (ES mostrado)
            displayOverrides.LS[id] = acc;      // derecha (LS mostrado igual que ES mostrado)
            if (i < path.length - 1) {
                const e = aristas.get({ filter: x => x.from === id && x.to === path[i + 1] })[0];
                const w = parseFloat(e?.label) || 0;
                acc += w;
            }
        }
    }

    // Usa overrides si existen; si no, usa ES/LS reales; evita Infinity
    function calcularValorAcumuladoNodo(id) {
        const v = displayOverrides.ES[id] ?? ES[id];
        return Number.isFinite(v) ? v : '';
    }
    function calcularValoresResta(id) {
        const v = displayOverrides.LS[id] ?? LS[id];
        return Number.isFinite(v) ? v : '';
    }


    // ====== FUNCIONES CPM ======
    function getStartEnd() {
        const ids = nodos.getIds();
        const starts = ids.filter(id => aristas.get({ filter: e => e.to === id }).length === 0);
        const ends = ids.filter(id => aristas.get({ filter: e => e.from === id }).length === 0);
        return { starts, ends };
    }

    function topoSort() {
        const ids = nodos.getIds();
        const indeg = {};
        ids.forEach(id => indeg[id] = 0);
        aristas.forEach(e => indeg[e.to] = (indeg[e.to] || 0) + 1);
        const q = [];
        ids.forEach(id => { if (indeg[id] === 0) q.push(id); });
        const order = [];
        while (q.length) {
            const u = q.shift();
            order.push(u);
            aristas.get({ filter: e => e.from === u }).forEach(e => {
                indeg[e.to]--;
                if (indeg[e.to] === 0) q.push(e.to);
            });
        }
        topoOrden = order;
    }

    function forwardPass() {
        ES = {};
        topoOrden.forEach(id => ES[id] = -Infinity);
        const { starts } = getStartEnd();
        if (starts.length !== 1) return;
        ES[starts[0]] = 0;
        topoOrden.forEach(u => {
            aristas.get({ filter: e => e.from === u }).forEach(e => {
                const w = parseFloat(e.label) || 0;
                ES[e.to] = Math.max(ES[e.to], ES[u] + w);
            });
        });
    }

    function backwardPass() {
        LS = {};
        topoOrden.forEach(id => LS[id] = +Infinity);
        const { ends } = getStartEnd();
        if (ends.length !== 1) return;
        const T = ES[ends[0]];
        LS[ends[0]] = T;
        [...topoOrden].reverse().forEach(v => {
            aristas.get({ filter: e => e.from === v }).forEach(e => {
                const w = parseFloat(e.label) || 0;
                LS[v] = Math.min(LS[v], LS[e.to] - w);
            });
            if (LS[v] === +Infinity) LS[v] = ES[v];
        });
    }

    function computeSlack() {
        slackByEdge = {};
        aristas.forEach(e => {
            const w = parseFloat(e.label) || 0;
            slackByEdge[e.id] = (LS[e.to] ?? 0) - (ES[e.from] ?? 0) - w;
        });
    }

    function recomputeTiming() {
        topoSort();
        forwardPass();
        backwardPass();
        computeSlack();
        network?.redraw();
    }

    // ====== CREAR NODOS Y ARISTAS ======
    function crearNodo(x, y, color, nombre) {
        ultimoIdNodo++;
        nodos.add({
            id: ultimoIdNodo,
            label: nombre,
            x, y,
            baseColor: color,
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

    // ====== ESTÉTICA ======
    function asegurarBaseColorEnTodos() {
        nodos.forEach(n => {
            let bg = n.color?.background || estado.colorActual;
            if (!n.baseColor) n.baseColor = bg;
            nodos.update({ id: n.id, color: { background: n.baseColor } });
        });
    }

    function pintarTodoABase() {
        clearDisplayOverrides(); // <--- importante
        nodos.forEach(n => {
            const bg = n.baseColor || estado.colorActual;
            nodos.update({ id: n.id, color: { background: bg }, font: { color: estado.colorTextoActual } });
        });
        aristas.forEach(e => aristas.update({ id: e.id, color: undefined, width: 1 }));
    }


    // ====== EXPORTAR / IMPORTAR ======
    document.getElementById('guardarBtn').addEventListener('click', function () {
        const exportOptions = document.getElementById('exportOptions');
        exportOptions.style.display = exportOptions.style.display === 'none' ? 'block' : 'none';
        const rect = this.getBoundingClientRect();
        exportOptions.style.left = rect.left + 'px';
        exportOptions.style.top = (rect.bottom + window.scrollY) + 'px';
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
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 10, (pageHeight - imgHeight) / 2, imgWidth, imgHeight);
        pdf.save(nombreArchivo);
        document.getElementById('exportOptions').style.display = 'none';
    });

    document.getElementById('exportJSON').addEventListener('click', function () {
        const nombreArchivo = prompt("Ingrese el nombre del archivo:", "grafo.json") || "grafo.json";
        const datosExportar = {
            nodos: nodos.get({ returnType: "Object" }), // mantiene x,y
            aristas: aristas.get(),
            estado
        };
        const blob = new Blob([JSON.stringify(datosExportar, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = nombreArchivo;
        link.click();
        URL.revokeObjectURL(link.href);
        document.getElementById('exportOptions').style.display = 'none';
    });

    function importarGrafo(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = f => {
            const datos = JSON.parse(f.target.result);
            nodos.clear();
            aristas.clear();
            nodos.add(Object.values(datos.nodos));
            aristas.add(datos.aristas);
            estado = datos.estado;
            colorPicker.value = estado.colorActual;
            ultimoIdNodo = Math.max(...Object.values(datos.nodos).map(n => n.id));
            recomputeTiming();
            asegurarBaseColorEnTodos();
        };
        reader.readAsText(file);
    }

    document.getElementById('cargarBtn').addEventListener('click', () => importarArchivo.click());
    importarArchivo.addEventListener('change', importarGrafo);
    document.getElementById('limpiarBtn').addEventListener('click', () => location.reload());

    // === RUTAS MAXIMIZAR Y MINIMIZAR ===
    function bestPath(mode) {
        const { starts, ends } = getStartEnd();
        if (starts.length !== 1 || ends.length !== 1) return [];
        const s = starts[0], t = ends[0];
        const dp = {}, par = {};
        topoOrden.forEach(id => dp[id] = (mode === 'max' ? -Infinity : +Infinity));
        dp[s] = 0;

        topoOrden.forEach(u => {
            aristas.get({ filter: e => e.from === u }).forEach(e => {
                const v = e.to, w = parseFloat(e.label) || 0, cand = dp[u] + w;
                if (mode === 'max') {
                    if (cand > dp[v]) { dp[v] = cand; par[v] = u; }
                } else {
                    if (cand < dp[v]) { dp[v] = cand; par[v] = u; }
                }
            });
        });

        const path = [];
        let cur = t;
        if (!par[cur] && cur !== s) return [];
        while (cur !== undefined) {
            path.push(cur);
            if (cur === s) break;
            cur = par[cur];
        }
        return path.reverse();
    }

    function paintPath(path, color) {
        nodos.forEach(n => nodos.update({ id: n.id, color: { background: n.baseColor || estado.colorActual } }));
        aristas.forEach(e => aristas.update({ id: e.id, color: undefined, width: 1 }));

        path.forEach(id => nodos.update({ id, color: { background: color }, font: { color: '#ffffff' } }));
        for (let i = 0; i < path.length - 1; i++) {
            const u = path[i], v = path[i + 1];
            const e = aristas.get({ filter: x => x.from === u && x.to === v })[0];
            if (e) aristas.update({ id: e.id, color, width: 3 });
        }
    }

    // === EVENTOS DE BOTONES ===
    // === EVENTOS DE BOTONES ===
    const btnMax = document.getElementById('btnMax');
    const btnMin = document.getElementById('btnMin');

    if (btnMax) {
        btnMax.addEventListener('click', () => {
            recomputeTiming();
            const path = bestPath('max');
            if (!path.length) return alert('No existe camino válido entre inicio y fin.');
            pintarTodoABase();         // limpia colores y textos
            setOverridesForPath(path); // ⚡ muestra los valores del camino
            paintPath(path, '#1E88E5'); // azul
            network?.redraw();
            alert('Ruta de máximo tiempo (azul con valores actualizados)');
        });
    }

    if (btnMin) {
        btnMin.addEventListener('click', () => {
            recomputeTiming();
            const path = bestPath('min');
            if (!path.length) return alert('No existe camino válido entre inicio y fin.');
            pintarTodoABase();         // limpia colores y textos
            setOverridesForPath(path); // ⚡ muestra los valores del camino
            paintPath(path, '#00A86B'); // verde
            network?.redraw();
            alert('Ruta de mínimo tiempo (verde con valores actualizados)');
        });
    }


    // ====== BOTÓN ELIMINAR ======
    document.getElementById('eliminarBtn').addEventListener('click', function () {
        estado.modoEliminar = !estado.modoEliminar;
        grafoContainer.style.cursor = estado.modoEliminar ? 'crosshair' : 'default';
        alert(estado.modoEliminar ? '🗑️ Modo eliminar activado' : 'Modo eliminar desactivado');
    });


    // ====== RED PRINCIPAL ======
    function inicializarRed() {
        const datos = { nodes: nodos, edges: aristas };
        network = new vis.Network(grafoContainer, datos, opciones);
        recomputeTiming();
        asegurarBaseColorEnTodos();
        pintarTodoABase();

        // Click: crear nodos/aristas o eliminar
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

            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                if (estado.seleccionando) {
                    const o = estado.nodoOrigen, d = nodeId;
                    if (o !== d && !aristaDuplicada(o, d)) {
                        let peso;
                        do {
                            peso = prompt("Ingrese el atributo de la arista (ej. peso):", "");
                            if (peso === null) break;
                        } while (isNaN(peso) || peso.trim() === "");
                        if (peso !== null) aristas.add({ from: o, to: d, label: peso });
                    }
                    estado.seleccionando = false;
                    estado.nodoOrigen = null;
                } else {
                    estado.seleccionando = true;
                    estado.nodoOrigen = nodeId;
                }
            } else {
                const c = params.pointer.canvas;
                const nombre = prompt("Ingrese el nombre del nodo:", `Nodo ${ultimoIdNodo + 1}`);
                if (nombre !== null) crearNodo(c.x, c.y, estado.colorActual, nombre);
            }
        });

        // Context menu: editar
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

        // Dibujar ES/LS
        network.on("afterDrawing", function (ctx) {
            nodos.forEach((nodo) => {
                const nodeId = nodo.id;
                const pos = network.getPositions([nodeId])[nodeId];
                if (!pos) return;

                const x = pos.x, y = pos.y;
                const valIzq = calcularValorAcumuladoNodo(nodeId); // usa overrides/ES
                const valDer = calcularValoresResta(nodeId);       // usa overrides/LS

                // medir ancho del nombre p/ calcular caja
                ctx.font = "14px Arial";
                const tw = ctx.measureText(nodo.label || "").width;
                const margin = 20, w = tw + margin * 2;
                const offsetY = w / 4, offsetL = -w / 3 + 2, offsetR = w / 6 + 2;

                const colorTexto = (nodo.font && nodo.font.color) ? nodo.font.color : "#ffffff";
                ctx.fillStyle = colorTexto;

                // izquierda
                ctx.textAlign = "left";
                ctx.fillText(String(valIzq), x + offsetL, y + offsetY);

                // derecha
                ctx.textAlign = "right";
                ctx.fillText(String(valDer), x + offsetR, y + offsetY);

                // (Opcional) si quieres la línea horizontal/vertical del nodo, ponlas aquí
                // ctx.beginPath(); ctx.moveTo(x - w/2, y); ctx.lineTo(x + w/2, y);
                // ctx.strokeStyle = colorTexto; ctx.stroke();
                // ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + w/2);
                // ctx.strokeStyle = colorTexto; ctx.stroke();
            });
        });


        nodos.on("*", () => { recomputeTiming(); network.redraw(); });
        aristas.on("*", () => { recomputeTiming(); network.redraw(); });
    }

    // Inicializar red
    inicializarRed();
});
