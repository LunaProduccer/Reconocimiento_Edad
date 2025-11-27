const video = document.getElementById('video');
const statusText = document.getElementById('status');

// 1. Cargar Modelos
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models')
]).then(startVideo).catch(err => {
    console.error(err);
    statusText.innerText = "Error cargando modelos. Revisa la consola.";
});

// 2. Iniciar Cámara (Pidiendo formato Vertical)
function startVideo() {
    statusText.innerText = "Iniciando cámara...";
    
    // Configuración preferida: Vertical
    const constraints = {
        video: {
            facingMode: 'user', // Cámara frontal
            aspectRatio: { ideal: 0.5625 } // Intenta obtener 9:16 nativo
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Error cámara:", err);
            // Si falla la vertical, intentamos la normal
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => video.srcObject = stream)
                .catch(e => statusText.innerText = "Error: Cámara no permitida.");
        });
}

// 3. Detección Inteligente
video.addEventListener('play', () => {
    statusText.innerText = "Sistema Operativo. Detectando...";
    
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.video-container').append(canvas);
    
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Intervalo de 500ms (0.5 segundos) para evitar LAG en celular
    setInterval(async () => {
        // Detectar caras
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withAgeAndGender();

        // Recalcular tamaño actual (por si cambia la pantalla)
        const currentSize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, currentSize);
        
        const resizedDetections = faceapi.resizeResults(detections, currentSize);
        
        // Limpiar canvas
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            const box = detection.detection.box;
            
            // Cálculo espejo exacto
            const mirroredBox = {
                x: currentSize.width - box.x - box.width, 
                y: box.y,
                width: box.width,
                height: box.height
            };

            const age = detection.age;
            const gender = detection.gender;
            
            // Rango de edad de 5 años
            const ageGroup = 5;
            const lowerAge = Math.floor(age / ageGroup) * ageGroup;
            const upperAge = lowerAge + ageGroup;
            
            const text = `${Math.round(age)} años (${lowerAge}-${upperAge})`;
            const genderText = gender === 'male' ? 'H' : 'M';
            
            // Dibujar caja
            const drawBox = new faceapi.draw.DrawBox(mirroredBox, {
                label: `${genderText}: ${text}`,
                boxColor: '#00ffcc',
                drawLabelOptions: {
                    fontColor: '#000000',
                    backgroundColor: '#00ffcc',
                    fontSize: 12
                }
            });
            drawBox.draw(canvas);
        });
    }, 500); // Anti-Lag activado
});