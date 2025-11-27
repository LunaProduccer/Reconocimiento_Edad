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

// 2. Iniciar Cámara
function startVideo() {
    statusText.innerText = "Iniciando cámara...";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Error cámara:", err);
            statusText.innerText = "Error: No se detecta cámara.";
        });
}

// 3. Detección
video.addEventListener('play', () => {
    statusText.innerText = "Sistema Operativo. Detectando...";
    
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.video-container').append(canvas);
    
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

  
    setInterval(async () => {
        // Detectar caras
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withAgeAndGender();

        const currentSize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, currentSize);
        
        const resizedDetections = faceapi.resizeResults(detections, currentSize);
        
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            const box = detection.detection.box;
            
            const mirroredBox = {
                x: currentSize.width - box.x - box.width, 
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
                    fontSize: 12
                }
            });
            drawBox.draw(canvas);
        });
    }, 500); // 
});