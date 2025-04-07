const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configuración de límites
const PUNTAJE_MINIMO = 0; // Cambiado a 0 para permitir reinicio completo
const PUNTAJE_MAXIMO = 40;

// Datos iniciales de los equipos/proyectos (inician en 0)
let equipos = [
  {
    name: 'BrightBloom',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.17:3000/images/Logo_Glow.png' }
  },
  {
    name: 'SmartPet Solutions',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_Meow.jpg' }
  },
  {
    name: 'XicoWeb',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_Ixaya.jpeg' }
  },
  {
    name: 'BDMatrix',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_Gym.png' }
  },
  {
    name: 'Violet',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_Dimen.png' }
  },
  {
    name: 'Xicolab',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_Xicolab.png' }
  },
  {
    name: 'MediTech',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_PillBox.png' }
  },
  {
    name: 'Virtall',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_iHome.png' }
  },
  {
    name: 'DreamStudios',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_Iris.png' }
  },
  {
    name: 'SabeRed',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_Sabores.png' }
  },
  {
    name: 'MedikOS',
    puntaje: 0,
    pictureSettings: { src: 'http://10.10.62.12:3000/images/Logo_MedikOS.jpg' }
  }
];

// Configuración de Socket.IO
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Enviar datos iniciales al cliente
  socket.emit('conexionInicial', equipos);

  // Manejar actualización de puntaje
  socket.on('actualizarPuntaje', ({ index, puntaje }) => {
    try {
      if (!equipos[index]) {
        throw new Error('Índice de equipo inválido');
      }

      if (isNaN(puntaje)) {
        throw new Error('El puntaje debe ser un número');
      }

      // Validar y ajustar límites (0-40)
      const nuevoPuntaje = Math.max(PUNTAJE_MINIMO, Math.min(PUNTAJE_MAXIMO, puntaje));
      
      equipos[index].puntaje = nuevoPuntaje;
      io.emit('puntajeActualizado', equipos);
      
      console.log(`Puntaje actualizado: ${equipos[index].name} = ${nuevoPuntaje}`);
    } catch (error) {
      console.error('Error al actualizar puntaje:', error.message);
      socket.emit('error', error.message);
    }
  });

  // Manejar incremento directo de puntaje
  socket.on('aumentarPuntaje', (index) => {
    try {
      if (!equipos[index]) {
        throw new Error('Índice de equipo inválido');
      }

      const nuevoPuntaje = Math.min(equipos[index].puntaje + 1, PUNTAJE_MAXIMO);
      equipos[index].puntaje = nuevoPuntaje;
      io.emit('puntajeActualizado', equipos);
      
      console.log(`Puntaje incrementado: ${equipos[index].name} = ${nuevoPuntaje}`);
    } catch (error) {
      console.error('Error al incrementar puntaje:', error.message);
      socket.emit('error', error.message);
    }
  });

  // Manejar reinicio de puntajes a 0
  socket.on('reiniciarPuntajes', () => {
    try {
      equipos.forEach(equipo => {
        equipo.puntaje = 0; // Reiniciar a 0
      });
      io.emit('puntajeActualizado', equipos);
      console.log('Todos los puntajes reiniciados a 0');
    } catch (error) {
      console.error('Error al reiniciar puntajes:', error.message);
      socket.emit('error', error.message);
    }
  });

  // Manejar reinicio individual
  socket.on('reiniciarPuntajeIndividual', (index) => {
    try {
      if (!equipos[index]) {
        throw new Error('Índice de equipo inválido');
      }
      
      equipos[index].puntaje = 0;
      io.emit('puntajeActualizado', equipos);
      console.log(`Puntaje reiniciado: ${equipos[index].name} = 0`);
    } catch (error) {
      console.error('Error al reiniciar puntaje individual:', error.message);
      socket.emit('error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Endpoint HTTP para reinicio manual
app.post('/reiniciar', (req, res) => {
  try {
    equipos.forEach(equipo => {
      equipo.puntaje = 0;
    });
    io.emit('puntajeActualizado', equipos);
    res.json({ success: true, message: 'Todos los puntajes reiniciados a 0' });
  } catch (error) {
    console.error('Error en endpoint /reiniciar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Todos los proyectos iniciados con puntaje 0');
});