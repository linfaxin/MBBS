import { createStream } from 'rotating-file-stream';
import indexRouter from './routes';
import { initBBSRouter } from './routes/bbs/init';
import { getDBNameFromApiRequest } from './models/db';
import { HEADER_USERID } from './routes/bbs/const';
import { logPath } from './utils/log-util';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const lessMiddleware = require('less-middleware');
const logger = require('morgan');
const bodyParser = require('body-parser');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// setup the logger
logger.token('db-name', (req) => getDBNameFromApiRequest(req) || '-');
logger.token('db-user', (req) => req.headers[HEADER_USERID] || '-');
app.use(
  logger(
    ':remote-addr - [:date[iso]] "db: :db-name" "uid: :db-user" ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms ":referrer" ":req[host]"',
    {
      buffer: true,
      stream: createStream('all-access.log', {
        interval: '1d', // rotate daily
        maxSize: '100M',
        path: logPath,
      }),
    },
  ),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

app.use(lessMiddleware(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', indexRouter);
app.use(express.static(path.join(__dirname, '../web/dist'))); // web dist

initBBSRouter(app); // bbs routes

export default app;
