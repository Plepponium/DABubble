import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const isDevMode =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// 👇 Filter für "outside injection context" Warnungen
if (isDevMode) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('outside injection context')) {
      return; // Warnung überspringen
    }
    originalWarn(...args);
  };
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
