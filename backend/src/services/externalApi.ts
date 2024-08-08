// sln-a upload attestation
// sln-a find attestation by decoded
// common api send email

import axios from 'axios';
import {env} from '../env';

export async function sendMail(
  email: string,
  subject: string,
  templateUrl: string,
  params: any
) {
  return await axios.post(
    `${env.COMMON_API}/mails`,
    {
      email,
      subject,
      templateUrl,
      params,
    },
    {
      headers: {
        'x-stl-key': env.PROJECT_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
}
