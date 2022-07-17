import { v4 as uuidV4 } from 'uuid';
import app from './app';
import { createDB, getDB, getDBPathFromDB, hasDB } from './models/db';
import { DB_NAME } from './routes/bbs/const';
import { hashPassword } from './utils/password-util';
import { getUserByName } from './models/User';
import { getValidUserTokens, saveUserToken } from './models/UserToken';

const http = require('http');

const port = parseInt(process.env.PORT || '884');
app.set('port', port);

async function initServer() {
  if (!(await hasDB(DB_NAME))) {
    // 创建论坛数据库
    const db = await createDB(process.env.MBBS_SET_ADMIN_PASSWORD || '123456');
    console.log(`已创建论坛数据库文件：${getDBPathFromDB(db)}`);
  } else {
    // 论坛数据库已创建
    if (process.env.MBBS_SET_ADMIN_PASSWORD) {
      // 修改管理员密码
      const db = await getDB(DB_NAME);
      const adminUser = await getUserByName(db, 'admin');
      adminUser.password = hashPassword(process.env.MBBS_SET_ADMIN_PASSWORD);
      await adminUser.save();
    }
  }

  const server = http.createServer(app);

  server.listen(port);
  server.on('error', onError);
  server.on('listening', async () => {
    const addr = server.address();

    const db = await getDB(DB_NAME);
    const adminUser = await getUserByName(db, 'admin');
    const tokens = await getValidUserTokens(db, adminUser.id);
    let loginToken = tokens[0]?.token;
    if (!loginToken) {
      loginToken = uuidV4();
      await saveUserToken(db, adminUser.id, loginToken);
    }

    console.log(`论坛已启动：http://localhost:${addr.port}`);
    console.log(`管理后台：http://localhost:${addr.port}/#/manage?MBBS_USER_TOKEN=${loginToken}`);
  });
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error('Error: ' + bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error('Error: ' + bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// 启动
initServer();
