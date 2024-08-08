// Please don't move the following dd initialization code
// it has to happen before any import/require statements
// to guarantee auto instumentation
import './tracer';

import {CookieOptions} from '@fastify/session';
import {sessionStore} from './constant';
import {controllers, securityRules} from './controllers';
import {env} from './env';
import {Application} from './_core/application';

const sessionCookieOptions: CookieOptions = {
  maxAge: env.SESSION_TTL_IN_SECONDS * 1000,
};

if (env.NODE_ENV === 'stage') {
  sessionCookieOptions.secure = false;
} else {
  sessionCookieOptions.secure = true;
  sessionCookieOptions.sameSite = 'none';
}

const app = new Application()
  .withSession({
    secret: env.SESSION_SECRET,
    cookie: sessionCookieOptions,
    store: sessionStore,
  })
  .pgOpts({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
  })
  .controllers(controllers)
  .securityRules(securityRules);

app.start(env.FASTIFY_PORT, env.FASTIFY_ADDRESS);
