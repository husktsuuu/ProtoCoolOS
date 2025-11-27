document.addEventListener('DOMContentLoaded', function () {
    const grafoContainer = document.getElementById('grafo-container');
    const matrizContainer = document.getElementById('matriz-container');
    const matrizHeader = document.getElementById('matriz-header');
    const matrizBody = document.getElementById('matriz-body');
    // Controles de export / import (coinciden con los ids en el HTML)
    const guardarBtn = document.getElementById('guardarBtn');
    const exportOptions = document.getElementById('exportOptions');
    const exportPNG = document.getElementById('exportPNG');
    const exportPDF = document.getElementById('exportPDF');
    const exportJSON = document.getElementById('exportJSON');
    const cargarBtn = document.getElementById('cargarBtn');
    const importarArchivo = document.getElementById('importarArchivo');
    const colorPicker = document.getElementById('cambiarColorBtn');
    let nodos = new vis.DataSet();
    let aristas = new vis.DataSet();
    let network = null;
    let estado = { seleccionando: false, nodoOrigen: null, colorActual: '#d2e5ff', modoEliminar: false };
    let ultimoIdNodo = 0; // Mantener el control del último ID de nodo utilizado

    const opciones = {
        nodes: {
            shape: 'circle',
            color: {
                background: '#d2e5ff',
                border: '#2b7ce9',
                highlight: {
                    background: '#ffd700',
                    border: '#ff8c00'
                }
            },
            font: {
                size: 16,
                color: '#000000',
                face: 'Roboto'
            },
            borderWidth: 2,
            size: 25
        },
        edges: {
            arrows: {
                to: { enabled: true, scaleFactor: 0.7 }
            },
            color: {
                color: '#333',
                highlight: '#7E22CE'
            },
            width: 1.5,
            font: {
                align: 'top',
                color: '#000'
            }
        },
        physics: {
            enabled: true
        },
        layout: {
            improvedLayout: true
        },
        interaction: {
            dragNodes: true,
            hover: true
        }
    };


    function inicializarRed() {
        const datos = {
            nodes: nodos,
            edges: aristas
        };
        network = new vis.Network(grafoContainer, datos, opciones);

        network.on("click", function (params) { // Entrar al modo eliminar
            if (estado.modoEliminar) {
                const nodeId = this.getNodeAt(params.pointer.DOM);
                const edgeId = this.getEdgeAt(params.pointer.DOM);
                if (nodeId) {
                    nodos.remove({ id: nodeId });
                    const aristasAsociadas = aristas.get({
                        filter: function (arista) {
                            return arista.from === nodeId || arista.to === nodeId;
                        }
                    });
                    aristas.remove(aristasAsociadas);
                } else if (edgeId) {
                    aristas.remove({ id: edgeId });
                }
                return;
            }

            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                if (estado.seleccionando) { // Verificación de nodo seleccionado
                    const nodoOrigen = estado.nodoOrigen;
                    const nodoDestino = nodeId;
                    if (nodoOrigen !== nodoDestino && !aristaDuplicada(nodoOrigen, nodoDestino)) { // Acción para creación arista ida o vuelta
                        let atributoArista;
                        do {
                            atributoArista = prompt("Ingrese el atributo de la arista (ej. peso):", "");
                            if (atributoArista === null) break; // El usuario canceló el prompt
                        } while (isNaN(atributoArista) || atributoArista.trim() === ""); // Repetir mientras la entrada no sea un número o esté vacía

                        if (atributoArista !== null) { // Verificar nuevamente por si el usuario canceló el prompt
                            aristas.add({
                                from: nodoOrigen,
                                to: nodoDestino,
                                label: atributoArista
                            });
                        }
                    }
                    estado.seleccionando = false;
                    estado.nodoOrigen = null;
                } else {
                    estado.seleccionando = true;
                    estado.nodoOrigen = nodeId;
                }
            } else { // Si no hay nodo para seleccionar
                const coordenadas = params.pointer.canvas;
                const nombreNodo = prompt("Ingrese el nombre del nodo:", `Nodo ${ultimoIdNodo + 1}`);
                if (nombreNodo !== null) {
                    crearNodo(coordenadas.x, coordenadas.y, estado.colorActual, nombreNodo);
                }
            }
        });

        network.on("oncontext", function (params) { // Cambiar nombre nodo o arista con click derecho
            params.event.preventDefault();
            const nodeId = this.getNodeAt(params.pointer.DOM);
            const edgeId = this.getEdgeAt(params.pointer.DOM);

            if (nodeId !== undefined) {
                const nuevoNombre = prompt("Ingrese el nuevo nombre del nodo:", "");
                if (nuevoNombre !== null) {
                    nodos.update({ id: nodeId, label: nuevoNombre });
                }
            } else if (edgeId !== undefined) {
                const nuevoAtributo = prompt("Ingrese el nuevo atributo de la arista:", "");
                if (nuevoAtributo !== null) {
                    aristas.update({ id: edgeId, label: nuevoAtributo });
                }
            }
        });

        nodos.on("*", function () { // Verificar acciones sobre nodo
            actualizarMatriz();
            comprobarVisibilidadMatriz();
        });
        aristas.on("*", function () { // Verificar acciones sobre aristas
            actualizarMatriz();
            comprobarVisibilidadMatriz();
        });
    }

    function crearNodo(x, y, color, nombre) { //Crear nodo
        ultimoIdNodo++; // Incrementar el ID del último nodo para asegurar que sea único
        nodos.add({
            id: ultimoIdNodo,
            label: nombre,
            x: x,
            y: y,
            color: color,
            physics: false
        });
    }

    function aristaDuplicada(origen, destino) { // Verificar si no existe ya una arista en la misma dirección al mismo nodo
        const aristasExistentes = aristas.get({
            filter: function (item) {
                return (item.from === origen && item.to === destino);
            }
        });
        return aristasExistentes.length > 0;
    }

    function loopExistente(nodo) { // Verificar si no hay arista loop en el mismo nodo
        const loops = aristas.get({
            filter: function (item) {
                return item.from === nodo && item.to === nodo;
            }
        });
        return loops.length > 0;
    }

    function comprobarVisibilidadMatriz() { // Comprobar si la matriz está vacía o no
        matrizContainer.style.display = nodos.length === 0 && aristas.length === 0 ? 'none' : 'block';
    }

    function actualizarMatriz() {

        if (nodos.length === 0 || aristas.length === 0) {
            matrizHeader.innerHTML = '';
            matrizBody.innerHTML = '';
            return; // Salir de la función si no hay nodos o aristas
        }

        // Asegurándose de que solo se usan nodos existentes
        let nodosInicio = new Set(aristas.get().map(arista => arista.from).filter(id => nodos.get(id)));
        let nodosDestino = new Set(aristas.get().map(arista => arista.to).filter(id => nodos.get(id)));

        // Llenar los conjuntos basados en las aristas actuales
        aristas.get().forEach(arista => {
            nodosInicio.add(arista.from);
            nodosDestino.add(arista.to);
        });

        // Convertir a arrays para poder iterar y crear la matriz
        const nodosInicioArray = [...nodosInicio];
        const nodosDestinoArray = [...nodosDestino];

        // Crear una matriz vacía basada en los nodos de inicio y destino
        let matriz = nodosInicioArray.reduce((acc, inicio) => ({
            ...acc,
            [inicio]: nodosDestinoArray.reduce((destAcc, destino) => ({
                ...destAcc,
                [destino]: 0
            }), {})
        }), {});

        // Llenar la matriz con las aristas existentes
        aristas.get().forEach(arista => {
            const valor = arista.label ? parseInt(arista.label, 10) : 0;
            if (matriz[arista.from] && matriz[arista.from][arista.to] !== undefined) {
                matriz[arista.from][arista.to] = isNaN(valor) ? 0 : valor;
            }
        });

        // Generar el HTML de la matriz
        generarHTMLMatriz(matriz, nodosInicioArray, nodosDestinoArray);
    }

    function generarHTMLMatriz(matriz, nodosInicioIds, nodosDestinoIds) {
        nodosInicioIds = nodosInicioIds.filter(id => nodos.get(id) != null);
        nodosDestinoIds = nodosDestinoIds.filter(id => nodos.get(id) != null);

        if (nodosInicioIds.length === 0 || nodosDestinoIds.length === 0) {
            matrizHeader.innerHTML = '';
            matrizBody.innerHTML = '';
            return;
        }
        const nodosInicioLabels = nodosInicioIds.map(id => nodos.get(id).label);
        const nodosDestinoLabels = nodosDestinoIds.map(id => nodos.get(id).label);

        // Ajustar encabezado de la matriz para nodos destino
matrizHeader.innerHTML = `<th></th>${nodosDestinoLabels.map(label => `<th>${label}</th>`).join('')}`;
matrizBody.innerHTML = nodosInicioIds.map(id => {
    const fila = nodosDestinoIds.map(idDestino => matriz[id][idDestino]).join('</td><td>');
    return `<tr><th>${nodos.get(id).label}</th><td>${fila}</td></tr>`;
}).join('');
    }


    function exportarComoPNG(nombreArchivo) { // Exportar imagen del grafo
        html2canvas(grafoContainer).then(canvas => {
            let enlace = document.createElement('a');
            enlace.download = nombreArchivo || 'grafo.png';
            enlace.href = canvas.toDataURL('image/png');
            enlace.click();
            enlace.remove();
        });
    }

    async function exportarComoPDF(nombreArchivo) { // Exportar PDF del grafo
        const canvas = await html2canvas(grafoContainer);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
            orientation: 'landscape',
        });
        pdf.addImage(imgData, 'PNG', 10, 10);
        pdf.save(nombreArchivo || 'grafo.pdf');
    }

    function exportarGrafo(nombreArchivo) { // Exportar el archivo JSON del grafo y la matriz
        const datosExportar = {
            nodos: nodos.get({ returnType: "Object" }),
            aristas: aristas.get(),
            estado: estado
        };
        const datosStr = JSON.stringify(datosExportar);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(datosStr);

        let exportarLink = document.createElement('a');
        exportarLink.setAttribute('href', dataUri);
        exportarLink.setAttribute('download', nombreArchivo || 'grafo.png');
        document.body.appendChild(exportarLink);

        exportarLink.click();
        document.body.removeChild(exportarLink);
    }

    function importarGrafo(event) { // Importar un archivo JSON de algún grafo
        const archivo = event.target.files[0];
        if (!archivo) {
            return;
        }

        const reader = new FileReader();
        reader.onload = function (fileEvent) {
            try {
                const datos = JSON.parse(fileEvent.target.result);
                nodos.clear();
                aristas.clear();
                nodos.add(Object.values(datos.nodos)); // Agrega nodos manteniendo posiciones
                aristas.add(datos.aristas);
                estado = datos.estado;
                colorPicker.value = estado.colorActual;
                ultimoIdNodo = Math.max(...Object.values(datos.nodos).map(nodo => nodo.id));
                actualizarMatriz();
                comprobarVisibilidadMatriz();
            } catch (error) {
                console.error('Error al importar el archivo', error);
            }
        };
        reader.readAsText(archivo);
    }

    guardarBtn.addEventListener('click', function () { // Se apreta el botón de exportar
        exportOptions.style.display = 'block';
    });

    exportPNG.addEventListener('click', function () { // Se apreta el botón de exportar como PNG
        let nombreArchivo = prompt("Ingrese el nombre del archivo:", "grafo.png");
        exportarComoPNG(nombreArchivo);
        exportOptions.style.display = 'none';
    });

    exportPDF.addEventListener('click', function () { // Se apreta el botón de exportar como PDF
        let nombreArchivo = prompt("Ingrese el nombre del archivo:", "grafo.pdf");
        exportarComoPDF(nombreArchivo);
        exportOptions.style.display = 'none';
    });

    exportJSON.addEventListener('click', function () { // Se apreta el botón de exportar como JSON (editable)
        let nombreArchivo = prompt("Ingrese el nombre del archivo:", "grafo.json");
        exportarGrafo(nombreArchivo);
        exportOptions.style.display = 'none';
    });

    cargarBtn.addEventListener('click', () => importarArchivo.click()); // Se apreta el botón de importar
    importarArchivo.addEventListener('change', importarGrafo);

    document.getElementById('eliminarBtn').addEventListener('click', function () { // Cambia el cursor en modo eliminar
        estado.modoEliminar = !estado.modoEliminar;
        grafoContainer.style.cursor = estado.modoEliminar ? 'crosshair' : '';
    });

    document.getElementById('cambiarColorBtn').addEventListener('input', function (event) { // Cambiar color de nodos 
        estado.colorActual = event.target.value;
    });

    document.getElementById('limpiarBtn').addEventListener('click', function () { // Limpiar grafo completo y actualizar matriz
        nodos.clear();
        aristas.clear();
        estado = { seleccionando: false, nodoOrigen: null, colorActual: estado.colorActual, modoEliminar: false };
        ultimoIdNodo = 0; // Restablecer el contador de ID de nodos al limpiar
        actualizarMatriz(); // La matriz se actualiza al limpiar
        comprobarVisibilidadMatriz();

        // limpiar el contenedor de la respuesta
        const resultadoContainer = document.getElementById('resultado-container');
        resultadoContainer.innerHTML = ''; // Vaciar el contenido del contenedor de resultados
        resultadoContainer.style.display = 'none'; // Opcional: Ocultar el contenedor hasta nuevos resultados
    });


    function hungarianAlgorithm(costMatrix) {
        const numRows = costMatrix.length;
        const numCols = costMatrix[0].length;

        // Paso 1: Restar el mínimo de cada fila
        const minRowValues = costMatrix.map(row => Math.min(...row));
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                costMatrix[i][j] = minRowValues[i] - costMatrix[i][j];
            }
        }

        // Paso 2: Restar el mínimo de cada columna
        const minColValues = Array.from({ length: numCols }, (_, colIndex) => {
            let min = Infinity;
            for (let i = 0; i < numRows; i++) {
                min = Math.min(min, costMatrix[i][colIndex]);
            }
            return min;
        });
        for (let j = 0; j < numCols; j++) {
            for (let i = 0; i < numRows; i++) {
                costMatrix[i][j] = minColValues[j] - costMatrix[i][j];
            }
        }

        // Paso 3: Realizar asignaciones óptimas
        const assignedRows = new Set();
        const assignedCols = new Set();
        const assignments = [];
        while (assignedRows.size < numRows && assignedCols.size < numCols) {
            let minUncoveredValue = Infinity;
            let minUncoveredPosition = { row: -1, col: -1 };
            for (let i = 0; i < numRows; i++) {
                for (let j = 0; j < numCols; j++) {
                    if (!assignedRows.has(i) && !assignedCols.has(j) && costMatrix[i][j] < minUncoveredValue) {
                        minUncoveredValue = costMatrix[i][j];
                        minUncoveredPosition = { row: i, col: j };
                    }
                }
            }

            if (minUncoveredValue !== Infinity) {
                const { row, col } = minUncoveredPosition;
                assignedRows.add(row);
                assignedCols.add(col);
                assignments.push({ row, col });
            } else {
                return null;
            }
        }

        return assignments;
    }

    function hungarianAlgorithmaxim(costMatrix) {
        const numRows = costMatrix.length;
        const numCols = costMatrix[0].length;

        // Paso 1: Encontrar el máximo de cada fila y restarlo de cada elemento
        const maxRowValues = costMatrix.map(row => Math.max(...row));
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                costMatrix[i][j] = maxRowValues[i] - costMatrix[i][j];
            }
        }

        // Paso 2: Encontrar el máximo de cada columna y restarlo de cada elemento
        const maxColValues = Array.from({ length: numCols }, (_, colIndex) => {
            let max = -Infinity;
            for (let i = 0; i < numRows; i++) {
                max = Math.max(max, costMatrix[i][colIndex]);
            }
            return max;
        });
        for (let j = 0; j < numCols; j++) {
            for (let i = 0; i < numRows; i++) {
                costMatrix[i][j] = maxColValues[j] - costMatrix[i][j];
            }
        }

        // Paso 3: Realizar asignaciones óptimas
        const assignedRows = new Set();
        const assignedCols = new Set();
        const assignments = [];
        while (assignedRows.size < numRows && assignedCols.size < numCols) {
            let maxUncoveredValue = -Infinity;
            let maxUncoveredPosition = { row: -1, col: -1 };
            for (let i = 0; i < numRows; i++) {
                for (let j = 0; j < numCols; j++) {
                    if (!assignedRows.has(i) && !assignedCols.has(j) && costMatrix[i][j] > maxUncoveredValue) {
                        maxUncoveredValue = costMatrix[i][j];
                        maxUncoveredPosition = { row: i, col: j };
                    }
                }
            }

            if (maxUncoveredValue !== -Infinity) {
                const { row, col } = maxUncoveredPosition;
                assignedRows.add(row);
                assignedCols.add(col);
                assignments.push({ row, col });
            } else {
                // No se encontró ninguna asignación, el algoritmo ha fallado
                console.error('No se pudo encontrar ninguna asignación válida.');
                return null;
            }
        }

        return assignments;
    }

    function obtenerMatrizActual() {
        if (nodos.length === 0 || aristas.length === 0) {
            console.error('No hay nodos o aristas para generar la matriz.');
            return null; // Retornar null en lugar de una matriz vacía
        }

        // Crear una matriz vacía
        const matriz = [];

        // Obtener los nodos únicos (trabajadores)
        const trabajadores = new Set(aristas.get().map(arista => arista.from));
        const tareas = new Set(aristas.get().map(arista => arista.to));

        // Convertir los conjuntos a arrays para poder iterar
        const trabajadoresArray = [...trabajadores];
        const tareasArray = [...tareas];

        // Llenar la matriz con los valores de las aristas
        trabajadoresArray.forEach((trabajador, i) => {
            const fila = [];
            tareasArray.forEach((tarea, j) => {
                // Buscar la arista que conecta este trabajador con esta tarea
                const arista = aristas.get({
                    filter: function (item) {
                        return item.from === trabajador && item.to === tarea;
                    }
                })[0]; // Suponiendo que solo hay una arista que conecta un trabajador con una tarea

                // Obtener el valor de la arista (costo)
                const costo = arista ? parseInt(arista.label) : 0;
                fila.push(costo);
            });
            matriz.push(fila);
        });

        return matriz;
    }

    document.getElementById('minimizarBtn').addEventListener('click', function () {
        // Obtener la matriz actual y minimizarla
        const matriz = obtenerMatrizActual();
        if (!matriz) {
            console.error('No se pudo generar la matriz.');
            return;
        }

        const resultado = hungarianAlgorithm(matriz); // Aplicar el algoritmo húngaro
        if (!resultado || resultado.length === 0 || resultado[0].length === 0) {
            console.error('No se pudo calcular el resultado.');
            return;
        }

    // Mostrar el resultado en pantalla
    mostrarResultado(resultado);
        // Resaltar las asignaciones en la matriz
        limpiarResaltadosMatriz(); // Limpiar campos resaltados de la matriz
        resaltarAsignaciones(resultado);
        resaltarCaminoEnGrafo(resultado);
    });

    document.getElementById('maximizarBtn').addEventListener('click', function () {
        // Obtener la matriz actual y minimizarla
        const matriz = obtenerMatrizActual();
        if (!matriz) {
            console.error('No se pudo generar la matriz.');
            return;
        }

        const resultado = hungarianAlgorithmaxim(matriz); // Aplicar el algoritmo húngaro
        if (!resultado || resultado.length === 0 || resultado[0].length === 0) {
            console.error('No se pudo calcular el resultado.');
            return;
        }

        // Mostrar el resultado en pantalla
        mostrarResultado(resultado);
        mostrarResultado(resultado);
        // Resaltar las asignaciones en la matriz
        limpiarResaltadosMatriz(); // Limpiar campos resaltados de la matriz
        resaltarAsignaciones(resultado);
        resaltarCaminoEnGrafo(resultado);
    });

    // Función para mostrar el resultado en pantalla
    // Función para mostrar el resultado en pantalla
    // Función para mostrar el resultado en pantalla
    function mostrarResultado(resultado) {
        const resultadoContainer = document.getElementById('resultado-container');
        resultadoContainer.innerHTML = '<h3>Resultado:</h3>';

        const matrizAdyacencia = obtenerMatrizActual(); // Obtener la matriz de adyacencia

        // Obtener los nombres de las filas y columnas
        const nombresFilas = obtenerNombresFilas();
        const nombresColumnas = obtenerNombresColumnas();

        let sumaTotal = 0; // Inicializar la suma total de los costos de las asignaciones

        // Recorrer cada asignación en el resultado y mostrarla en el contenedor
        resultado.forEach(asignacion => {
            const filaNombre = nombresFilas[asignacion.row]; // Obtener el nombre de la fila
            const columnaNombre = nombresColumnas[asignacion.col]; // Obtener el nombre de la columna
            const costo = matrizAdyacencia[asignacion.row][asignacion.col]; // Obtener el costo de la asignación desde la matriz de adyacencia
            resultadoContainer.innerHTML += `<p>${filaNombre} se asigna a ${columnaNombre} con un valor de ${costo}</p>`;

            sumaTotal += costo; // Sumar el costo de esta asignación a la suma total
        });

        // Mostrar la suma total de los costos de las asignaciones
        resultadoContainer.innerHTML += `<h4>Suma total de los costos de las asignaciones: ${sumaTotal}</h4>`;
    resultadoContainer.style.display = 'block'; // Mostrar el contenedor
    }

    // Función para obtener los nombres de las filas
    function obtenerNombresFilas() {
        const filas = document.querySelectorAll('#matriz-body tr');
        const nombresFilas = Array.from(filas).map(fila => fila.firstChild.textContent.trim());
        return nombresFilas;
    }

    // Función para obtener los nombres de las columnas
    function obtenerNombresColumnas() {
        const encabezados = document.querySelectorAll('#matriz-header th');
        const nombresColumnas = Array.from(encabezados).slice(1).map(encabezado => encabezado.textContent.trim());
        return nombresColumnas;
    }
    function resaltarAsignaciones(resultado) {
        const matrizBody = document.getElementById('matriz-body');

        // Obtener las filas y columnas de la matriz
        const filas = matrizBody.querySelectorAll('tr');

        // Obtener los nombres de las filas y columnas
        const nombresFilas = obtenerNombresFilas();
        const nombresColumnas = obtenerNombresColumnas();

        // Iterar sobre cada asignación en el resultado
        resultado.forEach(asignacion => {
            const filaNombre = nombresFilas[asignacion.row];
            const columnaNombre = nombresColumnas[asignacion.col];

            // Encontrar la celda correspondiente en la matriz y resaltarla cambiando el color de fondo
            for (let i = 0; i < filas.length; i++) {
                const fila = filas[i];
                const nombreFila = fila.querySelector('th').textContent.trim();
                if (nombreFila === filaNombre) {
                    const celdas = fila.querySelectorAll('td');
                    for (let j = 0; j < celdas.length; j++) {
                        const celda = celdas[j];
                        const nombreColumna = nombresColumnas[j];
                        if (nombreColumna === columnaNombre) {
                            celda.style.backgroundColor = '#7E22CE'; // Cambiar el color de fondo de la celda
                            break;
                        }
                    }
                    break;
                }
            }
        });
    }

    function limpiarResaltadosMatriz() {
        const celdas = document.querySelectorAll('#matriz-body td');
        celdas.forEach(celda => {
            celda.style.backgroundColor = ''; // Restablece el color de fondo original
        });
    }
function resaltarCaminoEnGrafo(resultado) {
    console.log("🔄 --- INICIO DE PINTADO DE CAMINOS ---");
    console.log("Resultado recibido:", resultado);

    // Restaurar todas las aristas al color original
    const todasLasAristas = aristas.get();
    todasLasAristas.forEach(a => a.color = { color: '#848484', width: 1 });
    aristas.update(todasLasAristas);

    limpiarResaltadosMatriz();

    const nombresFilas = obtenerNombresFilas();
    const nombresColumnas = obtenerNombresColumnas();
    const matriz = obtenerMatrizActual();

    if (!matriz) {
        console.warn("⚠️ No hay matriz disponible para pintar caminos.");
        return;
    }

    const nodosUsadosOrigen = new Set();
    const nodosUsadosDestino = new Set();

    resultado.forEach(asignacion => {
        const nombreOrigen = nombresFilas[asignacion.row]?.trim();
        const nombreDestino = nombresColumnas[asignacion.col]?.trim();
        if (!nombreOrigen || !nombreDestino) return;

        const nodoOrigen = nodos.get().find(n => n.label.trim().toLowerCase() === nombreOrigen.toLowerCase());
        const nodoDestino = nodos.get().find(n => n.label.trim().toLowerCase() === nombreDestino.toLowerCase());
        if (!nodoOrigen || !nodoDestino) {
            console.warn("❌ No se encontró alguno de los nodos:", nombreOrigen, nombreDestino);
            return;
        }

        if (nodosUsadosOrigen.has(nodoOrigen.id) || nodosUsadosDestino.has(nodoDestino.id)) {
            console.log(`⛔ Nodo ${nombreOrigen} o ${nombreDestino} ya asignado. Se salta.`);
            return;
        }

        nodosUsadosOrigen.add(nodoOrigen.id);
        nodosUsadosDestino.add(nodoDestino.id);

        const valorEsperado = matriz[asignacion.row][asignacion.col];
        console.log(`🎯 Asignando ${nombreOrigen} → ${nombreDestino} con valor ${valorEsperado}`);

        // Buscar arista exacta
        const aristaCorrecta = aristas.get().find(a =>
            a.from === nodoOrigen.id &&
            a.to === nodoDestino.id &&
            parseInt(a.label) === valorEsperado
        );

        if (aristaCorrecta) {
            console.log(`✅ Arista encontrada (ID ${aristaCorrecta.id}) entre ${nombreOrigen} y ${nombreDestino}`);
            aristas.update([{ id: aristaCorrecta.id, color: { color: '#7E22CE' }, width: 4 }]);
        } else {
            console.warn(`⚠️ No se encontró arista que conecte ${nombreOrigen} → ${nombreDestino} con valor ${valorEsperado}`);
        }
    });

    resaltarAsignaciones(resultado);

    console.log("✅ --- FIN DE PINTADO DE CAMINOS ---");
}




    inicializarRed();
});