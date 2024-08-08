import {Cradle, diContainer, fastifyAwilixPlugin} from '@fastify/awilix';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import passport from '@fastify/passport';
import fastifySession, {FastifySessionOptions} from '@fastify/session';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import {
  asClass,
  asValue,
  AwilixContainer,
  Lifetime,
  NameAndRegistrationPair,
} from 'awilix';
import fastify, {FastifyInstance} from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import * as schedule from 'node-schedule';
import {
  RecurrenceRule,
  RecurrenceSpecDateRange,
  RecurrenceSpecObjLit,
} from 'node-schedule';
import {useOauth} from '../actions/auth';
import {env} from '../env';
import {API_INFO, LOGGER, LOGO} from './constant';
import {health} from './controller/actions/health';
import {
  getNonce,
  personalInformation,
  signIn,
} from './controller/actions/siweAction';
import {buildRoutes} from './controller/route';
import {DbService, PgOptions} from './services/dbService';
import {Controller, JobHandler, SecurityFilterRule} from './type';

const predefinedCtls: Controller[] = [
  {
    prefix: '/health',
    actions: [{path: '/', method: 'get', handler: health}],
  },
];

const siweCtls: Controller[] = [
  {
    prefix: '/',
    actions: [
      {path: '/nonce', method: 'get', handler: getNonce},
      {path: '/sign-in', method: 'post', handler: signIn},
      {
        path: '/personal-information',
        method: 'get',
        handler: personalInformation,
      },
    ],
  },
];

export class Application {
  private server: FastifyInstance;
  private diContainer: AwilixContainer<Cradle>;

  private ctls: Controller[] = [];
  private secRules: SecurityFilterRule[] = [];

  constructor() {
    this.diContainer = diContainer;

    this.server = fastify({
      logger: LOGGER,
      disableRequestLogging: env.NODE_ENV === 'mainnet',
      trustProxy: true,
      bodyLimit: 10485760, // 10 MiB
    });
  }

  withSession(options?: FastifySessionOptions) {
    this.server.register(fastifyCookie).register(fastifySession, options);
    return this;
  }

  controllers(value: Controller[]) {
    this.ctls = value;
    return this;
  }

  securityRules(value: SecurityFilterRule[]) {
    this.secRules = value;
    return this;
  }

  pgOpts(value: PgOptions) {
    this.diContainer.register({
      pgOpts: asValue(value),
      dbService: asClass(DbService, {
        lifetime: Lifetime.SINGLETON,
        dispose: module => module.dispose(),
      }),
    });
    return this;
  }

  resolve<T>(name: string) {
    return this.diContainer.resolve<T>(name);
  }

  register(nameAndRegistrationPair: NameAndRegistrationPair<Cradle>) {
    this.diContainer.register(nameAndRegistrationPair);
    return this;
  }

  registrations() {
    return this.diContainer.registrations;
  }

  build() {
    useOauth('github');
    useOauth('twitter');
    useOauth('discord');

    this.server.setValidatorCompiler(validatorCompiler);
    this.server.setSerializerCompiler(serializerCompiler);

    this.server
      .withTypeProvider<ZodTypeProvider>()
      .register(helmet, {global: true})
      .register(passport.initialize())
      .register(passport.secureSession())
      .register(fastifySwagger, {
        openapi: {
          info: API_INFO,
          servers: [],
          components: {
            securitySchemes: {
              jwt: {
                type: 'http',
                scheme: 'bearer',
              },
            },
          },
        },
        transform: jsonSchemaTransform,
      })
      .register(cors, {credentials: true, origin: true})
      .register(fastifyRawBody, {
        global: false,
        runFirst: true,
      })
      .register(fastifyAwilixPlugin, {
        disposeOnClose: true,
        disposeOnResponse: false,
      })
      .register(fastifySwaggerUI, {
        routePrefix: '/documentation',
        uiConfig: {
          persistAuthorization: true,
        },
      })
      .register(
        buildRoutes(
          [...this.ctls, ...predefinedCtls, ...siweCtls],
          this.secRules
        )
      )
      .after(err => {
        if (err) {
          console.log(`register plugins failed: ${err.message}`);
          throw err;
        }
      })
      .ready()
      .then(
        () => {
          LOGGER.info('Server successfully booted!');
        },
        err => {
          LOGGER.trace('Server start error', err);
        }
      );

    this.server.get(
      '/auth/github/login',
      passport.authenticate('github', {scope: ['user:email']})
    );
    this.server.get(
      '/auth/github/callback',
      passport.authenticate(
        'github',
        {
          failureRedirect: '/login',
        },
        async (request, reply, err, user) => {
          const error = (request.query as any).error;
          console.log('##', error);
          if (error === 'access_denied') {
            reply.redirect(env.ROOT_URL_PREFIX + `/create/github?error=1003`);
          }
          if (user) {
            reply.redirect(
              env.ROOT_URL_PREFIX + `/create/github?access_token=${user}`
            );
          } else {
            reply.redirect(env.ROOT_URL_PREFIX + `/create/github?error=1004`);
          }
        }
      )
    );

    this.server.get(
      '/auth/discord/login',
      passport.authenticate('discord', {scope: ['identify', 'email']})
    );
    this.server.get(
      '/auth/discord/callback',
      passport.authenticate(
        'discord',
        {
          failureRedirect: '/login',
        },
        async (request, reply, err, user) => {
          const error = (request.query as any).error;
          if (error === 'access_denied') {
            reply.redirect(env.ROOT_URL_PREFIX + `/create/discord?error=1003`);
          }
          if (user) {
            reply.redirect(
              env.ROOT_URL_PREFIX + `/create/discord?access_token=${user}`
            );
          } else {
            reply.redirect(env.ROOT_URL_PREFIX + `/create/discord?error=1004`);
          }
        }
      )
    );

    this.server.get(
      '/auth/twitter/login',
      passport.authenticate('twitter', {scope: ['tweet.read', 'users.read']})
    );
    this.server.get(
      '/auth/twitter/callback',
      passport.authenticate(
        'twitter',
        {
          failureRedirect: '/login',
        },
        async (request, reply, err, user) => {
          const error = (request.query as any).error;
          (request as any).session.destroy();
          if (error === 'access_denied') {
            reply.redirect(env.ROOT_URL_PREFIX + `/create/twitter?error=1003`);
          }
          if (user) {
            reply.redirect(
              env.ROOT_URL_PREFIX + `/create/twitter?access_token=${user}`
            );
          } else {
            reply.redirect(env.ROOT_URL_PREFIX + `/create/twitter?error=1004`);
          }
        }
      )
    );
    return this.server;
  }

  async start(port = 3006, host = '127.0.0.1') {
    this.build();
    await this.server.listen({port, host});

    console.info(LOGO);
    this.server.log.info(`🚀 Server running on port ${port}`);
    this.server.log.info(
      `🚀 Api document on http://${host}:${port}/documentation`
    );
  }

  scheduleJob(
    rule:
      | RecurrenceRule
      | RecurrenceSpecDateRange
      | RecurrenceSpecObjLit
      | Date
      | string
      | number,
    handler: JobHandler
  ) {
    schedule.scheduleJob(rule, fireDate => {
      handler(this.diContainer, fireDate);
    });
    return this;
  }
}
