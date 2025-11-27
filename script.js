const video = document.getElementById('video');
const statusText = document.getElementById('status');

// 1. Cargar SOLO los modelos necesarios (Corregido: quitamos faceRecognitionNet)
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models')
]).then(startVideo).catch(err => {
    console.error(err);
    statusText.innerText = "Error cargando modelos. Revisa la consola (F12).";
});

// 2. Iniciar la cámara
function startVideo() {
    statusText.innerText = "Iniciando cámara...";
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error("Error al acceder a la cámara:", err));
}

// 3. Cuando el video empiece a reproducirse, comenzamos la detección
video.addEventListener('play', () => {
    statusText.innerText = "Sistema Operativo. Detectando...";
    
    // Crear el lienzo (canvas) sobre el video
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.video-container').append(canvas);
    
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Bucle infinito de detección (cada 100ms)
    setInterval(async () => {
        // Detectar caras y estimar edad/género
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withAgeAndGender();

        // Ajustar el tamaño de las detecciones al video
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Limpiar el canvas antes de dibujar lo nuevo
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        // Lógica personalizada para dibujar
        resizedDetections.forEach(detection => {
            const box = detection.detection.box;
            
   
            // Invertimos la posición X para que coincida con el video espejo
            const mirroredBox = {
                x: displaySize.width - box.x - box.width, 
                y: box.y,
                width: box.width,
                height: box.height
            };

            const age = detection.age;
            const gender = detection.gender;
            
            // Lógica de redondeo para rangos de 5 años
            const ageGroup = 5;
            const lowerAge = Math.floor(age / ageGroup) * ageGroup;
            const upperAge = lowerAge + ageGroup;
            
            const text = `${Math.round(age)} años (Rango: ${lowerAge}-${upperAge})`;
            const genderText = gender === 'male' ? 'Hombre' : 'Mujer';
            
            // Dibujar la caja usando mirroredBox
            const drawBox = new faceapi.draw.DrawBox(mirroredBox, {
                label: `${genderText} - ${text}`,
                boxColor: '#00ffcc',
                drawLabelOptions: {
                    fontColor: '#000000',
                    backgroundColor: '#00ffcc'
                }
            });
            drawBox.draw(canvas);
        });
    }, 100);
});