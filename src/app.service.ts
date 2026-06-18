import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ApplicationHomeMetadata {
  message: string;
  documentationUrl: string;
  healthCheckUrl: string;
}

export const APPLICATION_HOME_METADATA: ApplicationHomeMetadata = {
  message: 'Cartomania API is ready to accept requests.',
  documentationUrl: '/api',
  healthCheckUrl: '/health',
};

const APPLICATION_HOME_TEMPLATE_LOCATIONS = [
  join(__dirname, 'assets', 'application-home.html'),
  join(__dirname, '..', 'assets', 'application-home.html'),
  join(process.cwd(), 'src', 'assets', 'application-home.html'),
];

let cachedTemplate: string | null = null;

function loadHomeTemplate(): string {
  if (cachedTemplate === null) {
    const resolvedPath = APPLICATION_HOME_TEMPLATE_LOCATIONS.find((candidate) =>
      existsSync(candidate),
    );

    if (!resolvedPath) {
      throw new Error('Cartomania homepage template asset could not be located.');
    }

    cachedTemplate = readFileSync(resolvedPath, 'utf8');
  }

  return cachedTemplate;
}

function applyMetadata(
  template: string,
  metadata: ApplicationHomeMetadata,
): string {
  return (Object.keys(metadata) as Array<keyof ApplicationHomeMetadata>).reduce(
    (accumulatedTemplate, key) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');

      return accumulatedTemplate.replace(pattern, metadata[key]);
    },
    template,
  );
}

@Injectable()
export class AppService {
  getApplicationHomePage(): string {
    return applyMetadata(loadHomeTemplate(), APPLICATION_HOME_METADATA);
  }
}
