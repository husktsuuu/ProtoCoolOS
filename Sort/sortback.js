// sortback.js (versión completa con logs)
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('✅ sortback.js cargado y DOM listo');

        // -------------------------------
        // REFERENCIAS DEL DOM
        // -------------------------------
        const agregarListaBtn = document.getElementById('agregarListaBtn');
        const listaRandomBtn = document.getElementById('listaRandomBtn');
        const limpiarBtn = document.getElementById('limpiarBtn');
        const guardarBtn = document.getElementById('guardarBtn'); // (En tu UI dice “Importar”)
        const cargarBtn = document.getElementById('cargarBtn');  // (En tu UI dice “Guardar”)

        // Menús de opciones
        const selectionBtn = document.getElementById('selectionBtn');
        const insertionBtn = document.getElementById('insertionBtn');
        const shellBtn = document.getElementById('shellBtn');
        const mergeBtn = document.getElementById('mergeBtn');

        const selectionOptions = document.getElementById('selectionOptions');
        const insertionOptions = document.getElementById('insertionOptions');
        const shellOptions = document.getElementById('shellOptions');
        const mergeOptions = document.getElementById('mergeOptions');

        // Botones internos (opciones)
        const SordenarBtn = document.getElementById('SordenarBtn');
        const SordenarDesBtn = document.getElementById('SordenarDesBtn');
        const IordenarBtn = document.getElementById('IordenarBtn');
        const IordenarDesBtn = document.getElementById('IordenarDesBtn');
        const SHordenarBtn = document.getElementById('SHordenarBtn');
        const SHordenarDesBtn = document.getElementById('SHordenarDesBtn');
        const MordenarBtn = document.getElementById('MordenarBtn');
        const MordenarDesBtn = document.getElementById('MordenarDesBtn');

        // Resultados y canvas
        const sortText = document.getElementById('sortText');
        const tiempoOrdenEl = document.getElementById('tiempoOrdenamiento');
        const listaOriginalEl = document.getElementById('listaOriginal');
        const listaOrdenadaEl = document.getElementById('listaOrdenada');
        const resultadoContainer = document.getElementById('resultado-container');
        const ctx = document.getElementById('graficoBarras')?.getContext('2d');

        if (!ctx) {
            console.error('❌ No se encontró el canvas #graficoBarras');
            return;
        }

        // -------------------------------
        // ESTADO
        // -------------------------------
        let miGrafico = null;
        let listaNumeros = [];
        let listaOriginalStr = '--';

        // -------------------------------
        // UTILIDADES
        // -------------------------------
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        function resetResultados() {
            sortText.textContent = '--';
            tiempoOrdenEl.textContent = '--';
            listaOrdenadaEl.textContent = '--';
        }

        function actualizarResultado(finalArr, tSeg) {
            tiempoOrdenEl.textContent = tSeg.toFixed(2);
            listaOrdenadaEl.textContent = finalArr.join(', ');
            resultadoContainer.style.display = 'block';
        }

        function dibujarBurbujas(datos, highlightIdx = []) {
            console.log('🎨 Dibujando burbujas con datos:', datos);

            if (miGrafico) {
                miGrafico.destroy();
                miGrafico = null;
            }

            // Nada que dibujar
            if (!datos || datos.length === 0) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                return;
            }

            // Escala de radios: que se note la diferencia
            const maxValor = Math.max(...datos);
            const minValor = Math.min(...datos);
            const minR = 8;
            const maxR = 70; // más grande para que se vea bien

            const escalarR = (valor) => {
                if (maxValor === minValor) return (minR + maxR) / 2;
                const p = (valor - minValor) / (maxValor - minValor);
                // curva suavemente creciente
                return Math.pow(p, 1.2) * (maxR - minR) + minR;
            };

            // Preparamos puntos (alineados sobre y=0)
            const puntos = datos.map((valor, i) => {
                const r = escalarR(valor);
                const res = {
                    x: i + 1,
                    y: 0,
                    value: valor,    // para tooltip
                    radius: r        // para el callback de radio
                };
                return res;
            });

            // Colores (uno por punto)
            const bg = puntos.map((_, i) =>
                highlightIdx.includes(i) ? 'rgba(107,207,244,0.95)' : 'rgba(59,130,246,0.85)'
            );
            const bd = puntos.map((_, i) =>
                highlightIdx.includes(i) ? 'rgba(255,255,255,1)' : 'rgba(30,58,138,1)'
            );

            // Log de verificación de radios
            console.log('🔎 Radios calculados:', puntos.map(p => p.radius));

            miGrafico = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Valores',
                        data: puntos,
                        showLine: false,
                        pointBackgroundColor: bg,
                        pointBorderColor: bd,
                        // Forzamos el radio por punto (clave para que se vea)
                        pointRadius: puntos.map(p => p.radius),
                        pointHoverRadius: puntos.map(p => p.radius + 3),
                        borderWidth: 2
                    }]
                },
                options: {
                    parsing: { xAxisKey: 'x', yAxisKey: 'y' },
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            min: 0,
                            max: datos.length + 1,
                            ticks: { stepSize: 1, color: 'white' },
                            grid: { display: false }
                        },
                        y: {
                            min: -1,
                            max: 1,
                            ticks: { display: false },
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Valor: ${context.raw.value}`
                            }
                        }
                    },
                    animation: { duration: 250, easing: 'easeInOutCubic' }
                }
            });
        }



        // -------------------------------
        // TOGGLE DE MENÚS DE OPCIONES
        // -------------------------------
        const grupos = [
            { btn: selectionBtn, panel: selectionOptions },
            { btn: insertionBtn, panel: insertionOptions },
            { btn: shellBtn, panel: shellOptions },
            { btn: mergeBtn, panel: mergeOptions },
        ];

        function mostrarSolo(panel) {
            [selectionOptions, insertionOptions, shellOptions, mergeOptions].forEach(p => {
                if (!p) return;
                p.style.display = (p === panel && p.style.display !== 'block') ? 'block' : 'none';
            });
        }

        grupos.forEach(({ btn, panel }) => {
            if (!btn || !panel) return;
            btn.addEventListener('click', (ev) => {
                try {
                    console.log(`🟦 Click en botón de menú: #${btn.id}`);
                    if (listaNumeros.length === 0) {
                        alert('No se ha ingresado/generado ninguna lista.');
                        return;
                    }
                    ev.stopPropagation();
                    // Posicionar el panel bajo el botón
                    const rect = btn.getBoundingClientRect();
                    panel.style.position = 'absolute';
                    panel.style.top = `${rect.bottom + window.scrollY}px`;
                    panel.style.left = `${rect.left + window.scrollX}px`;
                    mostrarSolo(panel);
                } catch (e) {
                    console.error('❌ Error en click de menú:', e);
                }
            });
        });

        document.addEventListener('click', () => {
            mostrarSolo(null);
        });

        // -------------------------------
        // ENTRADA DE LISTAS
        // -------------------------------
        agregarListaBtn?.addEventListener('click', () => {
            try {
                console.log('🟩 Click en Agregar Lista');
                const cantStr = prompt('¿Cuántos números deseas agregar a la lista?');
                const n = parseInt(cantStr, 10);
                if (!Number.isFinite(n) || n <= 0) return alert('Cantidad inválida.');

                const tmp = [];
                for (let i = 0; i < n; i++) {
                    const vStr = prompt(`Ingresa el número ${i + 1}:`);
                    const v = parseFloat(vStr);
                    if (!Number.isFinite(v)) return alert(`Valor inválido: ${vStr}`);
                    tmp.push(v);
                }
                listaNumeros = tmp;
                listaOriginalStr = listaNumeros.join(', ');
                listaOriginalEl.textContent = listaOriginalStr;
                resetResultados();
                dibujarBurbujas(listaNumeros);
            } catch (e) {
                console.error('❌ Error en Agregar Lista:', e);
            }
        });

        listaRandomBtn?.addEventListener('click', () => {
            try {
                console.log('🟩 Click en Generar Random');
                const cStr = prompt('¿Cuántos números aleatorios?');
                const c = parseInt(cStr, 10);
                if (!Number.isFinite(c) || c <= 0) return alert('Cantidad inválida.');

                const min = parseFloat(prompt('Valor mínimo:'));
                const max = parseFloat(prompt('Valor máximo:'));
                if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
                    return alert('Rango inválido.');
                }

                listaNumeros = Array.from({ length: c }, () => Math.floor(Math.random() * (max - min + 1)) + min);
                console.log('🎲 Lista aleatoria:', listaNumeros);
                listaOriginalStr = listaNumeros.join(', ');
                listaOriginalEl.textContent = listaOriginalStr;
                resetResultados();
                dibujarBurbujas(listaNumeros);
            } catch (e) {
                console.error('❌ Error al generar random:', e);
            }
        });

        limpiarBtn?.addEventListener('click', () => {
            try {
                console.log('🧹 Click en Limpiar');
                if (miGrafico) { miGrafico.destroy(); miGrafico = null; }
                listaNumeros = [];
                listaOriginalStr = '--';
                listaOriginalEl.textContent = '--';
                resetResultados();
                dibujarBurbujas([]); // vacío
            } catch (e) {
                console.error('❌ Error en Limpiar:', e);
            }
        });

        // Guardar / Cargar (OJO: tu UI tiene los textos invertidos a los IDs)
        guardarBtn?.addEventListener('click', () => {
            try {
                console.log('💾 Click en Guardar (ID: guardarBtn)');
                if (listaNumeros.length === 0) return alert('No hay números para guardar.');
                const nombre = prompt('Nombre del archivo:', 'miListaNumeros');
                if (!nombre) return;
                const blob = new Blob([JSON.stringify(listaNumeros)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${nombre}.json`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error('❌ Error al guardar:', e);
            }
        });

        cargarBtn?.addEventListener('click', () => {
            try {
                console.log('📂 Click en Cargar (ID: cargarBtn)');
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = () => {
                    const f = input.files?.[0];
                    if (!f) return;
                    const rd = new FileReader();
                    rd.onload = (ev) => {
                        try {
                            const arr = JSON.parse(ev.target.result);
                            if (!Array.isArray(arr)) throw new Error('JSON no es una lista');
                            listaNumeros = arr.map(Number);
                            console.log('📥 Lista cargada:', listaNumeros);
                            listaOriginalStr = listaNumeros.join(', ');
                            listaOriginalEl.textContent = listaOriginalStr;
                            resetResultados();
                            dibujarBurbujas(listaNumeros);
                        } catch (e) {
                            console.error('❌ Archivo inválido:', e);
                            alert('Archivo inválido.');
                        }
                    };
                    rd.readAsText(f);
                };
                input.click();
            } catch (e) {
                console.error('❌ Error al cargar:', e);
            }
        });

        // -------------------------------
        // ALGORITMOS (ANIMADOS)
        // -------------------------------
        async function selectionSortAnim(arr, asc = true) {
            console.log(`▶ Selection Sort ${asc ? 'ASC' : 'DESC'}`);
            const a = arr.slice();
            const start = performance.now();

            for (let i = 0; i < a.length - 1; i++) {
                let best = i;
                for (let j = i + 1; j < a.length; j++) {
                    const cond = asc ? (a[j] < a[best]) : (a[j] > a[best]);
                    if (cond) best = j;
                    dibujarBurbujas(a, [best, j]);
                    await sleep(180);
                }
                if (best !== i) {
                    [a[i], a[best]] = [a[best], a[i]];
                    dibujarBurbujas(a, [i, best]);
                    await sleep(180);
                }
            }

            const end = performance.now();
            actualizarResultado(a, (end - start) / 1000);
            return a;
        }

        async function insertionSortAnim(arr, asc = true) {
            console.log(`▶ Insertion Sort ${asc ? 'ASC' : 'DESC'}`);
            const a = arr.slice();
            const start = performance.now();

            for (let i = 1; i < a.length; i++) {
                const key = a[i];
                let j = i - 1;
                while (j >= 0 && (asc ? a[j] > key : a[j] < key)) {
                    a[j + 1] = a[j];
                    j--;
                    dibujarBurbujas(a, [j + 1, i]);
                    await sleep(140);
                }
                a[j + 1] = key;
                dibujarBurbujas(a, [j + 1]);
                await sleep(140);
            }

            const end = performance.now();
            actualizarResultado(a, (end - start) / 1000);
            return a;
        }

        async function shellSortAnim(arr, asc = true) {
            console.log(`▶ Shell Sort ${asc ? 'ASC' : 'DESC'}`);
            const a = arr.slice();
            const start = performance.now();

            let gapStr = prompt('Introduce el valor inicial del gap:', 'Math.floor(n/2)');
            let gap;
            if (!gapStr || gapStr.trim().toLowerCase() === 'math.floor(n/2)') {
                gap = Math.floor(a.length / 2);
            } else {
                gap = parseInt(gapStr, 10);
                if (!Number.isFinite(gap) || gap <= 0) gap = Math.floor(a.length / 2);
            }

            for (; gap > 0; gap = Math.floor(gap / 2)) {
                for (let i = gap; i < a.length; i++) {
                    const temp = a[i];
                    let j = i;
                    while (j >= gap && (asc ? a[j - gap] > temp : a[j - gap] < temp)) {
                        a[j] = a[j - gap];
                        j -= gap;
                        dibujarBurbujas(a, [j, j + gap]);
                        await sleep(120);
                    }
                    a[j] = temp;
                    dibujarBurbujas(a, [j]);
                    await sleep(120);
                }
            }

            const end = performance.now();
            actualizarResultado(a, (end - start) / 1000);
            return a;
        }

        async function merge(arr, l, m, r, asc) {
            const n1 = m - l + 1;
            const n2 = r - m;
            const L = new Array(n1);
            const R = new Array(n2);
            for (let i = 0; i < n1; i++) L[i] = arr[l + i];
            for (let j = 0; j < n2; j++) R[j] = arr[m + 1 + j];

            let i = 0, j = 0, k = l;
            while (i < n1 && j < n2) {
                const cond = asc ? (L[i] <= R[j]) : (L[i] >= R[j]);
                arr[k] = cond ? L[i++] : R[j++];
                dibujarBurbujas(arr, [k]);
                await sleep(60);
                k++;
            }
            while (i < n1) {
                arr[k] = L[i++];
                dibujarBurbujas(arr, [k]);
                await sleep(60);
                k++;
            }
            while (j < n2) {
                arr[k] = R[j++];
                dibujarBurbujas(arr, [k]);
                await sleep(60);
                k++;
            }
        }
        async function mergeSortAnim(arr, l, r, asc) {
            if (l >= r) return;
            const m = l + Math.floor((r - l) / 2);
            await mergeSortAnim(arr, l, m, asc);
            await mergeSortAnim(arr, m + 1, r, asc);
            await merge(arr, l, m, r, asc);
        }
        async function doMergeSort(arr, asc = true) {
            console.log(`▶ Merge Sort ${asc ? 'ASC' : 'DESC'}`);
            const a = arr.slice();
            const start = performance.now();
            await mergeSortAnim(a, 0, a.length - 1, asc);
            const end = performance.now();
            actualizarResultado(a, (end - start) / 1000);
            return a;
        }

        // -------------------------------
        // LISTENERS DE SORTEO
        // -------------------------------
        SordenarBtn?.addEventListener('click', async () => {
            try {
                console.log('🟨 Selection ASC');
                sortText.textContent = 'SELECTION';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await selectionSortAnim(listaNumeros, true);
            } catch (e) { console.error('❌ Error Selection ASC:', e); }
        });

        SordenarDesBtn?.addEventListener('click', async () => {
            try {
                console.log('🟨 Selection DESC');
                sortText.textContent = 'SELECTION';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await selectionSortAnim(listaNumeros, false);
            } catch (e) { console.error('❌ Error Selection DESC:', e); }
        });

        IordenarBtn?.addEventListener('click', async () => {
            try {
                console.log('🟧 Insertion ASC');
                sortText.textContent = 'INSERTION';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await insertionSortAnim(listaNumeros, true);
            } catch (e) { console.error('❌ Error Insertion ASC:', e); }
        });

        IordenarDesBtn?.addEventListener('click', async () => {
            try {
                console.log('🟧 Insertion DESC');
                sortText.textContent = 'INSERTION';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await insertionSortAnim(listaNumeros, false);
            } catch (e) { console.error('❌ Error Insertion DESC:', e); }
        });

        SHordenarBtn?.addEventListener('click', async () => {
            try {
                console.log('🟪 Shell ASC');
                sortText.textContent = 'SHELL';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await shellSortAnim(listaNumeros, true);
            } catch (e) { console.error('❌ Error Shell ASC:', e); }
        });

        SHordenarDesBtn?.addEventListener('click', async () => {
            try {
                console.log('🟪 Shell DESC');
                sortText.textContent = 'SHELL';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await shellSortAnim(listaNumeros, false);
            } catch (e) { console.error('❌ Error Shell DESC:', e); }
        });

        MordenarBtn?.addEventListener('click', async () => {
            try {
                console.log('🟦 Merge ASC');
                sortText.textContent = 'MERGE';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await doMergeSort(listaNumeros, true);
            } catch (e) { console.error('❌ Error Merge ASC:', e); }
        });

        MordenarDesBtn?.addEventListener('click', async () => {
            try {
                console.log('🟦 Merge DESC');
                sortText.textContent = 'MERGE';
                tiempoOrdenEl.textContent = '--';
                listaOrdenadaEl.textContent = '--';
                await doMergeSort(listaNumeros, false);
            } catch (e) { console.error('❌ Error Merge DESC:', e); }
        });

        // Dibujo inicial vacío
        dibujarBurbujas([]);

    } catch (err) {
        console.error('❌ Error inicial en sortback.js:', err);
    }
});
