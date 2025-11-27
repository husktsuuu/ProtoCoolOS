document.addEventListener('DOMContentLoaded', function () {
    const grafoContainer = document.getElementById('grafo-container');
    const matrizContainer = document.getElementById('matriz-container');
    const matrizHeader = document.getElementById('matriz-header');
    const matrizBody = document.getElementById('matriz-body');
    const exportarBtn = document.getElementById('exportarBtn');
    const importarBtn = document.getElementById('importarBtn');
    const importarArchivo = document.getElementById('importarArchivo');
    const colorPicker = document.getElementById('cambiarColorBtn');
    let nodos = new vis.DataSet();
    let aristas = new vis.DataSet();
    let network = null;
    let estado = { seleccionando: false, nodoOrigen: null, colorActual: '#d2e5ff', modoEliminar: false };
    let ultimoIdNodo = 0; // Mantener el control del último ID de nodo utilizado

    const opciones = { //Opciones de grafo
        nodes: {
            shape: 'circle',
            font: {
                size: 14,
                color: '#ffffff',
                multi: true
            },
            borderWidth: 2,
            scaling: {
                min: 16,
                max: 32,
                label: {
                    enabled: true,
                    min: 14,
                    max: 30,
                    drawThreshold: 8,
                    maxVisible: 20
                }
            }
        },
        edges: {
            arrows: 'to',
            selfReferenceSize: 20,
            selfReference: {
                angle: Math.PI / 4
            },
            font: {
                align: 'middle'
            }
        },
        physics: {
            enabled: true
        },
        interaction: {
            dragNodes: true
        }
    };


    function inicializarRed() {
        const datos = {
            nodes: nodos,
            edges: aristas
        };
        network = new vis.Network(grafoContainer, datos, opciones);

        network.on("click", function (params) {
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
                    actualizarMatriz();
                } else if (edgeId) {
                    aristas.remove({ id: edgeId });
                    actualizarMatriz();
                }
                return;
            }

            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                if (estado.seleccionando) {
                    const nodoOrigen = estado.nodoOrigen;
                    const nodoDestino = nodeId;

                    // 🚫 Evitar loops
                    if (nodoOrigen === nodoDestino) {
                        alert("No se pueden crear aristas que conecten un nodo consigo mismo.");
                        estado.seleccionando = false;
                        estado.nodoOrigen = null;
                        return;
                    }

                    // Verificar si ya existe la arista
                    if (!aristaDuplicada(nodoOrigen, nodoDestino)) {
                        let atributoArista;
                        do {
                            atributoArista = prompt("Ingrese el atributo de la arista (ej. peso):", "");
                            if (atributoArista === null) break;
                        } while (isNaN(atributoArista) || atributoArista.trim() === "");

                        if (atributoArista !== null) {
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
            } else {
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
        // Crear un conjunto único para nodos de inicio y destino

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
        generarHTMLMatrizNW(matriz, nodosInicioArray, nodosDestinoArray);
    }

    function maximizar(matriz) {
        // Copia profunda de la matriz para no modificar la original
        let matrizMaximizada = JSON.parse(JSON.stringify(matriz));

        for (let i = 0; i < matrizMaximizada.length - 1; i++) { // Ignorar la última fila
            for (let j = 0; j < matrizMaximizada[i].length - 1; j++) { // Ignorar la última columna
                matrizMaximizada[i][j] = -matrizMaximizada[i][j];
            }
        }

        return matrizMaximizada; // Devuelve la matriz con los valores negados
    }

    // NUEVA función: pinta tabla con columna Demanda y fila Oferta
    function generarHTMLMatrizNW(matriz, nodosInicioIds, nodosDestinoIds) {
        // Filtrar solo nodos existentes
        nodosInicioIds = nodosInicioIds.filter(id => nodos.get(id) != null);
        nodosDestinoIds = nodosDestinoIds.filter(id => nodos.get(id) != null);

        if (nodosInicioIds.length === 0 || nodosDestinoIds.length === 0) {
            matrizHeader.innerHTML = '';
            matrizBody.innerHTML = '';
            return;
        }

        const nodosInicioLabels = nodosInicioIds.map(id => (nodos.get(id)?.label ?? ''));
        const nodosDestinoLabels = nodosDestinoIds.map(id => (nodos.get(id)?.label ?? ''));

        // ===== HEADER =====
        let headerHtml = '<th></th>'; // esquina superior izquierda
        headerHtml += nodosDestinoLabels
            .map((label, idx) => `<th data-colid="${nodosDestinoIds[idx]}">${label}</th>`)
            .join('');
        headerHtml += '<th>Demanda</th>'; // <-- NUEVA COLUMNA
        matrizHeader.innerHTML = headerHtml;

        // ===== BODY (filas con DEMANDA al final) =====
        const bodyRows = nodosInicioIds.map((idFila, i) => {
            const nombreFila = nodosInicioLabels[i];
            const celdasCostos = nodosDestinoIds
                .map(idDestino => matriz[idFila][idDestino])
                .join('</td><td>');

            const celdaDemanda = `
      <td>
        <input type="number" class="demanda-input"
               data-fila="${idFila}" value="0" min="0" step="1" style="width:6em;">
      </td>`;

            return `<tr data-rowid="${idFila}">
              <th>${nombreFila}</th>
              <td>${celdasCostos}</td>
              ${celdaDemanda}
            </tr>`;
        });

        // ===== Fila OFERTA (inputs por columna) =====
        const ofertaCeldas = nodosDestinoIds
            .map(idCol => `
      <td>
        <input type="number" class="oferta-input"
               data-col="${idCol}" value="0" min="0" step="1" style="width:6em;">
      </td>`)
            .join('');

        const filaOferta = `<tr><th>Oferta</th>${ofertaCeldas}<td class="corner">—</td></tr>`;

        matrizBody.innerHTML = bodyRows.join('') + filaOferta;

        // DEBUG visual para confirmar que esta función sí es la que se ejecuta:
        // console.log('[NW] Tabla con Demanda/Oferta dibujada');
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

    document.getElementById('minimizarBtn').addEventListener('click', function () {
        const matriz0 = obtenerMatrizActual();
        if (matriz0 === null) {
            alert('No se puede generar la matriz.');
            return;
        }

        // Balancear si hace falta
        const matriz = balancearMatriz(matriz0);

        // Resolver con NorthWest clásico (minimización)
        const asignaciones = metodoEsquinaNoroeste(matriz);

        // Mostrar resultado
        mostrarResultado(asignaciones, matriz);
    });



    document.getElementById('maximizarBtn').addEventListener('click', function () {
        const matriz0 = obtenerMatrizActual();
        if (matriz0 === null) {
            alert('No se puede generar la matriz.');
            return;
        }

        // Balancear si hace falta
        const matriz = balancearMatriz(matriz0);

        // Resolver con método modificado para maximizar
        const asignaciones = metodoEsquinaNoroesteM(matriz);

        // Mostrar resultado
        mostrarResultado(asignaciones, matriz);
    });


    function balancearMatriz(matriz) {
        // Sumas actuales
        const ultimaFila = matriz[matriz.length - 1];
        const ultimaColumna = matriz.map(fila => fila[matriz[0].length - 1]);
        const sumaUltimaFila = ultimaFila.reduce((acc, val) => acc + val, 0);       // oferta total
        const sumaUltimaColumna = ultimaColumna.reduce((acc, val) => acc + val, 0); // demanda total

        // Si ya está balanceada, devolver tal cual
        if (sumaUltimaFila === sumaUltimaColumna) return matriz;

        // Clonar superficialmente (arreglos anidados nuevos)
        const M = matriz.map(f => f.slice());

        // Oferta < Demanda  => agregar columna ficticia (oferta ficticia)
        if (sumaUltimaFila < sumaUltimaColumna) {
            const diferencia = sumaUltimaColumna - sumaUltimaFila;
            // Insertar columna de costo 0 justo antes de la última columna (demanda)
            for (let i = 0; i < M.length - 1; i++) {
                M[i].splice(M[i].length - 1, 0, 0);
            }
            // En la fila de ofertas, insertar la oferta ficticia
            const filaOfertas = M[M.length - 1];
            filaOfertas.splice(filaOfertas.length - 1, 0, diferencia);
        } else {
            // Demanda < Oferta => agregar fila ficticia (demanda ficticia)
            const diferencia = sumaUltimaFila - sumaUltimaColumna;
            const nuevaFila = new Array(M[0].length).fill(0);
            // colocar demanda ficticia en la última columna
            nuevaFila[nuevaFila.length - 1] = diferencia;
            // Insertar justo antes de la fila de ofertas
            M.splice(M.length - 1, 0, nuevaFila);
        }

        return M;
    }


    function obtenerMatrizActual() {
        if (nodos.length === 0 || aristas.length === 0) return null;

        // Orden de FILAS (orígenes)
        const filasTr = Array.from(document.querySelectorAll('#matriz-body tr[data-rowid]'));
        const filasIds = filasTr.map(tr => parseInt(tr.getAttribute('data-rowid'), 10));

        // Orden de COLUMNAS (destinos)
        const thCols = Array.from(document.querySelectorAll('#matriz-header th[data-colid]'));
        const colsIds = thCols.map(th => parseInt(th.getAttribute('data-colid'), 10));

        if (filasIds.length === 0 || colsIds.length === 0) return null;

        // Matriz de costos desde aristas (grafo = costos)
        const matrizCostos = [];
        filasIds.forEach(idOrigen => {
            const fila = [];
            colsIds.forEach(idDestino => {
                const arista = aristas.get({
                    filter: it => it.from === idOrigen && it.to === idDestino
                })[0];
                const costo = arista ? parseInt(arista.label, 10) : 0;
                fila.push(isNaN(costo) ? 0 : costo);
            });
            matrizCostos.push(fila);
        });

        // Demanda (última columna por fila)
        const demandas = filasIds.map(idFila => {
            const inp = document.querySelector(`.demanda-input[data-fila="${idFila}"]`);
            const v = inp ? parseInt(inp.value, 10) : 0;
            return isNaN(v) ? 0 : v;
        });

        // Oferta (fila final por columna)
        const ofertas = colsIds.map(idCol => {
            const inp = document.querySelector(`.oferta-input[data-col="${idCol}"]`);
            const v = inp ? parseInt(inp.value, 10) : 0;
            return isNaN(v) ? 0 : v;
        });

        // Ensamble final (como requiere tu NorthWest actual):
        //  - Última COLUMNA = Demanda
        //  - Última FILA     = Oferta
        const matrizConDemanda = matrizCostos.map((fila, idx) => [...fila, demandas[idx]]);
        const filaOferta = [...ofertas, 0];
        const matrizFinal = [...matrizConDemanda, filaOferta];

        return matrizFinal;
    }


    function metodoEsquinaNoroesteM(matriz) {
        const demandas = []; // Demanda de cada fila
        const ofertas = []; // Oferta de cada columna
        const asignaciones = []; // Asignaciones

        // Inicializar las demandas y las ofertas
        for (let i = 0; i < matriz.length - 1; i++) { // Excluyendo la última fila de ofertas
            demandas.push(matriz[i][matriz[i].length - 1]); // Último elemento de cada fila (excepto la última)
        }
        for (let j = 0; j < matriz[matriz.length - 1].length - 1; j++) { // Excluyendo el último elemento de demandas
            ofertas.push(matriz[matriz.length - 1][j]); // Elementos de la última fila (excepto el último)
        }

        // Inicializar la matriz de asignaciones con ceros
        // Método de esquina noroeste modificado para maximizar
        for (let i = 0; i < matriz.length - 1; i++) {
            asignaciones.push(new Array(matriz[i].length - 1).fill(0));
        }

        let i = 0, j = 0;
        while (i < demandas.length && j < ofertas.length) {
            // Encuentra el índice del valor más grande (más cercano a cero si son negativos)
            let maxCostoIndex = -1;
            let maxCosto = Number.NEGATIVE_INFINITY;
            for (let k = 0; k < matriz[i].length - 1; k++) {
                if (matriz[i][k] > maxCosto && ofertas[k] > 0) {
                    maxCostoIndex = k;
                    maxCosto = matriz[i][k];
                }
            }

            // Si no encontramos un costo válido, pasamos a la siguiente demanda.
            if (maxCostoIndex === -1) {
                i++;
                continue;
            }

            // Realiza la asignación con el mayor costo disponible.
            const asignacion = Math.min(demandas[i], ofertas[maxCostoIndex]);
            asignaciones[i][maxCostoIndex] = asignacion;
            demandas[i] -= asignacion;
            ofertas[maxCostoIndex] -= asignacion;

            if (demandas[i] === 0) i++;
            if (ofertas[maxCostoIndex] === 0) j++;
        }

        return asignaciones;
    }

    function metodoEsquinaNoroeste(matriz) {
        const demandas = []; // Demanda de cada fila
        const ofertas = []; // Oferta de cada columna
        const asignaciones = []; // Asignaciones

        // Obtener la demanda de cada fila y la oferta de cada columna
        for (let i = 0; i < matriz.length - 1; i++) {
            demandas.push(matriz[i][matriz[i].length - 1]);
        }
        for (let j = 0; j < matriz[0].length - 1; j++) {
            ofertas.push(matriz[matriz.length - 1][j]);
        }

        // Inicializar la matriz de asignaciones con ceros
        for (let i = 0; i < demandas.length; i++) {
            asignaciones.push(new Array(ofertas.length).fill(0));
        }

        // Ejecutar el algoritmo del método de esquina Noroeste
        let i = 0;
        let j = 0;
        while (i < demandas.length && j < ofertas.length) {
            const asignacion = Math.min(demandas[i], ofertas[j]); // Obtener el mínimo entre la demanda y la oferta
            asignaciones[i][j] = asignacion; // Asignar la cantidad mínima en la posición (i, j)
            demandas[i] -= asignacion; // Reducir la demanda
            ofertas[j] -= asignacion; // Reducir la oferta
            if (demandas[i] === 0) i++; // Pasar a la siguiente fila si la demanda se satisface
            if (ofertas[j] === 0) j++; // Pasar a la siguiente columna si la oferta se satisface
        }

        return asignaciones;
    }

    function mostrarResultado(asignaciones, matrizOriginal) {
        // Obtener los nombres de filas y columnas
        const nombresFilas = obtenerNombresFilas();
        const nombresColumnas = obtenerNombresColumnas();

        // Detectar si se agregaron filas o columnas auxiliares (ficticias)
        if (asignaciones.length > nombresFilas.length) {
            nombresFilas.push("Ficticia");
        }
        if (asignaciones[0].length > nombresColumnas.length) {
            nombresColumnas.push("Ficticia");
        }


        // Obtener el contenedor donde se mostrará el resultado
        const resultadoContainer = document.getElementById('resultado-container');

        // Crear una cadena para almacenar la salida formateada como una tabla HTML
        let tablaHTML = '<table class="matrix-table">';

        // Agregar encabezados de columnas
        tablaHTML += '<tr><th></th>';
        nombresColumnas.forEach(nombre => {
            tablaHTML += `<th>${nombre}</th>`;
        });
        tablaHTML += '</tr>';

        // Inicializar el costo total
        let costoTotal = 0;

        // Iterar sobre las filas de la matriz de asignaciones
        asignaciones.forEach((fila, i) => {
            tablaHTML += '<tr>';
            tablaHTML += `<th>${nombresFilas[i]}</th>`; // Agregar el nombre de la fila
            // Iterar sobre las columnas de la matriz de asignaciones
            fila.forEach((asignacion, j) => {
                // Multiplicar la asignación por el valor correspondiente en la matriz original
                const producto = asignacion * matrizOriginal[i][j];
                // Agregar una clase CSS especial si el espacio tiene resultado
                const claseResultado = asignacion !== 0 ? 'resultado' : '';
                tablaHTML += `<td class="${claseResultado}">${asignacion}</td>`;
                // Sumar el producto al costo total
                costoTotal += producto;
            });
            const totalFila = fila.reduce((acc, asignacion) => acc + asignacion, 0);
            tablaHTML += `<td>${totalFila}</td>`;
            tablaHTML += '</tr>';
        });

        // Agregar la última fila (total por columna)
        tablaHTML += '<tr><th>Demanda</th>';
        asignaciones[0].forEach((_, j) => {
            const totalColumna = asignaciones.reduce((acc, fila) => acc + fila[j], 0);
            tablaHTML += `<td>${totalColumna}</td>`;
        });
        const totalGeneral = asignaciones.flat().reduce((acc, asignacion) => acc + asignacion, 0);
        tablaHTML += `<td>${totalGeneral}</td>`;
        tablaHTML += '</tr>';

        // Agregar el costo total al resultado
        tablaHTML += `<tr><th>Costo Total</th><td colspan="${nombresColumnas.length + 1}">${costoTotal}</td></tr>`;

        tablaHTML += '</table>';

        // Mostrar la tabla en el contenedor
        resultadoContainer.innerHTML = tablaHTML;
        resultadoContainer.style.display = 'block'; // Mostrar el contenedor si estaba oculto
    }





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

    inicializarRed();
});