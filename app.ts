import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import express from "express";
import logger from 'morgan';
import http from 'http';
import { TranscribeEvent, emitEvent } from './services/transcribe/emitters';
import { getTranscribeHandler } from "./services/transcribe";


const app = express();

app.set('transcribeHandler', getTranscribeHandler());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.post('/start', (req, res) => {
    const userId = randomUUID();
    const sessionId = randomUUID();
    const streamLink = 'rtmp://0.0.0.0:1935/live';
    

    emitEvent(TranscribeEvent.START_SESSION, {
        userId,
        sessionId,
        streamLink,
    });

    res
        .send({
            status: 'ok'
        })
        .end();
});

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(value: string) {
  var port = parseInt(value, 10);

  if (isNaN(port)) {
    // named pipe
    return value;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr?.port;
  console.log('Listening on ' + bind);
}
