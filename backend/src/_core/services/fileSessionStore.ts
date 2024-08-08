import {SessionStore} from '@fastify/session';
import fs from 'fs';
import {LOGGER} from '../constant';

export default class FileSessionStore implements SessionStore {
  private readonly FILE_NAME = 'sessions.txt';
  private readonly sessions: any;
  private readonly logger = LOGGER.child({from: 'FileSessionStore'});

  constructor() {
    if (!fs.existsSync(this.FILE_NAME)) {
      this.logger.debug('create session file: %s', this.FILE_NAME);
      fs.writeFileSync(this.FILE_NAME, '{}');
    }
    this.sessions = JSON.parse(fs.readFileSync(this.FILE_NAME, 'utf-8'));
  }

  set(sessionId: string, session: any, callback: any): void {
    this.sessions[sessionId] = session;
    fs.writeFileSync(this.FILE_NAME, JSON.stringify(session));
    this.logger.debug('set sessionId: %s, session: %s', sessionId, session);
    callback();
  }

  get(sessionId: string, callback: any) {
    callback(null, this.sessions[sessionId]);
  }

  destroy(sessionId: string) {
    delete this.sessions[sessionId];
    fs.writeFileSync(this.FILE_NAME, JSON.stringify(this.sessions));
  }
}
