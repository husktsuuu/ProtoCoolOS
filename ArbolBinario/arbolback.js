document.addEventListener('DOMContentLoaded', function () {
    class TreeNode {
        constructor(value) {
            this.value = value;
            this.left = null;
            this.right = null;
        }
    }

    class BinaryTree {
        constructor() {
            this.root = null;
        }

        insert(value) {
            const newNode = new TreeNode(value);
            if (this.root === null) {
                this.root = newNode;
            } else {
                this.insertNode(this.root, newNode);
            }
        }

        insertNode(node, newNode) {
            if (newNode.value < node.value) {
                if (node.left === null) {
                    node.left = newNode;
                } else {
                    this.insertNode(node.left, newNode);
                }
            } else {
                if (node.right === null) {
                    node.right = newNode;
                } else {
                    this.insertNode(node.right, newNode);
                }
            }
        }

        // Traversal methods (in-order, pre-order, post-order)
        inOrderTraverse(node, callback) {
            if (node !== null) {
                this.inOrderTraverse(node.left, callback);
                callback(node.value);
                this.inOrderTraverse(node.right, callback);
            }
        }

        preOrderTraverse(node, callback) {
            if (node !== null) {
                callback(node.value);
                this.preOrderTraverse(node.left, callback);
                this.preOrderTraverse(node.right, callback);
            }
        }

        postOrderTraverse(node, callback) {
            if (node !== null) {
                this.postOrderTraverse(node.left, callback);
                this.postOrderTraverse(node.right, callback);
                callback(node.value);
            }
        }

        // Método para insertar una lista de números aleatorios en el árbol
        insertRandomList(quantity, min, max) {
            let i = 0;
            while (i < quantity) {
                const randomValue = Math.floor(Math.random() * (max - min + 1) + min);
                if (!this.contains(randomValue)) {
                    this.insert(randomValue);
                    //console.log('i: ', i, ' valor: ', randomValue);
                    i++;
                }
            }
        }

        remove(value) {
            this.root = this.removeNode(this.root, value);
        }

        // Método modificado para eliminar el nodo y sus hijos directamente
        removeNode(node, value) {
            if (node === null) {
                return null;
            }
            if (value === node.value) {
                // Si el nodo a eliminar es el que se buscaba, se elimina todo el subárbol
                return null; // Elimina el nodo y sus hijos
            } else if (value < node.value) {
                node.left = this.removeNode(node.left, value);
            } else {
                node.right = this.removeNode(node.right, value);
            }
            return node;
        }

        findMinNode(node) {
            if (node.left === null)
                return node;
            else
                return this.findMinNode(node.left);
        }
    }

    // Initialize your tree
    const bt = new BinaryTree();

    // ==========================
    // ACTUALIZA Y DIBUJA EL ÁRBOL BINARIO
    // ==========================
    // Reemplaza TODO tu updateTree() y drawTree() por esto:

    function updateTree() {
        console.log("[updateTree] raíz:", bt.root);
        if (bt.root) {
            drawTree();
        } else {
            const cont = d3.select("#tree");
            cont.select("svg").remove();
            console.warn("[updateTree] No hay raíz, árbol vacío");
        }
    }


    function drawTree() {
        console.log("[drawTree] Iniciando dibujo centrado...");

        const cont = d3.select("#tree");
        cont.select("svg").remove();

        if (!bt.root) {
            console.warn("[drawTree] Árbol vacío, no se dibuja.");
            return;
        }

        const margin = { top: 40, right: 40, bottom: 40, left: 40 };
        const width = 900 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = cont.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${width / 2 + margin.left},${margin.top})`);

        // Crear jerarquía
        const root = d3.hierarchy(bt.root, d => [d.left, d.right].filter(Boolean));
        const treeLayout = d3.tree().size([width, height]);
        treeLayout(root);

        // Ajuste adicional: si tiene solo un hijo, separarlo
        root.each(d => {
            if (d.children && d.children.length === 1) {
                const onlyChild = d.children[0];

                // Calcula desplazamiento proporcional a la profundidad
                const depthFactor = 50 + d.depth * 5;

                // Si el valor del hijo es menor => izquierdo
                if (onlyChild.data.value < d.data.value) {
                    onlyChild.x -= depthFactor; // desplaza más a la izquierda
                    console.log(`[ajuste] Nodo ${onlyChild.data.value} movido a la izquierda (${depthFactor}px)`);
                } else {
                    onlyChild.x += depthFactor; // desplaza más a la derecha
                    console.log(`[ajuste] Nodo ${onlyChild.data.value} movido a la derecha (${depthFactor}px)`);
                }
            }
        });


        // Calcular límites y centrar
        const xMin = d3.min(root.descendants(), d => d.x);
        const xMax = d3.max(root.descendants(), d => d.x);
        const xOffset = -((xMax + xMin) / 2);

        console.log("[drawTree] xMin:", xMin, "xMax:", xMax, "offset:", xOffset);

        // Enlaces
        svg.selectAll(".link")
            .data(root.links())
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#2b6cb0")
            .attr("stroke-width", 2.5)
            .attr("stroke-opacity", 0.9)
            .attr("d", d => `
            M${d.source.x + xOffset},${d.source.y}
            C${d.source.x + xOffset},${(d.source.y + d.target.y) / 2}
             ${d.target.x + xOffset},${(d.source.y + d.target.y) / 2}
             ${d.target.x + xOffset},${d.target.y}
        `);

        // Nodos
        const node = svg.selectAll(".node")
            .data(root.descendants())
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x + xOffset},${d.y})`)
            .on("contextmenu", (event, d) => {
                event.preventDefault();
                bt.remove(d.data.value);
                updateTree();
            });

        node.append("circle")
            .attr("r", 18)
            .attr("fill", "#6bcff4")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 3)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");

        node.append("text")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("fill", "#ffffff")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text(d => d.data.value);

        console.log("[drawTree] Árbol visible y centrado ✅");
    }

    // Asigna un manejador de eventos al botón para agregar números al árbol
    document.getElementById('agregarNumBtn').addEventListener('click', function () {
        const num = prompt('Introduce nuevo nodo:');
        const value = parseInt(num);
        if (!isNaN(value)) {
            if (!bt.contains(value)) { // Verifica si el valor ya está presente en el árbol
                bt.insert(value);
                // Actualiza la visualización del árbol
                updateTree();
            }
        } else {
            alert('Por favor, ingresa un número válido.');
        }
    });

    // Método para verificar si un valor está presente en el árbol
    BinaryTree.prototype.contains = function (value) {
        return this.search(this.root, value);
    };

    // Método de búsqueda recursiva para verificar si un valor está presente en el árbol
    BinaryTree.prototype.search = function (node, value) {
        if (node === null) {
            return false;
        } else if (value < node.value) {
            return this.search(node.left, value);
        } else if (value > node.value) {
            return this.search(node.right, value);
        } else {
            return true;
        }
    };

    // Agregar evento para generar árbol a partir de lista aleatoria
    document.getElementById('listaRandomBtn').addEventListener('click', function () {
        const quantity = parseInt(prompt('Ingrese la cantidad de números aleatorios a generar:'));
        console.log("quantity:", quantity);
        if (!isNaN(quantity)) {
            const min = parseInt(prompt('Ingrese el número más pequeño:'));
            if (!isNaN(min)) {
                const max = parseInt(prompt('Ingrese el número más grande:'));
                if (!isNaN(max)) {
                    bt.root = null; // Limpiar el árbol actual
                    bt.insertRandomList(quantity, min, max); // Insertar números aleatorios
                    updateTree(); // Actualizar la visualización del árbol
                }
            }
        } else {
            alert('Por favor, ingrese números válidos.');
        }
    });

    // Agregar evento para limpiar y refrescar la página
    document.getElementById('limpiarBtn').addEventListener('click', function () {
        location.reload(); // Recargar la página para limpiar y refrescar el árbol
    });

    document.getElementById('ordenarPreBtn').addEventListener('click', function () {
        document.getElementById('tipoOrden').innerText = "Pre-Order";
        const result = [];
        const nodes = [];
        bt.preOrderTraverse(bt.root, function (value) {
            result.push(value);
        });

        document.getElementById('orden').innerText = result.join(', ');

        // Colores originales de los nodos y enlaces
        const originalColors = {
            nodes: [],
            links: []
        };

        function saveOriginalColors() {
            d3.selectAll('.node circle').each(function (d) {
                originalColors.nodes.push({ id: d.data.value, color: d3.select(this).style('fill') });
            });

            d3.selectAll('.link').each(function (d) {
                originalColors.links.push({ id: `${d.source.data.value}->${d.target.data.value}`, color: d3.select(this).style('stroke') });
            });
        }

        function restoreOriginalColors() {
            originalColors.nodes.forEach(function (node) {
                d3.selectAll(`.node circle`).filter(function (d) { return d.data.value === node.id; })
                    .style('fill', node.color);
            });

            originalColors.links.forEach(function (link) {
                d3.selectAll('.link').filter(function (d) { return `${d.source.data.value}->${d.target.data.value}` === link.id; })
                    .style('stroke', link.color);
            });
        }

        saveOriginalColors();

        let index = 0;

        function animateTraversal() {
            if (index < result.length) {
                const currentValue = result[index];
                const linksMust = d3.selectAll('.link').filter(function (d) {
                    return d.target.data.value === currentValue &&
                        (d.source.data.value === result[index + 1] ||
                            (bt.root && bt.root.value === currentValue)); // Root has no parent
                });
                const currentNode = d3.selectAll('.node circle').filter(function (d) { return d.data.value === currentValue; });
                const currentLink = d3.selectAll('.link').filter(function (d) {
                    return `${d.source.data.value}->${d.target.data.value}` === `${currentValue}->${result[index + 1]}`;
                });

                currentNode.transition()
                    .duration(900)
                    .style('fill', '#6bcff4');

                if (!currentLink.empty()) {
                    currentLink.transition()
                        .duration(900)
                        .style('stroke', '#6bcff4');
                }

                linksMust.transition()
                    .duration(900)
                    .style('stroke', '#6bcff4');

                index++;
                setTimeout(animateTraversal, 900); // Espera 1 segundo antes de continuar con el siguiente paso
            } else {
                setTimeout(restoreOriginalColors, 900); // Espera 1 segundo antes de restaurar los colores originales
            }
        }

        animateTraversal();
    });

    document.getElementById('ordenarInBtn').addEventListener('click', function () {
        document.getElementById('tipoOrden').innerText = "In-Order";
        const result = [];
        const nodes = [];
        bt.inOrderTraverse(bt.root, function (value) {
            result.push(value);
        });

        document.getElementById('orden').innerText = result.join(', ');

        // Colores originales de los nodos y enlaces
        const originalColors = {
            nodes: [],
            links: []
        };

        function saveOriginalColors() {
            d3.selectAll('.node circle').each(function (d) {
                originalColors.nodes.push({ id: d.data.value, color: d3.select(this).style('fill') });
            });

            d3.selectAll('.link').each(function (d) {
                originalColors.links.push({ id: `${d.source.data.value}->${d.target.data.value}`, color: d3.select(this).style('stroke') });
            });
        }

        function restoreOriginalColors() {
            originalColors.nodes.forEach(function (node) {
                d3.selectAll(`.node circle`).filter(function (d) { return d.data.value === node.id; })
                    .style('fill', node.color);
            });

            originalColors.links.forEach(function (link) {
                d3.selectAll('.link').filter(function (d) { return `${d.source.data.value}->${d.target.data.value}` === link.id; })
                    .style('stroke', link.color);
            });
        }

        saveOriginalColors();

        let index = 0;

        function animateTraversal() {
            if (index < result.length) {
                const currentValue = result[index];
                const linksMust = d3.selectAll('.link').filter(function (d) {
                    // Color the link to the parent after visiting both children
                    return d.target.data.value === currentValue &&
                        (d.source.data.value === result[index + 1] ||
                            (bt.root && bt.root.value === currentValue)); // Root has no parent
                });
                const currentNode = d3.selectAll('.node circle').filter(function (d) { return d.data.value === currentValue; });
                const currentLink = d3.selectAll('.link').filter(function (d) {
                    return `${d.source.data.value}->${d.target.data.value}` === `${currentValue}->${result[index + 1]}`;
                });

                currentNode.transition()
                    .duration(900)
                    .style('fill', '#6bcff4');

                if (!currentLink.empty()) {
                    currentLink.transition()
                        .duration(900)
                        .style('stroke', '#6bcff4');
                }

                linksMust.transition()
                    .duration(900)
                    .style('stroke', '#6bcff4');

                index++;
                setTimeout(animateTraversal, 900); // Espera 1 segundo antes de continuar con el siguiente paso
            } else {
                setTimeout(restoreOriginalColors, 900); // Espera 1 segundo antes de restaurar los colores originales
            }
        }

        animateTraversal();
    });

    document.getElementById('ordenarPostBtn').addEventListener('click', function () {
        document.getElementById('tipoOrden').innerText = "Post-Order";
        const result = [];
        const nodes = [];
        bt.postOrderTraverse(bt.root, function (value) {
            result.push(value);
        });

        document.getElementById('orden').innerText = result.join(', ');

        // Colores originales de los nodos y enlaces
        const originalColors = {
            nodes: [],
            links: []
        };

        function saveOriginalColors() {
            d3.selectAll('.node circle').each(function (d) {
                originalColors.nodes.push({ id: d.data.value, color: d3.select(this).style('fill') });
            });

            d3.selectAll('.link').each(function (d) {
                originalColors.links.push({ id: `${d.source.data.value}->${d.target.data.value}`, color: d3.select(this).style('stroke') });
            });
        }

        function restoreOriginalColors() {
            originalColors.nodes.forEach(function (node) {
                d3.selectAll(`.node circle`).filter(function (d) { return d.data.value === node.id; })
                    .style('fill', node.color);
            });

            originalColors.links.forEach(function (link) {
                d3.selectAll('.link').filter(function (d) { return `${d.source.data.value}->${d.target.data.value}` === link.id; })
                    .style('stroke', link.color);
            });
        }

        saveOriginalColors();

        let index = 0;

        function animateTraversal() {
            if (index < result.length) {
                const currentValue = result[index];
                const linksMust = d3.selectAll('.link').filter(function (d) {
                    // Color the link to the parent after visiting both children
                    return d.target.data.value === currentValue &&
                        (d.source.data.value === result[index + 1] ||
                            (bt.root && bt.root.value === currentValue)); // Root has no parent
                });
                const currentNode = d3.selectAll('.node circle').filter(function (d) { return d.data.value === currentValue; });
                const currentLink = d3.selectAll('.link').filter(function (d) {
                    return `${d.source.data.value}->${d.target.data.value}` === `${currentValue}->${result[index + 1]}`;
                });

                currentNode.transition()
                    .duration(900)
                    .style('fill', '#6bcff4');

                if (!currentLink.empty()) {
                    currentLink.transition()
                        .duration(900)
                        .style('stroke', '#6bcff4');
                }

                linksMust.transition()
                    .duration(900)
                    .style('stroke', '#6bcff4');

                index++;
                setTimeout(animateTraversal, 900); // Espera 1 segundo antes de continuar con el siguiente paso
            } else {
                setTimeout(restoreOriginalColors, 900); // Espera 1 segundo antes de restaurar los colores originales
            }
        }

        animateTraversal();
    });

    // Obtén el modal
    var modal = document.getElementById("modalContainer");


    // Añadir método isEmpty a BinaryTree para verificar si el árbol está vacío
    BinaryTree.prototype.isEmpty = function () {
        return this.root === null;
    };

    // Obtén el elemento <span> que cierra el modal
    var span = document.getElementsByClassName("close")[0];

    // Cuando el usuario haga clic en <span> (x), cierra el modal
    span.onclick = function () {
        modal.style.display = "none";
    }

    // Cuando el usuario haga clic en cualquier lugar fuera del modal, ciérralo
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    function compararInPost(bt) {
        const inOrder = [];
        const postOrder = [];

        // Llenar las listas inOrder y postOrder
        bt.inOrderTraverse(bt.root, value => inOrder.push(value));
        bt.postOrderTraverse(bt.root, value => postOrder.push(value));

        function buildTree(inOrder, postOrder) {
            if (inOrder.length === 0 || postOrder.length === 0) return null;

            const rootVal = postOrder[postOrder.length - 1];
            const root = new TreeNode(rootVal);

            const index = inOrder.indexOf(rootVal);

            root.left = buildTree(inOrder.slice(0, index), postOrder.slice(0, index));
            root.right = buildTree(inOrder.slice(index + 1), postOrder.slice(index, -1));

            return root;
        }

        document.getElementById('Inorden').innerText = inOrder.join(', ');
        document.getElementById('Postorden').innerText = postOrder.join(', ');

        bt.root = buildTree(inOrder, postOrder);
        // Suponiendo que existe una función updateTree para actualizar la visualización del árbol
        updateTree();
    }

    // ============================
    // EXPORTAR ÁRBOL
    // ============================
    function exportarArbol(nombreArchivo) {
        const datosExportar = {
            root: bt.root
        };
        const datosStr = JSON.stringify(datosExportar, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(datosStr);

        let enlace = document.createElement('a');
        enlace.setAttribute('href', dataUri);
        enlace.setAttribute('download', nombreArchivo || 'arbol_binario.json');
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
    }

    document.getElementById('exportBtn').addEventListener('click', function () {
        let nombreArchivo = prompt("Nombre del archivo:", "arbol_binario.json");
        exportarArbol(nombreArchivo);
    });

    // ============================
    // IMPORTAR ÁRBOL
    // ============================
    function importarArbol(event) {
        const archivo = event.target.files[0];
        if (!archivo) return;

        const reader = new FileReader();
        reader.onload = function (fileEvent) {
            try {
                const datos = JSON.parse(fileEvent.target.result);

                // reconstruir árbol directamente
                bt.root = datos.root || null;

                updateTree();

            } catch (error) {
                console.error('Error al importar el archivo:', error);
                alert("El archivo no es válido.");
            }
        };
        reader.readAsText(archivo);
    }

    document.getElementById('importInput').addEventListener('click', () =>
        document.getElementById('importarArchivo').click()
    );

    document.getElementById('importInput').addEventListener('change', importarArbol);


    //=============================================
    // BOTONES RECONSTRUCCION
    //=============================================

    document.getElementById("reconstructPreIn").addEventListener("click", () => {
        if (!preOrderList.length || !inOrderList.length) {
            alert("Debe ingresar Pre-Order e In-Order primero.");
            return;
        }

        console.log("[Reconstrucción Pre+In] usando:", preOrderList, inOrderList);

        bt.root = buildTreeFromPreIn([...preOrderList], [...inOrderList]);
        updateTree();
    });

    document.getElementById("reconstructInPost").addEventListener("click", () => {
        if (!inOrderList.length || !postOrderList.length) {
            alert("Debe ingresar In-Order y Post-Order primero.");
            return;
        }

        console.log("[Reconstrucción In+Post] usando:", inOrderList, postOrderList);

        bt.root = buildTreeFromInPost([...inOrderList], [...postOrderList]);
        updateTree();
    });

    document.getElementById("reconstructPrePost").addEventListener("click", () => {
        if (!preOrderList.length || !postOrderList.length) {
            alert("Debe ingresar Pre-Order y Post-Order primero.");
            return;
        }

        console.log("[Reconstrucción Pre+Post] usando:", preOrderList, postOrderList);

        bt.root = buildTreeFromPrePost([...preOrderList], [...postOrderList]);
        updateTree();
    });

    function validateLists(preOrder, inOrder, postOrder) {
        // Verifica si las listas tienen elementos y coinciden en longitud donde es necesario
        let lists = [preOrder, inOrder, postOrder].filter(list => list.length > 0);
        if (lists.length < 2) {
            alert('Se requieren al menos dos listas para reconstruir el árbol.');
            return false;
        }

        // Compara los elementos de las listas disponibles para asegurarse de que son iguales y están completas
        let sortedLists = lists.map(list => [...list].sort((a, b) => a - b));
        for (let i = 0; i < sortedLists[0].length; i++) {
            for (let j = 1; j < sortedLists.length; j++) {
                if (sortedLists[j][i] !== sortedLists[0][i]) {
                    alert('Las listas deben contener los mismos elementos.');
                    return false;
                }
            }
        }

        return true;
    }


    function clearAndRebuildTree(buildFunction, list1, list2) {
        console.log("=== RECONSTRUCCIÓN DE ÁRBOL INICIADA ===");
        console.log("Tipo:", buildFunction.name);
        console.log("Lista 1:", list1);
        console.log("Lista 2:", list2);

        bt.root = null;

        const newRoot = buildFunction([...list1], [...list2]);

        if (!newRoot) {
            console.error("❌ No se pudo reconstruir el árbol.");
            alert("Error reconstruyendo el árbol.");
            return;
        }

        bt.root = newRoot;
        console.log("✔ Nueva raíz:", newRoot.value);
        console.log("=== RECONSTRUCCIÓN COMPLETA ===");
        console.log("======================================");

        updateTree();
    }


    function buildTreeFromPreIn(preOrder, inOrder) {
        console.log(`\n[Pre-In] Llamada → pre=${preOrder}, in=${inOrder}`);
        if (!preOrder.length) return null;

        const rootValue = preOrder[0];
        console.log(`[Pre-In] Raíz detectada → ${rootValue}`);

        const root = new TreeNode(rootValue);
        const index = inOrder.indexOf(rootValue);

        if (index === -1) {
            console.warn(`[Pre-In] Valor ${rootValue} no encontrado en In-Order. Abortando rama.`);
            return null;
        }

        root.left = buildTreeFromPreIn(preOrder.slice(1, index + 1), inOrder.slice(0, index));
        root.right = buildTreeFromPreIn(preOrder.slice(index + 1), inOrder.slice(index + 1));

        return root;
    }

    function buildTreeFromInPost(inOrder, postOrder) {
        console.log(`\n[In-Post] Llamada → in=${inOrder}, post=${postOrder}`);
        if (!inOrder.length) return null;

        const rootValue = postOrder[postOrder.length - 1];
        console.log(`[In-Post] Raíz detectada → ${rootValue}`);

        const root = new TreeNode(rootValue);
        const index = inOrder.indexOf(rootValue);

        if (index === -1) {
            console.warn(`[In-Post] Valor ${rootValue} no encontrado en In-Order. Abortando rama.`);
            return null;
        }

        root.left = buildTreeFromInPost(inOrder.slice(0, index), postOrder.slice(0, index));
        root.right = buildTreeFromInPost(inOrder.slice(index + 1), postOrder.slice(index, -1));

        return root;
    }

    function buildTreeFromPrePost(preOrder, postOrder) {
        console.log(`\n[Pre-Post] Llamada → pre=${preOrder}, post=${postOrder}`);

        if (!preOrder.length) return null;

        const root = new TreeNode(preOrder[0]);
        console.log(`[Pre-Post] Raíz detectada → ${root.value}`);

        if (preOrder.length === 1) return root;

        const leftRootValue = preOrder[1];
        const index = postOrder.indexOf(leftRootValue);

        if (index === -1) {
            console.warn(`[Pre-Post] Valor ${leftRootValue} no encontrado en Post-Order.`);
            return root;
        }

        root.left = buildTreeFromPrePost(
            preOrder.slice(1, index + 2),
            postOrder.slice(0, index + 1)
        );

        root.right = buildTreeFromPrePost(
            preOrder.slice(index + 2),
            postOrder.slice(index + 1, postOrder.length - 1)
        );

        return root;
    }

    // =====================================
    // CAPTURA DE LISTAS (Pre, In, Post)
    // =====================================
    let preOrderList = [];
    let inOrderList = [];
    let postOrderList = [];

    document.getElementById("submitPreOrder").addEventListener("click", () => {
        const input = document.getElementById("inputPreOrder").value.trim();
        try {
            preOrderList = input.split(',').map(n => parseInt(n.trim()));
            console.log("[✔] Pre-Order guardado:", preOrderList);
            alert("Pre-Order guardado.");
        } catch (e) {
            alert("Formato inválido.");
        }
    });

    document.getElementById("submitInOrder").addEventListener("click", () => {
        const input = document.getElementById("inputInOrder").value.trim();
        try {
            inOrderList = input.split(',').map(n => parseInt(n.trim()));
            console.log("[✔] In-Order guardado:", inOrderList);
            alert("In-Order guardado.");
        } catch (e) {
            alert("Formato inválido.");
        }
    });

    document.getElementById("submitPostOrder").addEventListener("click", () => {
        const input = document.getElementById("inputPostOrder").value.trim();
        try {
            postOrderList = input.split(',').map(n => parseInt(n.trim()));
            console.log("[✔] Post-Order guardado:", postOrderList);
            alert("Post-Order guardado.");
        } catch (e) {
            alert("Formato inválido.");
        }
    });


});
