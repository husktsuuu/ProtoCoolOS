document.addEventListener('DOMContentLoaded', function() {
    // --- Inicialización del grafo y papel ---
    var graph = new joint.dia.Graph();
    var paper = new joint.dia.Paper({
        el: document.getElementById('graficoContainer'),
        model: graph,
        width: 800,
        height: 430,
        gridSize: 1,
        background: { color: '#ffffff' },
        interactive: { vertexAdd: false, labelMove: true },
        defaultLink: new joint.shapes.standard.Link({
            attrs: {
                line: {
                    stroke: document.getElementById('cambiarColorAristaBtn').value,
                    strokeWidth: 3,
                    targetMarker: null
                }
            }
        }),
        validateConnection: function(cellViewS, magnetS, cellViewT, magnetT) {
            if (cellViewS === cellViewT) return false;
            return !graph.getConnectedLinks(cellViewS.model).some(l =>
                l.getTargetElement() === cellViewT.model || l.getSourceElement() === cellViewT.model
            );
        },
        linkPinning: false,
        markAvailable: true
    });

    // --- Variables globales ---
    var modoEdicion = true;  // 🔥 ACTIVADO POR DEFECTO
    var modoEliminar = false;

    // Marcar el checkbox visual como activo
    document.querySelector('input[type="checkbox"]').checked = true;

    // --- Funciones de edición ---
    function cambiarModoEdicion() {
        modoEdicion = !modoEdicion;
        paper.setInteractivity(modoEdicion ? { vertexAdd: false, labelMove: true } : false);
    }

    document.querySelector('input[type="checkbox"]').addEventListener('change', cambiarModoEdicion);

    // --- Crear nodos ---
    function createNode(x, y, label) {
        const colorNodo = document.getElementById('cambiarColorBtn').value;
        const colorTexto = document.getElementById('cambiarColorTextoBtn').value;

        var node = new joint.shapes.standard.Circle({
            position: { x: x - 25, y: y - 25 },
            size: { width: 50, height: 50 },
            attrs: {
                body: { fill: colorNodo, stroke: '#000', strokeWidth: 3 },
                label: {
                    text: label,
                    fill: colorTexto,
                    fontSize: 14,
                    fontWeight: 'bold',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle'
                }
            }
        });
        graph.addCell(node);
        return node;
    }

    paper.on('blank:pointerdown', function(evt, x, y) {
        if (modoEdicion) {
            var nombre = prompt("Ingrese el nombre del nodo:");
            if (nombre) createNode(x, y, nombre);
        }
    });

    // --- Crear aristas ---
    paper.on('link:connect', function(linkView) {
        var peso = prompt('Ingrese el peso de la arista (número):');
        if (peso && !isNaN(peso)) {
            linkView.model.label(0, {
                attrs: {
                    text: {
                        text: peso,
                        fill: '#000',
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                }
            });
        } else {
            alert('Debe ingresar un número válido.');
            linkView.model.remove();
        }
    });

    // --- Restaurar colores ---
    function restaurarColoresOriginales() {
        graph.getLinks().forEach(edge => {
            edge.attr('line/stroke', document.getElementById('cambiarColorAristaBtn').value);
            edge.attr('line/strokeWidth', 3);
        });
        document.getElementById('resultado-container').innerText = '';
    }

    document.getElementById('volverColorOrig').addEventListener('click', restaurarColoresOriginales);

    // --- Algoritmo de Kruskal ---
    function kruskal(tipo = 'min') {
        const edges = graph.getLinks().map(e => ({
            link: e,
            peso: parseFloat(e.labels()[0].attrs.text.text),
            source: e.source().id,
            target: e.target().id
        }));

        edges.sort((a, b) => tipo === 'min' ? a.peso - b.peso : b.peso - a.peso);

        const uf = {};
        function find(x) { return uf[x] ? find(uf[x]) : x; }
        function union(x, y) { uf[find(x)] = find(y); }

        const seleccionadas = [];
        let total = 0;

        for (const e of edges) {
            if (find(e.source) !== find(e.target)) {
                union(e.source, e.target);
                seleccionadas.push(e);
                total += e.peso;
            }
        }

        document.getElementById('resultado-container').innerText =
            seleccionadas.map(e => e.peso).join(' + ') + ' = ' + total;

        restaurarColoresOriginales();
        seleccionadas.forEach(e => {
            e.link.attr('line/stroke', tipo === 'min' ? '#00C853' : '#FF1744');
            e.link.attr('line/strokeWidth', 4);
        });
    }

    // --- Botones ---
    document.getElementById('solMinBtn').addEventListener('click', () => kruskal('min'));
    document.getElementById('solMaxBtn').addEventListener('click', () => kruskal('max'));

    document.getElementById('eliminarBtn').addEventListener('click', function() {
        modoEliminar = !modoEliminar;
        if (modoEliminar && !modoEdicion) {
            alert("Activa primero el modo edición para eliminar.");
            modoEliminar = false;
        }
        paper.el.style.cursor = modoEliminar ? 'crosshair' : 'default';
    });

    paper.on('element:pointerclick', view => { if (modoEliminar && modoEdicion) graph.removeCells([view.model]); });
    paper.on('link:pointerclick', view => { if (modoEliminar && modoEdicion) graph.removeCells([view.model]); });

    document.getElementById('limpiarBtn').addEventListener('click', () => {
        graph.resetCells();
        document.getElementById('resultado-container').innerText = '';
    });

    // --- Guardar y cargar ---
    document.getElementById('guardarBtn').addEventListener('click', function() {
        const nombre = prompt("Nombre del archivo:");
        if (nombre) {
            const json = JSON.stringify(graph.toJSON());
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = nombre + ".json";
            a.click();
        }
    });

    document.getElementById('cargarBtn').addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => graph.fromJSON(JSON.parse(reader.result));
            reader.readAsText(file);
        };
        input.click();
    });
});