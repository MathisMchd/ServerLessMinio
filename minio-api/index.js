
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Minio = require('minio');
const fs = require('fs');

const app = express();
const port = 3000;


const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
})


const bucketName = process.env.MINIO_BUCKET;




// Vérifier si le bucket existe, sinon le créer
createbucket(bucketName)


// Configuration de Multer pour l'upload de fichiers
const upload = multer({ dest: 'uploads/' });

// Route d'upload
app.post('/upload', upload.single('file'), (req, res) => {

    if (req.file) {
        const fileName = req.file.originalname;
        const filePath = req.file.path;

        minioClient.fPutObject(process.env.MINIO_BUCKET, fileName, filePath, (err) => {
            if (err) {
                console.log("Erreur lors du chargement du fichier", fileName);
                return res.status(500).send({ error: `Erreur lors du chargement du fichier ${fileName}`, details: err });
            }
            fs.unlinkSync(filePath);

            return res.status(200).send({ message: `Le fichier ${fileName} été chargé avec succes.` })
        })

    }

});

// Route de téléchargement
app.get('/download/:filename', (req, res) => {
    const fileName = req.params.filename
    const localFilePath = `./downloads/${fileName}`;

    minioClient.fGetObject(process.env.MINIO_BUCKET, fileName, localFilePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Echec du téléchargement', details: err });
        }

        res.download(localFilePath, fileName, (err) => {
            if (err) {
                console.error('Erreur lors de l’envoi du fichier:', fileName);
                return res.status(500).json({ error: 'Echec du téléchargement', details: err });
            }
            fs.unlinkSync(localFilePath);
        });
    });
});

// Route de suppression
app.delete('/delete/:filename', (req, res) => {

    const fileName = req.params.filename;

    minioClient.removeObject(process.env.MINIO_BUCKET, fileName, (err) => {
        if (err) {
            console.error('Erreur lors de la suppression du fichier:', fileName);
            return res.status(500).json({ error: 'Echec de la suppression du fichier', details: err });

        }
        console.log("Suppression du fichier réussie.")
        return res.status(200).json({ message: `Fichier '${fileName}' supprimé avec succès` });

    });

});

// Lancer le serveur
app.listen(port, () => {
    console.log(`API démarrée sur http://localhost:${port}`);
});





async function createbucket(bucketName) {
    const exists = await minioClient.bucketExists(bucketName)
    if (exists) {
        return console.log(`Bucket ${bucketName} exists.`)
    } else {
        await minioClient.makeBucket(bucketName)
            .then(console.log(`Bucket ${bucketName} créé`))
            .catch(console.log(`Erreur lors de la création du bucket : ${bucketName}`))
    }
}