const video = document.getElementById('video');
const statusText = document.getElementById('status');

// 1. Cargar Modelos
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models')
]).then(startVideo).catch(err => {
    console.error(err);
    statusText.innerText = "Error cargando modelos.";
});

// 2. Iniciar Cámara (Modo Calidad Natural)
function startVideo() {
    statusText.innerText = "Iniciando cámara...";
    
    // Pedimos video estándar (4:3) que es la mejor calidad en webcams y celulares
    const constraints = {
        video: {
            facingMode: 'user', 
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Error cámara:", err);
            // Intento secundario si falla la config ideal
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => video.srcObject = stream)
                .catch(e => statusText.innerText = "Error: Acceso denegado a cámara.");
        });
}

// 3. Detección
video.addEventListener('play', () => {
    statusText.innerText = "Sistema Operativo. Detectando...";
    
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.video-container').append(canvas);
    
    // Función para ajustar el tamaño dinámicamente
    function adjustSize() {
        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);
        return displaySize;
    }
    
    let displaySize = adjustSize();

    // Intervalo de 500ms (Fluido y sin lag)
    setInterval(async () => {
        // Detectar caras
       const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }))
            .withFaceLandmarks()
            .withAgeAndGender();

        // Recalcular tamaño por si la ventana cambia
        displaySize = adjustSize();
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            const box = detection.detection.box;
            
            // Cálculo espejo
            const mirroredBox = {
                x: displaySize.width - box.x - box.width, 
                y: box.y,
                width: box.width,
                height: box.height
            };

            const age = detection.age;
            const gender = detection.gender;
            
            const ageGroup = 5;
            const lowerAge = Math.floor(age / ageGroup) * ageGroup;
            const upperAge = lowerAge + ageGroup;
            
            const text = `${Math.round(age)} años (${lowerAge}-${upperAge})`;
            const genderText = gender === 'male' ? 'H' : 'M';
            
            const drawBox = new faceapi.draw.DrawBox(mirroredBox, {
                label: `${genderText}: ${text}`,
                boxColor: '#00ffcc',
                drawLabelOptions: {
                    fontColor: '#000000',
                    backgroundColor: '#00ffcc',
                    fontSize: 14 // Letra un poco más grande
                }
            });
            drawBox.draw(canvas);
        });
    }, 500);
});