import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const isDevMode =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const shouldIgnoreMessage = (message: string): boolean => {
  const ignorePatterns = [
    'outside injection context',
    'Missing or insufficient permissions',
    'FirebaseError.*permission',
    'Calling Firebase APIs outside of an Injection context',
  ];
  return ignorePatterns.some(pattern => new RegExp(pattern).test(message));
};

// 👇 Globale Warning-Filter
if (isDevMode) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldIgnoreMessage(message)) {
      originalWarn(...args);
    }
  };

  // 👇 Globale Error-Filter
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldIgnoreMessage(message)) {
      originalError(...args);
    }
  };
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

window.addEventListener('error', (event) => {
  if (event.message.includes('Missing or insufficient permissions')) {
    event.preventDefault();
  }
});