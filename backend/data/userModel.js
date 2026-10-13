// backend/data/userModel.js
const mongoose = require('mongoose');

// Definimos la estructura de la tabla/colección (Esquema)
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, // Asegura que no haya dos correos iguales
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: false 
    },
    confirmado: { 
        type: Boolean,
        default: false
    },
   rol: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
    },
    githubId: {
        type: String,
        default: null
    }
}, {
    timestamps: true // Añade fecha de creación y actualización automáticamente
});

// Transformamos el _id de Mongo a un id normal para que el frontend no note la diferencia
userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
        // Nunca devolvemos la contraseña al frontend (Apartado 4.2)
        delete returnedObject.password;
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;