const app = require('./src/app');
const http = require('http');
const morgan = require('morgan');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middlewares/errorHandler');

const PORT = process.env.PORT || 5000;

app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

app.use(errorHandler)


const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
